'use strict';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// Set required env vars BEFORE app.js is loaded (EnsureEnv runs at module scope)
process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY = 'test-key';
process.env.API_DOMAIN = 'http://localhost:4000';
process.env.WEBSITE_DOMAIN = 'http://localhost:3000';

// MinIO env vars (required by config/minio.js at module scope)
process.env.MINIO_ENDPOINT  = 'localhost';
process.env.MINIO_PORT      = '9000';
process.env.MINIO_USE_SSL   = 'false';
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_BUCKET    = 'test-bucket';

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, _res, next) => {
    req.session = { getUserId: () => 'user-test-id' };
    next();
  },
  RequireRole: () => (_req, _res, next) => next(),
  OptionalAuth: (_req, _res, next) => next(),
}));

jest.mock('@pms/error-handler', () => {
  const APIError = class extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      this.status = statusCode < 500 ? 'fail' : 'error';
    }
  };
  const CatchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);
  const NotFoundHandler = (_req, res) =>
    res.status(404).json({ status: 'fail', message: 'Route not found' });
  const ErrorHandler = (err, _req, res, _next) =>
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message || 'Internal server error',
    });
  return { APIError, CatchAsync, NotFoundHandler, ErrorHandler };
});

jest.mock('supertokens-node', () => ({
  init: jest.fn(),
  getAllCORSHeaders: jest.fn(() => []),
}));

jest.mock('supertokens-node/framework/express', () => ({
  middleware: () => (_req, _res, next) => next(),
  errorHandler: () => (err, _req, _res, next) => next(err),
}));

jest.mock('supertokens-node/recipe/session', () => ({ init: jest.fn() }));
jest.mock('supertokens-node/recipe/emailpassword', () => ({ init: jest.fn() }));

// Mock the minio config module — avoids the real MinIO client being instantiated
jest.mock('../config/minio', () => ({
  client: {
    putObject: jest.fn(),
    presignedGetObject: jest.fn(),
    removeObject: jest.fn(),
    bucketExists: jest.fn().mockResolvedValue(true),
  },
  BUCKET: 'test-bucket',
  EnsureBucket: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/prisma', () => ({
  file: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock @pms/constants to return realistic values for multer
jest.mock('@pms/constants', () => ({
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  MAX_FILES_PER_UPLOAD: 3,
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
  ],
}));

// Mock file-type (used in ValidateFileContent middleware)
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: 'image/jpeg' }),
}));

// ---------------------------------------------------------------------------

const request = require('supertest');
const { fileTypeFromBuffer } = require('file-type');
const { client: minioClient } = require('../config/minio');
const prisma = require('../config/prisma');
const App = require('../app');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE = '/api/v1/files';
const USER_ID     = 'user-test-id';
const WORKSPACE_ID = 'aaaaaaaa-0000-4000-a000-aaaaaaaaaaaa';
const ENTITY_ID    = 'bbbbbbbb-0000-4000-a000-bbbbbbbbbbbb';
const FILE_ID      = 'cccccccc-0000-4000-a000-cccccccccccc';

