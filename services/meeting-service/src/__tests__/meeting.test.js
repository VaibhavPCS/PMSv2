'use strict';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY = 'test-key';
process.env.API_DOMAIN = 'http://localhost:4000';
process.env.WEBSITE_DOMAIN = 'http://localhost:3000';
process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@pms.local';
process.env.SMTP_PASS = 'secret';

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

jest.mock('@pms/validators', () => {
  const { z } = require('zod');

  const ValidateRequest = (schema) => (req, res, next) => {
    // For param schemas (IdParamSchema etc), check params; otherwise check body
    const source = schema._def?.shape?.id !== undefined &&
                   Object.keys(schema._def?.shape || {}).every((k) => ['id', 'userId'].includes(k))
      ? req.params
      : req.body;
    const result = schema.safeParse(source);
    if (!result.success) {
      return res.status(422).json({ status: 'fail', message: 'Validation error' });
    }
    next();
  };

  const ValidateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(422).json({ status: 'fail', message: 'Validation error' });
    }
    next();
  };

  const GetMeetingsQuerySchema = z.object({
    workspaceId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  });

  const parsePagination = ({ page = 1, limit = 20 } = {}) => ({
    safePage: Math.max(1, Number(page) || 1),
    safeLimit: Math.max(1, Math.min(100, Number(limit) || 20)),
  });

  return { ValidateRequest, ValidateQuery, GetMeetingsQuerySchema, parsePagination };
});

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({}),
  PublishEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@pms/constants', () => ({
  TOPICS: { MEETING_EVENTS: 'pms.meeting.events' },
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

