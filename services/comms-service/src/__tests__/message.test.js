'use strict';

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
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  messageReaction: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  messageRead: {
    upsert: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

// Stub encryption so we don't depend on actual crypto internals
jest.mock('../services/encryption.service', () => ({
  Encrypt: jest.fn((plaintext) => ({
    content: Buffer.from(plaintext).toString('base64'),
    iv: 'aaaaaaaaaaaaaaaaaa==',
    authTag: 'bbbbbbbbbbbbbbbbbbb==',
  })),
  Decrypt: jest.fn(({ content }) => Buffer.from(content, 'base64').toString('utf8')),
}));

// ---------------------------------------------------------------------------

const request = require('supertest');

process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY = 'test-key';
process.env.API_DOMAIN = 'http://localhost:4000';
process.env.WEBSITE_DOMAIN = 'http://localhost:3000';

const App = require('../app');
const prisma = require('../config/prisma');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHAT_ID = 'aaaaaaaa-0000-4000-a000-aaaaaaaaaaaa';
const MSG_ID  = 'bbbbbbbb-0000-4000-a000-bbbbbbbbbbbb';
const USER_ID = 'user-test-id';
const OTHER   = 'cccccccc-0000-4000-a000-cccccccccccc';
const MSG_BASE = '/api/v1/messages';

const makeParticipant = (userId = USER_ID, role = 'member') => ({
  userId, role, isActive: true,
});

const makeMessage = (overrides = {}) => ({
  id: MSG_ID,
  chatId: CHAT_ID,
  senderId: USER_ID,
  content: Buffer.from('hello').toString('base64'),
  iv: 'aaaaaaaaaaaaaaaaaa==',
  authTag: 'bbbbbbbbbbbbbbbbbbb==',
  isDeleted: false,
  isEdited: false,
  parentMessageId: null,
  reactions: [],
  reads: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Message Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/messages/chats/:chatId — Send message
  // -------------------------------------------------------------------------

  describe('POST /api/v1/messages/chats/:chatId', () => {
    it('sends a message and returns 201', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.message.findFirst.mockResolvedValue(null);
      prisma.message.create.mockResolvedValue(makeMessage());

      const res = await request(App)
        .post(`${MSG_BASE}/chats/${CHAT_ID}`)
        .send({ content: 'hello' })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.content).toBe('hello');
      expect(prisma.message.create).toHaveBeenCalledTimes(1);
    });

    it('responds 403 when the user is not a participant of the chat', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      const res = await request(App)
        .post(`${MSG_BASE}/chats/${CHAT_ID}`)
        .send({ content: 'hello' })
        .expect(403);

      expect(res.body.status).toBe('fail');
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('sends a reply message when parentMessageId is provided', async () => {
      const PARENT_ID = 'eeeeeeee-0000-4000-a000-eeeeeeeeeeee';
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.message.findFirst.mockResolvedValue(makeMessage({ id: PARENT_ID }));
      prisma.message.create.mockResolvedValue(
        makeMessage({ parentMessageId: PARENT_ID })
      );

      const res = await request(App)
        .post(`${MSG_BASE}/chats/${CHAT_ID}`)
        .send({ content: 'Replying', parentMessageId: PARENT_ID })
        .expect(201);

      expect(res.body.data.parentMessageId).toBe(PARENT_ID);
    });

    it('responds 400 when parentMessageId does not belong to the chat', async () => {
      const INVALID_PARENT = 'ffffffff-0000-4000-a000-ffffffffffff';
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      // The service checks message.findFirst with chatId filter — returns null
      prisma.message.findFirst.mockResolvedValue(null);

      const res = await request(App)
        .post(`${MSG_BASE}/chats/${CHAT_ID}`)
        .send({ content: 'Reply', parentMessageId: INVALID_PARENT })
        .expect(400);

      expect(res.body.status).toBe('fail');
    });

    it('rejects with 422 when content is empty', async () => {
      const res = await request(App)
        .post(`${MSG_BASE}/chats/${CHAT_ID}`)
        .send({ content: '' })
        .expect(422);

      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/messages/chats/:chatId — Get messages (paginated)
  // -------------------------------------------------------------------------

  describe('GET /api/v1/messages/chats/:chatId', () => {
    it('returns messages for a participant', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.message.findMany.mockResolvedValue([makeMessage()]);

      const res = await request(App)
        .get(`${MSG_BASE}/chats/${CHAT_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].content).toBe('hello');
    });

    it('applies page and limit params', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.message.findMany.mockResolvedValue([]);

      await request(App)
        .get(`${MSG_BASE}/chats/${CHAT_ID}?page=2&limit=10`)
        .expect(200);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (2-1) * 10
          take: 10,
        })
      );
    });

    it('responds 403 when the user is not a participant', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      const res = await request(App)
        .get(`${MSG_BASE}/chats/${CHAT_ID}`)
        .expect(403);

      expect(res.body.status).toBe('fail');
    });

    it('returns placeholder text for deleted messages', async () => {
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.message.findMany.mockResolvedValue([
        makeMessage({ isDeleted: true }),
      ]);

      const res = await request(App)
        .get(`${MSG_BASE}/chats/${CHAT_ID}`)
        .expect(200);

      expect(res.body.data[0].content).toBe('This message was deleted');
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/v1/messages/:id — Edit message
  // -------------------------------------------------------------------------

  describe('PATCH /api/v1/messages/:id', () => {
    it('edits a message and returns the updated content', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.message.update.mockResolvedValue(makeMessage({
        isEdited: true,
        content: Buffer.from('updated content').toString('base64'),
      }));

      const res = await request(App)
        .patch(`${MSG_BASE}/${MSG_ID}`)
        .send({ content: 'updated content' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.content).toBe('updated content');
    });

    it('responds 403 when the user is not the sender', async () => {
      prisma.message.findUnique.mockResolvedValue(
        makeMessage({ senderId: OTHER })
      );

      const res = await request(App)
        .patch(`${MSG_BASE}/${MSG_ID}`)
        .send({ content: 'edited' })
        .expect(403);

      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('responds 404 when the message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      const res = await request(App)
        .patch(`${MSG_BASE}/${MSG_ID}`)
        .send({ content: 'edited' })
        .expect(404);
    });

    it('responds 410 when the message is already deleted', async () => {
      prisma.message.findUnique.mockResolvedValue(
        makeMessage({ isDeleted: true })
      );

      const res = await request(App)
        .patch(`${MSG_BASE}/${MSG_ID}`)
        .send({ content: 'edited' })
        .expect(410);
    });

    it('rejects with 422 when content is empty', async () => {
      await request(App)
        .patch(`${MSG_BASE}/${MSG_ID}`)
        .send({ content: '' })
        .expect(422);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/v1/messages/:id — Delete message
  // -------------------------------------------------------------------------

  describe('DELETE /api/v1/messages/:id', () => {
    const makeFullMessage = (overrides = {}) => ({
      ...makeMessage(),
      chat: {
        participants: [makeParticipant(USER_ID, 'admin')],
      },
      ...overrides,
    });

    it('soft-deletes a message by the sender', async () => {
      prisma.message.findUnique.mockResolvedValue(makeFullMessage());
      prisma.message.update.mockResolvedValue({});

      const res = await request(App)
        .delete(`${MSG_BASE}/${MSG_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } })
      );
    });

    it('allows a chat admin to delete another user\'s message', async () => {
      prisma.message.findUnique.mockResolvedValue(
        makeFullMessage({
          senderId: OTHER,
          chat: {
            participants: [
              makeParticipant(USER_ID, 'admin'),
              makeParticipant(OTHER, 'member'),
            ],
          },
        })
      );
      prisma.message.update.mockResolvedValue({});

      const res = await request(App)
        .delete(`${MSG_BASE}/${MSG_ID}`)
        .expect(200);

      expect(prisma.message.update).toHaveBeenCalledTimes(1);
    });

    it('responds 403 when the user is neither sender nor admin', async () => {
      prisma.message.findUnique.mockResolvedValue(
        makeFullMessage({
          senderId: OTHER,
          chat: {
            participants: [
              makeParticipant(USER_ID, 'member'),
              makeParticipant(OTHER, 'member'),
            ],
          },
        })
      );

      const res = await request(App)
        .delete(`${MSG_BASE}/${MSG_ID}`)
        .expect(403);

      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('responds 404 when the message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      await request(App).delete(`${MSG_BASE}/${MSG_ID}`).expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/messages/:id/reactions — Add reaction
  // -------------------------------------------------------------------------

  describe('POST /api/v1/messages/:id/reactions', () => {
    it('adds a reaction to a message', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.messageReaction.create.mockResolvedValue({});

      const res = await request(App)
        .post(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.messageReaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messageId: MSG_ID,
            userId: USER_ID,
            emoji: '👍',
          }),
        })
      );
    });

    it('swallows duplicate reaction (P2002) without throwing', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());

      const p2002 = new Error('Unique constraint');
      p2002.code = 'P2002';
      prisma.messageReaction.create.mockRejectedValue(p2002);

      const res = await request(App)
        .post(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(200);

      expect(res.body.status).toBe('success');
    });

    it('responds 410 when reacting to a deleted message', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage({ isDeleted: true }));
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());

      const res = await request(App)
        .post(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(410);
    });

    it('responds 403 when user is not a participant', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      const res = await request(App)
        .post(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(403);
    });

    it('rejects with 422 when emoji is empty', async () => {
      await request(App)
        .post(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '' })
        .expect(422);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/v1/messages/:id/reactions — Remove reaction
  // -------------------------------------------------------------------------

  describe('DELETE /api/v1/messages/:id/reactions', () => {
    it('removes a reaction from a message', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.messageReaction.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(App)
        .delete(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.messageReaction.deleteMany).toHaveBeenCalledWith({
        where: { messageId: MSG_ID, userId: USER_ID, emoji: '👍' },
      });
    });

    it('responds 404 when the message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      await request(App)
        .delete(`${MSG_BASE}/${MSG_ID}/reactions`)
        .send({ emoji: '👍' })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/messages/:id/read — Mark as read
  // -------------------------------------------------------------------------

  describe('POST /api/v1/messages/:id/read', () => {
    it('marks a message as read for the user', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.chatParticipant.findFirst.mockResolvedValue(makeParticipant());
      prisma.messageRead.upsert.mockResolvedValue({});

      const res = await request(App)
        .post(`${MSG_BASE}/${MSG_ID}/read`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.messageRead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { messageId_userId: { messageId: MSG_ID, userId: USER_ID } },
        })
      );
    });

    it('responds 403 when the user is not a participant', async () => {
      prisma.message.findUnique.mockResolvedValue(makeMessage());
      prisma.chatParticipant.findFirst.mockResolvedValue(null);

      await request(App).post(`${MSG_BASE}/${MSG_ID}/read`).expect(403);
    });

    it('responds 404 when the message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      await request(App).post(`${MSG_BASE}/${MSG_ID}/read`).expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/messages/unread-count — Unread count
  // -------------------------------------------------------------------------

  describe('GET /api/v1/messages/unread-count', () => {
    it('returns the unread message count for the user', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 5 }]);

      const res = await request(App)
        .get(`${MSG_BASE}/unread-count`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.count).toBe(5);
    });

    it('returns 0 when there are no unread messages', async () => {
      prisma.$queryRaw.mockResolvedValue([{ count: 0 }]);

      const res = await request(App)
        .get(`${MSG_BASE}/unread-count`)
        .expect(200);

      expect(res.body.data.count).toBe(0);
    });
  });
});
