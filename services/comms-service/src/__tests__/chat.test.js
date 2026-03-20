'use strict';

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, _res, next) => {
    req.session = { getUserId: () => 'user-test-id' };
    next();
  },
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
}));

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn(),
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

process.env.MESSAGE_ENCRYPTION_KEY = 'a'.repeat(64);

jest.mock('../config/prisma', () => ({
  chat: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  chatParticipant: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');

process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY = 'test-key';
process.env.API_DOMAIN = 'http://localhost:4000';
process.env.WEBSITE_DOMAIN = 'http://localhost:3000';

const App = require('../app');
const prisma = require('../config/prisma');


const WORKSPACE_ID = 'aaaaaaaa-0000-4000-a000-aaaaaaaaaaaa';
const CHAT_ID      = 'bbbbbbbb-0000-4000-a000-bbbbbbbbbbbb';
const USER_ID      = 'user-test-id';
const OTHER_USER   = 'cccccccc-0000-4000-a000-cccccccccccc';

const makeChat = (overrides = {}) => ({
  id: CHAT_ID,
  workspaceId: WORKSPACE_ID,
  name: 'Test Chat',
  type: 'group',
  createdBy: USER_ID,
  isArchived: false,
  participants: [
    { userId: USER_ID, role: 'admin', isActive: true },
    { userId: OTHER_USER, role: 'member', isActive: true },
  ],
  ...overrides,
});


describe('Chat Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const BASE = '/api/v1/chats';

  describe('POST /api/v1/chats', () => {
    it('creates a chat and responds 201', async () => {
      const chat = makeChat();
      prisma.chat.create.mockResolvedValue(chat);

      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          name: 'Test Chat',
          type: 'group',
          participantIds: [OTHER_USER],
        })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(CHAT_ID);
      expect(prisma.chat.create).toHaveBeenCalledTimes(1);
    });

    it('creates a direct chat without a name', async () => {
      const chat = makeChat({ name: undefined, type: 'direct' });
      prisma.chat.create.mockResolvedValue(chat);

      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          type: 'direct',
          participantIds: [OTHER_USER],
        })
        .expect(201);

      expect(res.body.status).toBe('success');
    });

    it('rejects with 422 when workspaceId is not a UUID', async () => {
      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: 'not-a-uuid',
          type: 'group',
          participantIds: [OTHER_USER],
        })
        .expect(422);

      expect(prisma.chat.create).not.toHaveBeenCalled();
    });

    it('rejects with 422 when participantIds is empty', async () => {
      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          type: 'group',
          participantIds: [],
        })
        .expect(422);

      expect(prisma.chat.create).not.toHaveBeenCalled();
    });

    it('rejects with 422 when type is invalid', async () => {
      await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          type: 'broadcast',
          participantIds: [OTHER_USER],
        })
        .expect(422);
    });
  });

  describe('GET /api/v1/chats', () => {
    it('returns the list of chats for the authenticated user', async () => {
      const chats = [makeChat(), makeChat({ id: 'chat-2' })];
      prisma.chat.findMany.mockResolvedValue(chats);

      const res = await request(App)
        .get(`${BASE}?workspaceId=${WORKSPACE_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2);

      expect(prisma.chat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: WORKSPACE_ID,
            participants: expect.objectContaining({
              some: expect.objectContaining({ userId: USER_ID }),
            }),
          }),
        })
      );
    });

    it('returns an empty array when the user has no chats', async () => {
      prisma.chat.findMany.mockResolvedValue([]);

      const res = await request(App).get(BASE).expect(200);

      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/chats/:id', () => {
    it('returns a chat when the user is a participant', async () => {
      prisma.chat.findUnique.mockResolvedValue(makeChat());

      const res = await request(App)
        .get(`${BASE}/${CHAT_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(CHAT_ID);
    });

    it('responds 404 when the chat does not exist', async () => {
      prisma.chat.findUnique.mockResolvedValue(null);

      const res = await request(App)
        .get(`${BASE}/nonexistent-id`)
        .expect(404);

      expect(res.body.status).toBe('fail');
    });

    it('responds 403 when the user is not an active participant', async () => {
      prisma.chat.findUnique.mockResolvedValue(
        makeChat({
          participants: [
            { userId: OTHER_USER, role: 'admin', isActive: true },
          ],
        })
      );

      const res = await request(App)
        .get(`${BASE}/${CHAT_ID}`)
        .expect(403);

      expect(res.body.status).toBe('fail');
    });

    it('responds 403 when user is in participants list but isActive=false', async () => {
      prisma.chat.findUnique.mockResolvedValue(
        makeChat({
          participants: [
            { userId: USER_ID, role: 'member', isActive: false },
          ],
        })
      );

      const res = await request(App)
        .get(`${BASE}/${CHAT_ID}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/chats/:id/participants', () => {
    const NEW_USER = 'dddddddd-0000-4000-a000-dddddddddddd';

    it('adds a participant when the requester is an admin', async () => {
      prisma.chat.findUnique.mockResolvedValue(makeChat());
      prisma.chatParticipant.upsert.mockResolvedValue({});

      const res = await request(App)
        .post(`${BASE}/${CHAT_ID}/participants`)
        .send({ userId: NEW_USER })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.chatParticipant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId_userId: { chatId: CHAT_ID, userId: NEW_USER } },
        })
      );
    });

    it('responds 403 when requester is a member (not admin)', async () => {
      prisma.chat.findUnique.mockResolvedValue(
        makeChat({
          participants: [
            { userId: USER_ID, role: 'member', isActive: true },
          ],
        })
      );

      const res = await request(App)
        .post(`${BASE}/${CHAT_ID}/participants`)
        .send({ userId: NEW_USER })
        .expect(403);

      expect(prisma.chatParticipant.upsert).not.toHaveBeenCalled();
    });

    it('rejects with 422 when userId is not a UUID', async () => {
      const res = await request(App)
        .post(`${BASE}/${CHAT_ID}/participants`)
        .send({ userId: 'bad-id' })
        .expect(422);

      expect(prisma.chatParticipant.upsert).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/chats/:id/participants/:userId', () => {
    it('removes a participant when the requester is an admin', async () => {
      prisma.chat.findUnique.mockResolvedValue(makeChat());
      prisma.chatParticipant.update.mockResolvedValue({});

      const res = await request(App)
        .delete(`${BASE}/${CHAT_ID}/participants/${OTHER_USER}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.chatParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chatId_userId: { chatId: CHAT_ID, userId: OTHER_USER } },
          data: { isActive: false },
        })
      );
    });

    it('responds 403 when requester is not an admin', async () => {
      prisma.chat.findUnique.mockResolvedValue(
        makeChat({
          participants: [
            { userId: USER_ID, role: 'member', isActive: true },
            { userId: OTHER_USER, role: 'member', isActive: true },
          ],
        })
      );

      const res = await request(App)
        .delete(`${BASE}/${CHAT_ID}/participants/${OTHER_USER}`)
        .expect(403);

      expect(prisma.chatParticipant.update).not.toHaveBeenCalled();
    });

    it('responds 404 when the target participant is not in the chat', async () => {
      prisma.chat.findUnique.mockResolvedValue(
        makeChat({
          participants: [
            { userId: USER_ID, role: 'admin', isActive: true },
          ],
        })
      );

      const res = await request(App)
        .delete(`${BASE}/${CHAT_ID}/participants/${OTHER_USER}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/chats/:id/archive', () => {
    it('archives the chat when the requester is an admin', async () => {
      prisma.chat.findUnique.mockResolvedValue(makeChat());
      prisma.chat.update.mockResolvedValue({ ...makeChat(), isArchived: true });

      const res = await request(App)
        .patch(`${BASE}/${CHAT_ID}/archive`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.chat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CHAT_ID },
          data: { isArchived: true },
        })
      );
    });

    it('responds 403 when requester is a member (not admin)', async () => {
      prisma.chat.findUnique.mockResolvedValue(
        makeChat({
          participants: [
            { userId: USER_ID, role: 'member', isActive: true },
          ],
        })
      );

      const res = await request(App)
        .patch(`${BASE}/${CHAT_ID}/archive`)
        .expect(403);

      expect(prisma.chat.update).not.toHaveBeenCalled();
    });

    it('responds 404 when chat does not exist', async () => {
      prisma.chat.findUnique.mockResolvedValue(null);

      await request(App)
        .patch(`${BASE}/nonexistent/archive`)
        .expect(404);
    });
  });
});
