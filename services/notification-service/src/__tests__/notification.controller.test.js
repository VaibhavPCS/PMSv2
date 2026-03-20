'use strict';

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before any require() calls
// ---------------------------------------------------------------------------

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

jest.mock('../config/prisma', () => ({
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}));

// Swagger / config stubs
jest.mock('../config/swagger', () => ({}), { virtual: true });

// ---------------------------------------------------------------------------

const request = require('supertest');

// Set required env vars BEFORE loading app.js (which calls EnsureEnv at module
// scope and InitAuth at module scope)
process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY = 'test-key';
process.env.API_DOMAIN = 'http://localhost:4000';
process.env.WEBSITE_DOMAIN = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

const App = require('../app');
const prisma = require('../config/prisma');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = '/api/v1/notifications';

const makeNotification = (overrides = {}) => ({
  id: 'notif-1',
  userId: 'user-test-id',
  type: 'TASK_ASSIGNED',
  title: 'Task assigned',
  body: 'A task was assigned to you.',
  entityType: 'task',
  entityId: 'task-1',
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notification Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/notifications
  // -------------------------------------------------------------------------

  describe('GET /api/v1/notifications', () => {
    it('returns paginated notifications for the authenticated user', async () => {
      const notifications = [makeNotification(), makeNotification({ id: 'notif-2' })];

      prisma.$transaction.mockResolvedValue([notifications, 2]);

      const res = await request(App).get(BASE).expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.notifications).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);

      // Verify prisma was called with the correct userId scope
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // findMany is called with where: { userId: 'user-test-id' }
      // We can verify the transaction arg list contains a call made by the controller
      // (prisma.$transaction receives the array of prisma calls, not raw args)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-test-id' },
        })
      );
    });

    it('applies page and limit query params correctly', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(App)
        .get(`${BASE}?page=2&limit=5`)
        .expect(200);

      expect(res.body.data.page).toBe(2);
      expect(res.body.data.limit).toBe(5);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page-1) * limit = 1 * 5
          take: 5,
        })
      );
    });

    it('clamps limit to 1 when limit=0 is provided', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(App)
        .get(`${BASE}?limit=0`)
        .expect(200);

      expect(res.body.data.limit).toBe(1);
    });

    it('clamps limit to 50 when limit=999 is provided', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(App)
        .get(`${BASE}?limit=999`)
        .expect(200);

      expect(res.body.data.limit).toBe(50);
    });

    it('defaults page to 1 when page is not supplied', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(App).get(BASE).expect(200);

      expect(res.body.data.page).toBe(1);
    });

    it('does not return notifications belonging to a different user', async () => {
      const notifications = [makeNotification({ userId: 'user-test-id' })];
      prisma.$transaction.mockResolvedValue([notifications, 1]);

      const res = await request(App).get(BASE).expect(200);

      // The where clause must scope to the session user, not any other
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-test-id' } })
      );

      // Ensure the returned data is NOT scoped to a different user's id
      res.body.data.notifications.forEach((n) => {
        expect(n.userId).toBe('user-test-id');
      });
    });

    it('returns an empty array when the user has no notifications', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const res = await request(App).get(BASE).expect(200);

      expect(res.body.data.notifications).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/notifications/unread-count
  // -------------------------------------------------------------------------

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns the unread count for the authenticated user', async () => {
      prisma.notification.count.mockResolvedValue(7);

      const res = await request(App)
        .get(`${BASE}/unread-count`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.count).toBe(7);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-test-id', isRead: false },
      });
    });

    it('returns 0 when the user has no unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const res = await request(App)
        .get(`${BASE}/unread-count`)
        .expect(200);

      expect(res.body.data.count).toBe(0);
    });

    it('scopes the count query to the authenticated user only', async () => {
      prisma.notification.count.mockResolvedValue(3);

      await request(App).get(`${BASE}/unread-count`).expect(200);

      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-test-id' }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/v1/notifications/:id/read
  // -------------------------------------------------------------------------

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks a notification as read for the authenticated user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(App)
        .patch(`${BASE}/notif-1/read`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeNull();

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-test-id' },
        data: { isRead: true },
      });
    });

    it('cannot mark another user\'s notification as read (where clause scopes by userId)', async () => {
      // updateMany with non-matching userId returns count=0, which is silently
      // accepted (no error thrown) — the controller trusts the DB scope.
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(App)
        .patch(`${BASE}/other-user-notif/read`)
        .expect(200);

      // Verify the controller always passes the session userId in the where clause
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-test-id' }),
        })
      );
      expect(res.body.status).toBe('success');
    });

    it('still responds 200 when the notification id does not exist', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(App)
        .patch(`${BASE}/non-existent-id/read`)
        .expect(200);

      expect(res.body.status).toBe('success');
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/v1/notifications/read-all
  // -------------------------------------------------------------------------

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks all unread notifications as read for the authenticated user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await request(App)
        .patch(`${BASE}/read-all`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeNull();

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-test-id', isRead: false },
        data: { isRead: true },
      });
    });

    it('scopes the update to the authenticated user only', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await request(App).patch(`${BASE}/read-all`).expect(200);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-test-id' }),
        })
      );
    });

    it('responds 200 even when there are no unread notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(App)
        .patch(`${BASE}/read-all`)
        .expect(200);

      expect(res.body.status).toBe('success');
    });
  });
});
