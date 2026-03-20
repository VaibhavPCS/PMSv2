'use strict';

// ─── Mocks — must be hoisted before any require of the app ───────────────────

const mockUserId = 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa';

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, _res, next) => {
    req.session = { getUserId: () => mockUserId };
    next();
  },
  RequireRole: () => (_req, _res, next) => next(),
}));

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({}),
  PublishEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock the entire publishers module so Kafka is never touched
jest.mock('../events/publishers', () => ({
  PublishTaskCreated: jest.fn().mockResolvedValue(undefined),
  PublishTaskStatusChanged: jest.fn().mockResolvedValue(undefined),
  PublishTaskDeleted: jest.fn().mockResolvedValue(undefined),
  PublishSprintCreated: jest.fn().mockResolvedValue(undefined),
  PublishSprintDeleted: jest.fn().mockResolvedValue(undefined),
}));

// Prisma mock — every method is a jest.fn() returning undefined by default.
// Individual tests override per-method as needed.
const mockPrisma = {
  $transaction: jest.fn(),
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  taskAssignee: {
    create: jest.fn(),
    upsert: jest.fn(),
  },
  taskHistory: {
    create: jest.fn(),
  },
  sprint: {
    findUnique: jest.fn(),
  },
  projectMemberRoleCache: {
    findUnique: jest.fn(),
  },
};

jest.mock("../config/prisma", () => mockPrisma);

// Stub supertokens so app.js does not crash without a running ST core
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

const USER_ID      = mockUserId;
const OTHER_USER   = '00000000-0000-1000-8000-000000000001';
const TASK_ID      = 'aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa';
const PROJECT_ID   = 'bbbbbbbb-bbbb-1bbb-8bbb-bbbbbbbbbbbb';
const WORKSPACE_ID = 'cccccccc-cccc-1ccc-8ccc-cccccccccccc';
const SPRINT_ID    = 'dddddddd-dddd-1ddd-8ddd-dddddddddddd';

const futureDate = () => new Date(Date.now() + 86_400_000 * 30).toISOString();
const pastDate   = () => new Date(Date.now() - 86_400_000).toISOString();

/** Minimal task record returned from the DB for most tests */
const makeTask = (overrides = {}) => ({
  id: TASK_ID,
  title: 'Test Task',
  description: 'desc',
  priority: 'medium',
  dueDate: new Date(futureDate()),
  projectId: PROJECT_ID,
  workspaceId: WORKSPACE_ID,
  sprintId: null,
  parentTask: null,
  createdBy: USER_ID,
  projectHeadId: USER_ID,
  status: 'pending',
  isActive: true,
  isFlagged: false,
  flagReason: null,
  cycleCount: 0,
  assignees: [{ taskId: TASK_ID, userId: USER_ID }],
  history: [],
  ...overrides,
});

/** Wire mockPrisma.$transaction to run the callback with mockPrisma as tx */
const mockTransaction = () => {
  mockPrisma.$transaction.mockImplementation((cb) => {
    if (typeof cb === 'function') return cb(mockPrisma);
    // array-form used in DeleteSprint; not needed here
    return Promise.all(cb);
  });
};

// ─── POST /api/v1/tasks ───────────────────────────────────────────────────────