const makeFileRecord = (overrides = {}) => ({
  id: FILE_ID,
  uploadedBy: USER_ID,
  workspaceId: WORKSPACE_ID,
  entityType: 'task',
  entityId: ENTITY_ID,
  filename: 'test.jpg',
  storagePath: `${WORKSPACE_ID}/${ENTITY_ID}/some-uuid.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: BigInt(1024),
  isDeleted: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Serialised version (BigInt → string) as returned by the service layer
const makeFileResponse = (overrides = {}) => ({
  ...makeFileRecord(overrides),
  sizeBytes: '1024',
  url: 'https://minio.example.com/presigned-url',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('File Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: file type detection returns an allowed MIME type
    fileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg' });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/files — Upload file
  // -------------------------------------------------------------------------

  describe('POST /api/v1/files (upload)', () => {
    it('uploads a file, stores metadata, and returns 201 with a presigned URL', async () => {
      minioClient.putObject.mockResolvedValue(undefined);
      minioClient.presignedGetObject.mockResolvedValue(
        'https://minio.example.com/presigned-url'
      );
      prisma.file.create.mockResolvedValue(makeFileRecord());

      const res = await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityType', 'task')
        .field('entityId', ENTITY_ID)
        .attach('file', Buffer.from('fake-image-content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.filename).toBe('test.jpg');
      expect(res.body.data.url).toBeDefined();

      expect(minioClient.putObject).toHaveBeenCalledTimes(1);
      expect(prisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            uploadedBy: USER_ID,
            entityType: 'task',
            entityId: ENTITY_ID,
          }),
        })
      );
    });

    it('responds 400 when no file is attached', async () => {
      const res = await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityType', 'task')
        .field('entityId', ENTITY_ID)
        .expect(400);

      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it('responds 400 when workspaceId is missing', async () => {
      const res = await request(App)
        .post(BASE)
        .field('entityType', 'task')
        .field('entityId', ENTITY_ID)
        .attach('file', Buffer.from('img'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(res.body.message).toMatch(/workspaceId/i);
    });

    it('responds 400 when entityType is missing', async () => {
      const res = await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityId', ENTITY_ID)
        .attach('file', Buffer.from('img'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(res.body.message).toMatch(/entityType/i);
    });

    it('responds 400 when entityId is missing', async () => {
      const res = await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityType', 'task')
        .attach('file', Buffer.from('img'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(res.body.message).toMatch(/entityId/i);
    });

    it('rejects disallowed MIME type (file filter rejects at multer level)', async () => {
      // Multer fileFilter calls cb(new Error('File type not allowed'), false)
      // for disallowed MIME types. The ErrorHandler.MulterError middleware
      // handles this as a 400.
      const res = await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityType', 'task')
        .field('entityId', ENTITY_ID)
        .attach('file', Buffer.from('exe-content'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);

      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it('rejects a file whose detected MIME differs from declared MIME', async () => {
      // Simulate detection returning a disallowed type despite allowed declared MIME
      fileTypeFromBuffer.mockResolvedValue({ mime: 'application/x-msdownload' });

      const res = await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityType', 'task')
        .field('entityId', ENTITY_ID)
        .attach('file', Buffer.from('fake'), {
          filename: 'evil.pdf',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(res.body.message).toMatch(/content type/i);
    });

    it('rolls back the MinIO object when prisma.file.create fails', async () => {
      minioClient.putObject.mockResolvedValue(undefined);
      minioClient.presignedGetObject.mockResolvedValue('https://url');
      minioClient.removeObject.mockResolvedValue(undefined);

      const dbError = new Error('DB error');
      prisma.file.create.mockRejectedValue(dbError);

      // The service catches the error, calls StorageService.Delete, then re-throws
      await request(App)
        .post(BASE)
        .field('workspaceId', WORKSPACE_ID)
        .field('entityType', 'task')
        .field('entityId', ENTITY_ID)
        .attach('file', Buffer.from('img'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(500);

      expect(minioClient.removeObject).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/files — List files for entity
  // -------------------------------------------------------------------------

  describe('GET /api/v1/files', () => {
    it('returns files for a given entityType and entityId', async () => {
      const files = [makeFileRecord(), makeFileRecord({ id: 'file-2' })];
      prisma.file.findMany.mockResolvedValue(files);

      const res = await request(App)
        .get(`${BASE}?entityType=task&entityId=${ENTITY_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2);

      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'task',
            entityId: ENTITY_ID,
            uploadedBy: USER_ID,
            isDeleted: false,
          }),
        })
      );
    });

    it('responds 400 when entityType is missing', async () => {
      const res = await request(App)
        .get(`${BASE}?entityId=${ENTITY_ID}`)
        .expect(400);

      expect(res.body.message).toMatch(/entityType/i);
    });

    it('responds 400 when entityId is missing', async () => {
      const res = await request(App)
        .get(`${BASE}?entityType=task`)
        .expect(400);

      expect(res.body.message).toMatch(/entityId/i);
    });

    it('applies limit and offset pagination params', async () => {
      prisma.file.findMany.mockResolvedValue([]);

      await request(App)
        .get(`${BASE}?entityType=task&entityId=${ENTITY_ID}&limit=5&offset=10`)
        .expect(200);

      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        })
      );
    });

    it('defaults limit to 20 and offset to 0 when params are absent', async () => {
      prisma.file.findMany.mockResolvedValue([]);

      await request(App)
        .get(`${BASE}?entityType=task&entityId=${ENTITY_ID}`)
        .expect(200);

      expect(prisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });

    it('returns an empty array when no files exist for the entity', async () => {
      prisma.file.findMany.mockResolvedValue([]);

      const res = await request(App)
        .get(`${BASE}?entityType=task&entityId=${ENTITY_ID}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/files/:id/url — Get presigned URL
  // -------------------------------------------------------------------------

  describe('GET /api/v1/files/:id/url', () => {
    it('returns a presigned download URL for the file owner', async () => {
      prisma.file.findFirst.mockResolvedValue(makeFileRecord());
      minioClient.presignedGetObject.mockResolvedValue(
        'https://minio.example.com/presigned'
      );

      const res = await request(App)
        .get(`${BASE}/${FILE_ID}/url`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.url).toBe('https://minio.example.com/presigned');
    });

    it('responds 404 when the file does not exist or is deleted', async () => {
      prisma.file.findFirst.mockResolvedValue(null);

      const res = await request(App)
        .get(`${BASE}/${FILE_ID}/url`)
        .expect(404);

      expect(res.body.status).toBe('fail');
    });

    it('responds 403 when the file was uploaded by a different user', async () => {
      prisma.file.findFirst.mockResolvedValue(
        makeFileRecord({ uploadedBy: 'someone-else' })
      );

      const res = await request(App)
        .get(`${BASE}/${FILE_ID}/url`)
        .expect(403);

      expect(minioClient.presignedGetObject).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/v1/files/:id — Soft-delete file
  // -------------------------------------------------------------------------

  describe('DELETE /api/v1/files/:id', () => {
    it('soft-deletes a file and removes it from MinIO', async () => {
      prisma.file.findFirst.mockResolvedValue(makeFileRecord());
      prisma.file.update.mockResolvedValue({});
      minioClient.removeObject.mockResolvedValue(undefined);

      const res = await request(App)
        .delete(`${BASE}/${FILE_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } })
      );
      expect(minioClient.removeObject).toHaveBeenCalledTimes(1);
    });

    it('responds 404 when the file does not exist', async () => {
      prisma.file.findFirst.mockResolvedValue(null);

      await request(App).delete(`${BASE}/${FILE_ID}`).expect(404);
    });

    it('responds 403 when the user did not upload the file', async () => {
      prisma.file.findFirst.mockResolvedValue(
        makeFileRecord({ uploadedBy: 'another-user' })
      );

      const res = await request(App)
        .delete(`${BASE}/${FILE_ID}`)
        .expect(403);

      expect(prisma.file.update).not.toHaveBeenCalled();
    });

    it('rolls back the soft-delete when MinIO removal fails', async () => {
      prisma.file.findFirst.mockResolvedValue(makeFileRecord());
      // First update = soft-delete succeeds
      prisma.file.update.mockResolvedValueOnce({});
      // MinIO removal fails
      minioClient.removeObject.mockRejectedValue(new Error('MinIO timeout'));
      // Rollback update (isDeleted: false) succeeds
      prisma.file.update.mockResolvedValueOnce({});

      // Service re-throws the MinIO error after rollback attempt
      const res = await request(App)
        .delete(`${BASE}/${FILE_ID}`)
        .expect(500);

      // Rollback was attempted
      expect(prisma.file.update).toHaveBeenCalledTimes(2);
      expect(prisma.file.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { isDeleted: false } })
      );
    });
  });
});
