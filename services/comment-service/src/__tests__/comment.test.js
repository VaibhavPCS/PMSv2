'use strict';

// ---------------------------------------------------------------------------
// Env required before any module loads
// ---------------------------------------------------------------------------
process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY = 'test-key';
process.env.API_DOMAIN = 'http://localhost:4010';
process.env.WEBSITE_DOMAIN = 'http://localhost:3000';
process.env.COMMENT_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.NODE_ENV = 'test';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------
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

jest.mock('@pms/validators', () => ({
  ValidateRequest: (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({ status: 'fail', message: 'Validation error' });
    }
    req.body = result.data;
    next();
  },
  ValidateQuery: (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(422).json({ status: 'fail', message: 'Validation error' });
    }
    req.query = result.data;
    next();
  },
}));

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({ send: jest.fn() }),
  PublishEvent: jest.fn(),
}));

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

// Avoid requiring swagger deps in the test runtime
jest.mock('swagger-ui-express', () => ({ serve: (_req, _res, next) => next(), setup: () => (_req, _res, next) => next() }));
jest.mock('../config/swagger', () => ({}), { virtual: true });

jest.mock('../config/prisma', () => ({
  comment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  commentReaction: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  workspaceMemberCache: {
    findUnique: jest.fn(),
  },
  entityExistsCache: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}));

jest.mock('../services/encryption.service', () => ({
  Encrypt: jest.fn((plaintext) => ({
    content: Buffer.from(plaintext).toString('base64'),
    iv: 'aXYtYmFzZTY0',
    authTag: 'dGFnLWJhc2U2NA==',
  })),
  Decrypt: jest.fn(({ content }) => Buffer.from(content, 'base64').toString('utf8')),
}));

// ---------------------------------------------------------------------------

const request = require('supertest');
const prisma = require('../config/prisma');
const App = require('../app');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const BASE = '/api/v1/comments';
const USER_ID      = 'user-test-id';
const WORKSPACE_ID = 'aaaaaaaa-0000-4000-a000-aaaaaaaaaaaa';
const ENTITY_ID    = 'bbbbbbbb-0000-4000-a000-bbbbbbbbbbbb';
const COMMENT_ID   = 'cccccccc-0000-4000-a000-cccccccccccc';

const makeComment = (overrides = {}) => ({
  id: COMMENT_ID,
  workspaceId: WORKSPACE_ID,
  entityType: 'task',
  entityId: ENTITY_ID,
  authorId: USER_ID,
  content: Buffer.from('hello world').toString('base64'),
  iv: 'aXYtYmFzZTY0',
  authTag: 'dGFnLWJhc2U2NA==',
  parentId: null,
  mentions: [],
  attachments: [],
  isEdited: false,
  isDeleted: false,
  reactions: [],
  replies: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Comment Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: caller is a workspace member (create-authz passes).
    prisma.workspaceMemberCache.findUnique.mockResolvedValue({ workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'member' });
    // Default: existence cache is cold (no row) — CreateComment is allowed.
    prisma.entityExistsCache.findUnique.mockResolvedValue(null);
  });

  describe('POST /api/v1/comments', () => {
    it('creates a comment and returns 201 with decrypted content', async () => {
      prisma.comment.create.mockResolvedValue(makeComment());

      const res = await request(App)
        .post(BASE)
        .send({ workspaceId: WORKSPACE_ID, entityType: 'task', entityId: ENTITY_ID, content: 'hello world' })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.content).toBe('hello world');
      expect(prisma.comment.create).toHaveBeenCalledTimes(1);
    });

    it('rejects with 403 when the author is not a workspace member', async () => {
      prisma.workspaceMemberCache.findUnique.mockResolvedValue(null);

      await request(App)
        .post(BASE)
        .send({ workspaceId: WORKSPACE_ID, entityType: 'task', entityId: ENTITY_ID, content: 'hello world' })
        .expect(403);

      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('rejects with 404 when the target entity was deleted', async () => {
      prisma.entityExistsCache.findUnique.mockResolvedValue({
        entityType: 'task', entityId: ENTITY_ID, exists: false,
      });

      await request(App)
        .post(BASE)
        .send({ workspaceId: WORKSPACE_ID, entityType: 'task', entityId: ENTITY_ID, content: 'hello world' })
        .expect(404);

      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('rejects a reply to a non-existent parent with 400', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID, entityType: 'task', entityId: ENTITY_ID,
          content: 'reply', parentId: 'dddddddd-0000-4000-a000-dddddddddddd',
        })
        .expect(400);

      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('returns 422 when content is missing', async () => {
      await request(App)
        .post(BASE)
        .send({ workspaceId: WORKSPACE_ID, entityType: 'task', entityId: ENTITY_ID })
        .expect(422);
    });
  });

  describe('GET /api/v1/comments', () => {
    it('lists top-level comments for an entity', async () => {
      prisma.comment.findMany.mockResolvedValue([makeComment(), makeComment({ id: 'c2' })]);

      const res = await request(App)
        .get(`${BASE}?entityType=task&entityId=${ENTITY_ID}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].content).toBe('hello world');
    });
  });

  describe('GET /api/v1/comments/count', () => {
    it('returns the comment count', async () => {
      prisma.comment.count.mockResolvedValue(7);

      const res = await request(App)
        .get(`${BASE}/count?entityType=task&entityId=${ENTITY_ID}`)
        .expect(200);

      expect(res.body.data.count).toBe(7);
    });
  });

  describe('PATCH /api/v1/comments/:id', () => {
    it('edits a comment for its author', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment());
      prisma.comment.update.mockResolvedValue(makeComment({ isEdited: true, content: Buffer.from('edited').toString('base64') }));

      const res = await request(App)
        .patch(`${BASE}/${COMMENT_ID}`)
        .send({ content: 'edited' })
        .expect(200);

      expect(res.body.data.isEdited).toBe(true);
    });

    it('returns 403 when a non-author tries to edit', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment({ authorId: 'someone-else' }));

      await request(App)
        .patch(`${BASE}/${COMMENT_ID}`)
        .send({ content: 'edited' })
        .expect(403);

      expect(prisma.comment.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('soft-deletes a comment for its author', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment());
      prisma.comment.update.mockResolvedValue({});

      const res = await request(App)
        .delete(`${BASE}/${COMMENT_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } })
      );
    });

    it('returns 404 when the comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);
      await request(App).delete(`${BASE}/${COMMENT_ID}`).expect(404);
    });

    it('returns 403 when a non-author tries to delete', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment({ authorId: 'another-user' }));
      await request(App).delete(`${BASE}/${COMMENT_ID}`).expect(403);
      expect(prisma.comment.update).not.toHaveBeenCalled();
    });
  });

  describe('reactions', () => {
    it('adds a reaction (200)', async () => {
      prisma.comment.findFirst.mockResolvedValue(makeComment());
      prisma.commentReaction.create.mockResolvedValue({});

      await request(App)
        .post(`${BASE}/${COMMENT_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(200);

      expect(prisma.commentReaction.create).toHaveBeenCalledTimes(1);
    });

    it('removes a reaction (200)', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment());
      prisma.commentReaction.deleteMany.mockResolvedValue({ count: 1 });

      await request(App)
        .delete(`${BASE}/${COMMENT_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(200);

      expect(prisma.commentReaction.deleteMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/comments/:id/replies', () => {
    it('lists replies to a comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment());
      prisma.comment.findMany.mockResolvedValue([makeComment({ id: 'r1', parentId: COMMENT_ID })]);

      const res = await request(App)
        .get(`${BASE}/${COMMENT_ID}/replies`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });
});