describe('POST /api/v1/tasks — CreateTask', () => {
  const validBody = {
    title: 'My Task',
    description: 'desc',
    priority: 'high',
    dueDate: futureDate(),
    assignees: [USER_ID],
    projectId: PROJECT_ID,
    workspaceId: WORKSPACE_ID,
    projectHeadId: USER_ID,
  };

  beforeEach(() => {
    mockTransaction();
    mockPrisma.projectMemberRoleCache.findUnique.mockResolvedValue({ role: 'member' });
    mockPrisma.task.create.mockResolvedValue(makeTask());
    mockPrisma.taskAssignee.create.mockResolvedValue({});
    mockPrisma.taskHistory.create.mockResolvedValue({});
  });

  it('201 — creates task and returns the created record', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: TASK_ID, status: 'pending' });
  });

  it('422 — rejects when assignees array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ ...validBody, assignees: [] });

    expect(res.status).toBe(422);
  });

  it('422 — rejects when assignees is missing', async () => {
    const { assignees, ...body } = validBody;
    const res = await request(app).post('/api/v1/tasks').send(body);
    expect(res.status).toBe(422);
  });

  it('422 — rejects an invalid dueDate', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ ...validBody, dueDate: 'not-a-date' });

    expect(res.status).toBe(422);
  });

  it('422 — rejects missing title', async () => {
    const { title, ...body } = validBody;
    const res = await request(app).post('/api/v1/tasks').send(body);
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/tasks ────────────────────────────────────────────────────────

describe('GET /api/v1/tasks — GetTasks', () => {
  beforeEach(() => {
    mockPrisma.task.findMany.mockResolvedValue([makeTask()]);
    mockPrisma.task.count.mockResolvedValue(1);
  });

  it('200 — returns paginated task list', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .query({ projectId: PROJECT_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 — filters by sprintId and status', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.task.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/tasks')
      .query({ projectId: PROJECT_ID, sprintId: SPRINT_ID, status: 'pending' });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('200 — respects page and limit query params', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.task.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/tasks')
      .query({ projectId: PROJECT_ID, page: 2, limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(5);
  });
});

// ─── GET /api/v1/tasks/:id ────────────────────────────────────────────────────

describe('GET /api/v1/tasks/:id — GetTask', () => {
  it('200 — returns task when user is an assignee', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(makeTask());

    const res = await request(app).get(`/api/v1/tasks/${TASK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TASK_ID);
  });

  it('200 — returns task when user is the creator', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ assignees: [], createdBy: USER_ID, projectHeadId: OTHER_USER })
    );

    const res = await request(app).get(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(200);
  });

  it('200 — returns task when user is the project head', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ assignees: [], createdBy: OTHER_USER, projectHeadId: USER_ID })
    );

    const res = await request(app).get(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(200);
  });

  it('404 — task not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(404);
  });

  it('404 — soft-deleted task treated as not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(makeTask({ isActive: false }));

    const res = await request(app).get(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(404);
  });

  it('403 — access denied for unrelated user', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ assignees: [], createdBy: OTHER_USER, projectHeadId: OTHER_USER })
    );

    const res = await request(app).get(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/v1/tasks/:id/status ──────────────────────────────────────────

describe('PATCH /api/v1/tasks/:id/status — UpdateStatus', () => {
  beforeEach(() => {
    mockTransaction();
    mockPrisma.task.update.mockResolvedValue(makeTask({ status: 'in_progress' }));
    mockPrisma.taskHistory.create.mockResolvedValue({});
    mockPrisma.sprint.findUnique.mockResolvedValue(null);
  });

  it('200 — pending → in_progress (valid transition)', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'pending', assignees: [{ taskId: TASK_ID, userId: USER_ID }] })
    );

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('200 — in_progress → completed (valid transition)', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'in_progress', assignees: [{ taskId: TASK_ID, userId: USER_ID }] })
    );
    mockPrisma.task.update.mockResolvedValue(makeTask({ status: 'completed' }));

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
  });

  it('200 — in_progress → on_hold (valid transition)', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'in_progress', assignees: [{ taskId: TASK_ID, userId: USER_ID }] })
    );
    mockPrisma.task.update.mockResolvedValue(makeTask({ status: 'on_hold' }));

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'on_hold' });

    expect(res.status).toBe(200);
  });

  it('200 — rejected → in_progress (valid transition)', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'rejected', assignees: [{ taskId: TASK_ID, userId: USER_ID }] })
    );
    mockPrisma.task.update.mockResolvedValue(makeTask({ status: 'in_progress' }));

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
  });

  it('400 — invalid transition (pending → completed)', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'pending', assignees: [{ taskId: TASK_ID, userId: USER_ID }] })
    );

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
  });

  it('403 — non-assignee cannot update status', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'pending', assignees: [] })
    );

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(403);
  });

  it('404 — task not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(404);
  });

  it('423 — frozen task (isFlagged=true) cannot be updated', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({
        status: 'pending',
        isFlagged: true,
        assignees: [{ taskId: TASK_ID, userId: USER_ID }],
      })
    );

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(423);
  });

  it('423 — task gets flagged when sprint has expired', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({
        status: 'pending',
        sprintId: SPRINT_ID,
        isFlagged: false,
        assignees: [{ taskId: TASK_ID, userId: USER_ID }],
      })
    );
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: SPRINT_ID,
      endDate: new Date(pastDate()),
    });

    const res = await request(app)
      .patch(`/api/v1/tasks/${TASK_ID}/status`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(423);
  });
});

// ─── POST /api/v1/tasks/:id/approve ──────────────────────────────────────────

describe('POST /api/v1/tasks/:id/approve — ApproveTask', () => {
  beforeEach(() => {
    mockTransaction();
    mockPrisma.task.update.mockResolvedValue(makeTask({ status: 'approved' }));
    mockPrisma.taskHistory.create.mockResolvedValue({});
    mockPrisma.sprint.findUnique.mockResolvedValue(null);
  });

  it('200 — project head approves a completed task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'completed', projectHeadId: USER_ID })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/approve`)
      .send({ comment: 'LGTM' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('200 — project head approves an in_review task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'in_review', projectHeadId: USER_ID })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/approve`)
      .send({ comment: 'all good' });

    expect(res.status).toBe(200);
  });

  it('403 — non-project-head cannot approve', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'completed', projectHeadId: OTHER_USER })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/approve`)
      .send({ comment: 'LGTM' });

    expect(res.status).toBe(403);
  });

  it('400 — cannot approve a pending task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'pending', projectHeadId: USER_ID })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/approve`)
      .send({ comment: 'ok' });

    expect(res.status).toBe(400);
  });

  it('404 — task not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/approve`)
      .send({ comment: 'ok' });

    expect(res.status).toBe(404);
  });
});

// ─── POST /api/v1/tasks/:id/reject ───────────────────────────────────────────

describe('POST /api/v1/tasks/:id/reject — RejectTask', () => {
  const validRejectTo = OTHER_USER; // must be a participant

  beforeEach(() => {
    mockTransaction();
    mockPrisma.task.findUnique
      .mockResolvedValueOnce(
        makeTask({
          status: 'completed',
          projectHeadId: USER_ID,
          createdBy: USER_ID,
          assignees: [
            { taskId: TASK_ID, userId: USER_ID },
            { taskId: TASK_ID, userId: OTHER_USER },
          ],
        })
      )
      // second call in RejectTask (final findUnique)
      .mockResolvedValue(
        makeTask({
          status: 'rejected',
          assignees: [
            { taskId: TASK_ID, userId: USER_ID },
            { taskId: TASK_ID, userId: OTHER_USER },
          ],
        })
      );
    mockPrisma.task.update.mockResolvedValue({});
    mockPrisma.taskAssignee.upsert.mockResolvedValue({});
    mockPrisma.taskHistory.create.mockResolvedValue({});
    mockPrisma.sprint.findUnique.mockResolvedValue(null);
  });

  it('200 — project head rejects a completed task', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/reject`)
      .send({ reason: 'Needs rework', rejectTo: OTHER_USER });

    expect(res.status).toBe(200);
  });

  it('422 — rejectTo must be a valid UUID', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/reject`)
      .send({ reason: 'Needs rework', rejectTo: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });

  it('400 — rejectTo must be a known participant', async () => {
    const stranger = '11111111-1111-1111-8111-111111111111';
    // Override so stranger is NOT in participants
    mockPrisma.task.findUnique.mockReset();
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({
        status: 'completed',
        projectHeadId: USER_ID,
        createdBy: USER_ID,
        assignees: [{ taskId: TASK_ID, userId: USER_ID }],
      })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/reject`)
      .send({ reason: 'bad', rejectTo: stranger });

    expect(res.status).toBe(400);
  });

  it('403 — non-project-head cannot reject', async () => {
    mockPrisma.task.findUnique.mockReset();
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'completed', projectHeadId: OTHER_USER })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/reject`)
      .send({ reason: 'bad', rejectTo: OTHER_USER });

    expect(res.status).toBe(403);
  });

  it('400 — cannot reject a pending task', async () => {
    mockPrisma.task.findUnique.mockReset();
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'pending', projectHeadId: USER_ID })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/reject`)
      .send({ reason: 'bad', rejectTo: OTHER_USER });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/v1/tasks/:id/handover ─────────────────────────────────────────

describe('POST /api/v1/tasks/:id/handover — HandoverTask', () => {
  beforeEach(() => {
    mockTransaction();
    mockPrisma.task.update.mockResolvedValue(makeTask({ status: 'in_review' }));
    mockPrisma.taskAssignee.upsert.mockResolvedValue({});
    mockPrisma.taskHistory.create.mockResolvedValue({});
    mockPrisma.sprint.findUnique.mockResolvedValue(null);
  });

  it('200 — project head hands a completed task over for review', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'completed', projectHeadId: USER_ID })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/handover`)
      .send({ notes: 'Please review', handoverTo: OTHER_USER });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_review');
  });

  it('422 — handoverTo must be a valid UUID', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/handover`)
      .send({ notes: 'review please', handoverTo: 'bad-uuid' });

    expect(res.status).toBe(422);
  });

  it('400 — cannot hand over a non-completed task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'in_progress', projectHeadId: USER_ID })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/handover`)
      .send({ notes: 'review', handoverTo: OTHER_USER });

    expect(res.status).toBe(400);
  });

  it('403 — non-project-head cannot hand over', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(
      makeTask({ status: 'completed', projectHeadId: OTHER_USER })
    );

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/handover`)
      .send({ notes: 'review', handoverTo: OTHER_USER });

    expect(res.status).toBe(403);
  });

  it('404 — task not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/tasks/${TASK_ID}/handover`)
      .send({ notes: 'review', handoverTo: OTHER_USER });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/v1/tasks/:id ────────────────────────────────────────────────

describe('DELETE /api/v1/tasks/:id — DeleteTask', () => {
  it('204 — creator can delete their own task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(makeTask({ createdBy: USER_ID }));
    mockPrisma.task.update.mockResolvedValue({});

    const res = await request(app).delete(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(204);
  });

  it('403 — non-creator cannot delete', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(makeTask({ createdBy: OTHER_USER }));

    const res = await request(app).delete(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(403);
  });

  it('404 — task not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const res = await request(app).delete(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(404);
  });

  it('404 — soft-deleted task treated as not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(makeTask({ isActive: false }));

    const res = await request(app).delete(`/api/v1/tasks/${TASK_ID}`);
    expect(res.status).toBe(404);
  });
});