// Mock nodemailer — used by both email.service and reminder.service
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('../config/prisma', () => ({
  meeting: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  meetingParticipant: {
    updateMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------

const request  = require('supertest');
const nodemailer = require('nodemailer');
const prisma   = require('../config/prisma');
const App      = require('../app');

// We also test the reminder service directly
const { CheckReminders } = (() => {
  // Re-require reminder.service after mocks are in place
  // jest.isolateModules avoids re-using a cached module
  let mod;
  try {
    mod = require('../services/reminder.service');
  } catch (err) {
    throw new Error(`Failed to load reminder.service: ${err.message}`);
  }
  return mod;
})();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE         = '/api/v1/meetings';
const USER_ID      = 'user-test-id';
const OTHER_USER   = 'aaaaaaaa-0000-4000-a000-aaaaaaaaaaaa';
const WORKSPACE_ID = 'bbbbbbbb-0000-4000-a000-bbbbbbbbbbbb';
const MEETING_ID   = 'cccccccc-0000-4000-a000-cccccccccccc';

const FUTURE_START = new Date(Date.now() + 3600_000).toISOString();
const FUTURE_END   = new Date(Date.now() + 7200_000).toISOString();

const makeMeeting = (overrides = {}) => ({
  id: MEETING_ID,
  workspaceId: WORKSPACE_ID,
  projectId: null,
  title: 'Team Sync',
  description: 'Weekly sync',
  startTime: FUTURE_START,
  endTime: FUTURE_END,
  meetingLink: 'https://meet.example.com/abc',
  createdBy: USER_ID,
  isActive: true,
  participants: [
    { userId: USER_ID },
    { userId: OTHER_USER },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Meeting Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/meetings — Create meeting
  // -------------------------------------------------------------------------

  describe('POST /api/v1/meetings', () => {
    it('creates a meeting and returns 201', async () => {
      const meeting = makeMeeting();
      prisma.meeting.create.mockResolvedValue(meeting);

      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'Team Sync',
          startTime: FUTURE_START,
          endTime: FUTURE_END,
          meetingLink: 'https://meet.example.com/abc',
          participantIds: [OTHER_USER],
        })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(MEETING_ID);
      expect(prisma.meeting.create).toHaveBeenCalledTimes(1);
    });

    it('rejects with 422 when endTime is before startTime', async () => {
      const past = new Date(Date.now() - 3600_000).toISOString();

      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'Bad Meeting',
          startTime: FUTURE_START,
          endTime: past,  // endTime before startTime
          participantIds: [OTHER_USER],
        })
        .expect(422);

      expect(res.body.status).toBe('fail');
      expect(prisma.meeting.create).not.toHaveBeenCalled();
    });

    it('rejects with 422 when startTime equals endTime', async () => {
      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'Zero duration',
          startTime: FUTURE_START,
          endTime: FUTURE_START,
          participantIds: [OTHER_USER],
        })
        .expect(422);

      expect(prisma.meeting.create).not.toHaveBeenCalled();
    });

    it('rejects with 422 when title is too short', async () => {
      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'X',
          startTime: FUTURE_START,
          endTime: FUTURE_END,
          participantIds: [OTHER_USER],
        })
        .expect(422);
    });

    it('rejects with 422 when participantIds is empty', async () => {
      const res = await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'No participants',
          startTime: FUTURE_START,
          endTime: FUTURE_END,
          participantIds: [],
        })
        .expect(422);
    });

    it('fires-and-forgets a Kafka event after creating the meeting', async () => {
      const { PublishEvent } = require('@pms/kafka');
      prisma.meeting.create.mockResolvedValue(makeMeeting());

      await request(App)
        .post(BASE)
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'Team Sync',
          startTime: FUTURE_START,
          endTime: FUTURE_END,
          participantIds: [OTHER_USER],
        })
        .expect(201);

      // Give the fire-and-forget a tick to settle
      await new Promise((r) => setImmediate(r));
      expect(PublishEvent).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/meetings — Get meetings (filtered by workspaceId)
  // -------------------------------------------------------------------------

  describe('GET /api/v1/meetings', () => {
    const FROM = new Date(Date.now() - 86400_000).toISOString();
    const TO   = new Date(Date.now() + 86400_000).toISOString();

    it('returns meetings for the workspace the user participates in', async () => {
      const meetings = [makeMeeting(), makeMeeting({ id: 'meet-2' })];
      prisma.meeting.findMany.mockResolvedValue(meetings);
      prisma.meeting.count.mockResolvedValue(2);

      const res = await request(App)
        .get(`${BASE}?workspaceId=${WORKSPACE_ID}&from=${FROM}&to=${TO}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.data).toHaveLength(2);
      expect(res.body.data.total).toBe(2);

      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
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

    it('responds 400 when from and to are missing', async () => {
      const res = await request(App)
        .get(`${BASE}?workspaceId=${WORKSPACE_ID}`)
        .expect(400);

      expect(res.body.status).toBe('fail');
    });

    it('responds 400 when from or to is an invalid date', async () => {
      const res = await request(App)
        .get(`${BASE}?workspaceId=${WORKSPACE_ID}&from=not-a-date&to=${TO}`)
        .expect(400);
    });

    it('applies page and limit pagination correctly', async () => {
      prisma.meeting.findMany.mockResolvedValue([]);
      prisma.meeting.count.mockResolvedValue(0);

      await request(App)
        .get(`${BASE}?workspaceId=${WORKSPACE_ID}&from=${FROM}&to=${TO}&page=2&limit=5`)
        .expect(200);

      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/meetings/:id — Get meeting by ID
  // -------------------------------------------------------------------------

  describe('GET /api/v1/meetings/:id', () => {
    it('returns a meeting for a participant', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());

      const res = await request(App)
        .get(`${BASE}/${MEETING_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(MEETING_ID);
    });

    it('responds 404 when the meeting does not exist', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const res = await request(App)
        .get(`${BASE}/${MEETING_ID}`)
        .expect(404);

      expect(res.body.status).toBe('fail');
    });

    it('responds 403 when the user is neither a participant nor the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(
        makeMeeting({
          createdBy: OTHER_USER,
          participants: [{ userId: OTHER_USER }],
        })
      );

      const res = await request(App)
        .get(`${BASE}/${MEETING_ID}`)
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/v1/meetings/:id — Update meeting
  // -------------------------------------------------------------------------

  describe('PATCH /api/v1/meetings/:id', () => {
    it('updates a meeting when the requester is the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meeting.update.mockResolvedValue(makeMeeting({ title: 'Updated' }));

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Updated' }),
        })
      );
    });

    it('responds 403 when the requester is not the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(
        makeMeeting({ createdBy: OTHER_USER })
      );

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}`)
        .send({ title: 'Hijacked title' })
        .expect(403);

      expect(prisma.meeting.update).not.toHaveBeenCalled();
    });

    it('rejects 422 when updated title is too short', async () => {
      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}`)
        .send({ title: 'X' })
        .expect(422);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/v1/meetings/:id — Cancel meeting
  // -------------------------------------------------------------------------

  describe('DELETE /api/v1/meetings/:id', () => {
    it('cancels (soft-deletes) a meeting by the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meeting.update.mockResolvedValue({ ...makeMeeting(), isActive: false });

      const res = await request(App)
        .delete(`${BASE}/${MEETING_ID}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } })
      );
    });

    it('responds 403 when the requester is not the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(
        makeMeeting({ createdBy: OTHER_USER })
      );

      await request(App).delete(`${BASE}/${MEETING_ID}`).expect(403);
      expect(prisma.meeting.update).not.toHaveBeenCalled();
    });

    it('responds 404 when the meeting does not exist', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      await request(App).delete(`${BASE}/${MEETING_ID}`).expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/v1/meetings/:id/rsvp — Update RSVP
  // -------------------------------------------------------------------------

  describe('PATCH /api/v1/meetings/:id/rsvp', () => {
    it('accepts an RSVP of "accepted"', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}/rsvp`)
        .send({ rsvp: 'accepted' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.meetingParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: MEETING_ID, userId: USER_ID },
          data: { rsvp: 'accepted' },
        })
      );
    });

    it('accepts an RSVP of "declined"', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}/rsvp`)
        .send({ rsvp: 'declined' })
        .expect(200);

      expect(prisma.meetingParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { rsvp: 'declined' } })
      );
    });

    it('rejects with 422 for an invalid RSVP value', async () => {
      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}/rsvp`)
        .send({ rsvp: 'tentative' })
        .expect(422);
    });

    it('responds 404 when the meeting does not exist', async () => {
      prisma.meeting.findUnique.mockResolvedValue(null);

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}/rsvp`)
        .send({ rsvp: 'accepted' })
        .expect(404);
    });

    it('responds 400 when the meeting is not active', async () => {
      prisma.meeting.findUnique.mockResolvedValue(
        makeMeeting({ isActive: false })
      );

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}/rsvp`)
        .send({ rsvp: 'accepted' })
        .expect(400);
    });

    it('responds 404 when the user is not a participant', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(App)
        .patch(`${BASE}/${MEETING_ID}/rsvp`)
        .send({ rsvp: 'accepted' })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/meetings/:id/participants — Add participant
  // -------------------------------------------------------------------------

  describe('POST /api/v1/meetings/:id/participants', () => {
    const NEW_USER = 'dddddddd-0000-4000-a000-dddddddddddd';

    it('adds a participant when requester is the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meetingParticipant.upsert.mockResolvedValue({});

      const res = await request(App)
        .post(`${BASE}/${MEETING_ID}/participants`)
        .send({ userId: NEW_USER })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.meetingParticipant.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId_userId: { meetingId: MEETING_ID, userId: NEW_USER } },
        })
      );
    });

    it('responds 403 when requester is not the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(
        makeMeeting({ createdBy: OTHER_USER })
      );

      await request(App)
        .post(`${BASE}/${MEETING_ID}/participants`)
        .send({ userId: NEW_USER })
        .expect(403);

      expect(prisma.meetingParticipant.upsert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/v1/meetings/:id/participants/:userId — Remove participant
  // -------------------------------------------------------------------------

  describe('DELETE /api/v1/meetings/:id/participants/:userId', () => {
    it('removes a participant when requester is the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(makeMeeting());
      prisma.meetingParticipant.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(App)
        .delete(`${BASE}/${MEETING_ID}/participants/${OTHER_USER}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.meetingParticipant.deleteMany).toHaveBeenCalledWith({
        where: { meetingId: MEETING_ID, userId: OTHER_USER },
      });
    });

    it('responds 403 when requester is not the creator', async () => {
      prisma.meeting.findUnique.mockResolvedValue(
        makeMeeting({ createdBy: OTHER_USER })
      );

      await request(App)
        .delete(`${BASE}/${MEETING_ID}/participants/${OTHER_USER}`)
        .expect(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Reminder Service — isolated unit tests
// ---------------------------------------------------------------------------

describe('ReminderService.CheckReminders', () => {
  // Re-require so we use our already-mocked prisma and nodemailer
  const ReminderService = require('../services/reminder.service');
  const Email = require('../services/email.service');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const makeParticipant = (overrides = {}) => ({
    userId: 'participant-1',
    rsvp: 'accepted',
    reminderSentAt: null,
    email: 'p1@test.com',
    ...overrides,
  });

  it('sends a reminder email only to non-declined participants', async () => {
    const now = Date.now();
    const meeting = {
      id: MEETING_ID,
      title: 'Standup',
      startTime: new Date(now + 15.5 * 60 * 1000),
      isActive: true,
      participants: [
        makeParticipant({ userId: 'p1', rsvp: 'accepted', email: 'p1@test.com' }),
        makeParticipant({ userId: 'p2', rsvp: 'declined', email: 'p2@test.com' }),
        makeParticipant({ userId: 'p3', rsvp: null, email: 'p3@test.com' }),
      ],
    };

    prisma.meeting.findMany.mockResolvedValue([meeting]);
    // Atomic claim succeeds for each participant (count=1)
    prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 1 });

    await ReminderService.CheckReminders();

    // p2 is declined — email is NOT sent for them; p1 and p3 should receive reminders
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });

  it('sends no reminder when all participants declined', async () => {
    const now = Date.now();
    const meeting = {
      id: MEETING_ID,
      title: 'Standup',
      startTime: new Date(now + 15.5 * 60 * 1000),
      isActive: true,
      participants: [
        makeParticipant({ rsvp: 'declined' }),
        makeParticipant({ userId: 'p2', rsvp: 'declined' }),
      ],
    };

    prisma.meeting.findMany.mockResolvedValue([meeting]);

    await ReminderService.CheckReminders();

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(prisma.meetingParticipant.updateMany).not.toHaveBeenCalled();
  });

  it('skips sending when atomic claim returns count=0 (another instance claimed first)', async () => {
    const now = Date.now();
    const meeting = {
      id: MEETING_ID,
      title: 'Standup',
      startTime: new Date(now + 15.5 * 60 * 1000),
      isActive: true,
      participants: [makeParticipant()],
    };

    prisma.meeting.findMany.mockResolvedValue([meeting]);
    // count=0 means another replica already sent the reminder
    prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 0 });

    await ReminderService.CheckReminders();

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('does nothing when there are no upcoming meetings in the window', async () => {
    prisma.meeting.findMany.mockResolvedValue([]);

    await ReminderService.CheckReminders();

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(prisma.meetingParticipant.updateMany).not.toHaveBeenCalled();
  });

  it('rolls back the claim and logs an error when sendMail fails', async () => {
    const now = Date.now();
    const claimAt = new Date();
    const meeting = {
      id: MEETING_ID,
      title: 'Standup',
      startTime: new Date(now + 15.5 * 60 * 1000),
      isActive: true,
      participants: [makeParticipant()],
    };

    prisma.meeting.findMany.mockResolvedValue([meeting]);
    prisma.meetingParticipant.updateMany
      .mockResolvedValueOnce({ count: 1 }) // claim succeeds
      .mockResolvedValueOnce({ count: 1 }); // rollback succeeds

    mockSendMail.mockRejectedValueOnce(new Error('SMTP failure'));

    await ReminderService.CheckReminders();

    // Rollback call (set reminderSentAt back to null)
    expect(prisma.meetingParticipant.updateMany).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalled();
  });

  it('sendMail is NOT called for a participant with rsvp=declined even if they appear in the query results', async () => {
    const now = Date.now();
    const meeting = {
      id: MEETING_ID,
      title: 'Standup',
      startTime: new Date(now + 15.5 * 60 * 1000),
      isActive: true,
      participants: [
        makeParticipant({ userId: 'p-accepted', rsvp: 'accepted', email: 'a@test.com' }),
        makeParticipant({ userId: 'p-declined', rsvp: 'declined', email: 'd@test.com' }),
      ],
    };

    prisma.meeting.findMany.mockResolvedValue([meeting]);
    prisma.meetingParticipant.updateMany.mockResolvedValue({ count: 1 });

    await ReminderService.CheckReminders();

    // Only one sendMail call — for the accepted participant
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [callArgs] = mockSendMail.mock.calls[0];
    expect(callArgs.to).toBe('a@test.com');
  });
});
