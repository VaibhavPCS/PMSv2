'use strict';

// ─── Mocks — must be hoisted before any require of the app ───────────────────

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, _res, next) => {
    req.session = { getUserId: () => 'user-test-id' };
    next();
  },
  RequireRole: () => (_req, _res, next) => next(),
}));

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({}),
  PublishEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../events/publishers', () => ({
  PublishTaskCreated: jest.fn().mockResolvedValue(undefined),
  PublishTaskStatusChanged: jest.fn().mockResolvedValue(undefined),
  PublishTaskDeleted: jest.fn().mockResolvedValue(undefined),
  PublishSprintCreated: jest.fn().mockResolvedValue(undefined),
  PublishSprintDeleted: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = {
  $transaction: jest.fn(),
  sprint: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  projectEndDateCache: {
    findUnique: jest.fn(),
  },
};

jest.mock("../config/prisma", () => mockPrisma);

jest.mock('supertokens-node', () => ({
  init: jest.fn(),
  getAllCORSHeaders: jest.fn().mockReturnValue([]),
}));
jest.mock('supertokens-node/framework/express', () => ({
  middleware: () => (_req, _res, next) => next(),
  errorHandler: () => (err, _req, _res, next) => next(err),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

const request = require('supertest');
const app = require('../app');

// ─── Constants ────────────────────────────────────────────────────────────────

const SPRINT_ID  = 'dddddddd-dddd-1ddd-8ddd-dddddddddddd';
const PROJECT_ID = 'bbbbbbbb-bbbb-1bbb-8bbb-bbbbbbbbbbbb';

const future = (days = 10) =>
  new Date(Date.now() + 86_400_000 * days).toISOString();
const past = (days = 1) =>
  new Date(Date.now() - 86_400_000 * days).toISOString();

const makeSprint = (overrides = {}) => ({
  id: SPRINT_ID,
  name: 'Sprint 1',
  goal: 'Ship it',
  projectId: PROJECT_ID,
  startDate: new Date(future(1)),
  endDate: new Date(future(14)),
  isActive: true,
  ...overrides,
});

/** Wire $transaction to run the callback with mockPrisma as tx */
const mockTransaction = () => {
  mockPrisma.$transaction.mockImplementation((cbOrArray) => {
    if (typeof cbOrArray === 'function') return cbOrArray(mockPrisma);
    // Array form used in DeleteSprint: [updateMany result, sprint update result]
    return Promise.all(cbOrArray);
  });
};

// ─── POST /api/v1/sprints ─────────────────────────────────────────────────────

describe('POST /api/v1/sprints — CreateSprint', () => {
  const validBody = {
    name: 'Sprint Alpha',
    goal: 'Deliver MVP',
    projectId: PROJECT_ID,
    startDate: future(1),
    endDate: future(14),
  };

  beforeEach(() => {
    mockPrisma.projectEndDateCache.findUnique.mockResolvedValue(null);
    mockPrisma.sprint.create.mockResolvedValue(makeSprint({ name: 'Sprint Alpha' }));
  });

  it('201 — creates sprint and returns record', async () => {
    const res = await request(app)
      .post('/api/v1/sprints')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: SPRINT_ID, name: validBody.name });
    expect(mockPrisma.sprint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: validBody.name,
          goal: validBody.goal,
          projectId: validBody.projectId,
        }),
      }),
    );
  });

  it('201 — creates sprint without optional goal', async () => {
    const { goal, ...body } = validBody;
    const res = await request(app).post('/api/v1/sprints').send(body);
    expect(res.status).toBe(201);
  });

  it('400 — startDate must be before endDate', async () => {
    const res = await request(app)
      .post('/api/v1/sprints')
      .send({ ...validBody, startDate: future(14), endDate: future(1) });

    expect(res.status).toBe(400);
  });

  it('400 — equal startDate and endDate is rejected', async () => {
    const same = future(7);
    const res = await request(app)
      .post('/api/v1/sprints')
      .send({ ...validBody, startDate: same, endDate: same });

    expect(res.status).toBe(400);
  });

  it('400 — sprint endDate cannot exceed cached project endDate', async () => {
    mockPrisma.projectEndDateCache.findUnique.mockResolvedValue({
      projectId: PROJECT_ID,
      endDate: new Date(future(5)),
    });

    const res = await request(app)
      .post('/api/v1/sprints')
      .send({ ...validBody, endDate: future(20) });

    expect(res.status).toBe(400);
  });

  it('422 — rejects missing name', async () => {
    const { name, ...body } = validBody;
    const res = await request(app).post('/api/v1/sprints').send(body);
    expect(res.status).toBe(422);
  });

  it('422 — rejects missing projectId', async () => {
    const { projectId, ...body } = validBody;
    const res = await request(app).post('/api/v1/sprints').send(body);
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/sprints ──────────────────────────────────────────────────────

describe('GET /api/v1/sprints — GetSprints', () => {
  it('200 — returns all active sprints for a project', async () => {
    mockPrisma.sprint.findMany.mockResolvedValue([makeSprint()]);

    const res = await request(app)
      .get('/api/v1/sprints')
      .query({ projectId: PROJECT_ID });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe(SPRINT_ID);
  });

  it('200 — returns empty array when no sprints exist', async () => {
    mockPrisma.sprint.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/sprints')
      .query({ projectId: PROJECT_ID });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('422 — missing projectId query param', async () => {
    const res = await request(app).get('/api/v1/sprints');
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/sprints/:id ──────────────────────────────────────────────────

describe('GET /api/v1/sprints/:id — GetSprint', () => {
  it('200 — returns sprint with its tasks', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(makeSprint());
    mockPrisma.task.findMany.mockResolvedValue([]);

    const res = await request(app).get(`/api/v1/sprints/${SPRINT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(SPRINT_ID);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('404 — sprint not found', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/sprints/${SPRINT_ID}`);
    expect(res.status).toBe(404);
  });

  it('404 — soft-deleted sprint treated as not found', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(makeSprint({ isActive: false }));

    const res = await request(app).get(`/api/v1/sprints/${SPRINT_ID}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/v1/sprints/:id ────────────────────────────────────────────────

describe('PATCH /api/v1/sprints/:id — UpdateSprint', () => {
  beforeEach(() => {
    mockPrisma.sprint.findUnique.mockResolvedValue(makeSprint());
    mockPrisma.projectEndDateCache.findUnique.mockResolvedValue(null);
    mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.sprint.update.mockResolvedValue(makeSprint({ name: 'Sprint Updated' }));
  });

  it('200 — updates sprint name', async () => {
    const res = await request(app)
      .patch(`/api/v1/sprints/${SPRINT_ID}`)
      .send({ name: 'Sprint Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Sprint Updated');
  });

  it('200 — extends endDate and unfreezes flagged tasks', async () => {
    mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.sprint.update.mockResolvedValue(makeSprint({ endDate: new Date(future(30)) }));

    const res = await request(app)
      .patch(`/api/v1/sprints/${SPRINT_ID}`)
      .send({ endDate: future(30) });

    expect(res.status).toBe(200);
    // updateMany should have been called to unfreeze tasks
    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sprintId: SPRINT_ID, isFlagged: true }),
        data: { isFlagged: false, flagReason: null },
      })
    );
  });

  it('400 — new dates must not be invalid (start >= end)', async () => {
    const res = await request(app)
      .patch(`/api/v1/sprints/${SPRINT_ID}`)
      .send({ startDate: future(20), endDate: future(5) });

    expect(res.status).toBe(400);
  });

  it('400 — extended endDate must not exceed project endDate cache', async () => {
    mockPrisma.projectEndDateCache.findUnique.mockResolvedValue({
      projectId: PROJECT_ID,
      endDate: new Date(future(10)),
    });

    const res = await request(app)
      .patch(`/api/v1/sprints/${SPRINT_ID}`)
      .send({ endDate: future(60) });

    expect(res.status).toBe(400);
  });

  it('404 — sprint not found', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/sprints/${SPRINT_ID}`)
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/v1/sprints/:id ──────────────────────────────────────────────

describe('DELETE /api/v1/sprints/:id — DeleteSprint', () => {
  beforeEach(() => {
    mockTransaction();
    mockPrisma.sprint.findUnique.mockResolvedValue(makeSprint());
    mockPrisma.task.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.sprint.update.mockResolvedValue(makeSprint({ isActive: false }));
  });

  it('204 — deletes sprint (soft delete) and detaches tasks', async () => {
    const res = await request(app).delete(`/api/v1/sprints/${SPRINT_ID}`);
    expect(res.status).toBe(204);
  });

  it('204 — task.updateMany is called to detach tasks', async () => {
    await request(app).delete(`/api/v1/sprints/${SPRINT_ID}`);

    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sprintId: SPRINT_ID },
        data: { sprintId: null },
      })
    );
  });

  it('404 — sprint not found', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(null);

    const res = await request(app).delete(`/api/v1/sprints/${SPRINT_ID}`);
    expect(res.status).toBe(404);
  });

  it('404 — soft-deleted sprint treated as not found', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(makeSprint({ isActive: false }));

    const res = await request(app).delete(`/api/v1/sprints/${SPRINT_ID}`);
    expect(res.status).toBe(404);
  });
});
