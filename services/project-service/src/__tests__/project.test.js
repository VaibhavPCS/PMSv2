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
  OptionalAuth: (_req, _res, next) => next(),
}));

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({}),
  PublishEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../events/publishers', () => ({
  PublishProjectCreated: jest.fn().mockResolvedValue(undefined),
  PublishProjectUpdated: jest.fn().mockResolvedValue(undefined),
  PublishProjectDeleted: jest.fn().mockResolvedValue(undefined),
  PublishProjectMemberAdded: jest.fn().mockResolvedValue(undefined),
  PublishProjectMemberRemoved: jest.fn().mockResolvedValue(undefined),
  PublishProjectMemberRoleChanged: jest.fn().mockResolvedValue(undefined),
  PublishProjectHeadChanged: jest.fn().mockResolvedValue(undefined),
  PublishProjectDeadlineExtended: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = {
  $transaction: jest.fn(),
  project: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  projectMember: {
    create: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  workspaceRoleCache: {
    findUnique: jest.fn(),
  },
  projectDateHistory: {
    create: jest.fn(),
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

const USER_ID        = mockUserId;
const OTHER_USER     = '00000000-0000-1000-8000-000000000001';
const NEW_USER       = '22222222-2222-1222-8222-222222222222';
const PROJECT_ID     = 'bbbbbbbb-bbbb-1bbb-8bbb-bbbbbbbbbbbb';
const WORKSPACE_ID   = 'cccccccc-cccc-1ccc-8ccc-cccccccccccc';

const future = (days = 30) =>
  new Date(Date.now() + 86_400_000 * days).toISOString();
const past = (days = 1) =>
  new Date(Date.now() - 86_400_000 * days).toISOString();

const makeProject = (overrides = {}) => ({
  id: PROJECT_ID,
  name: 'My Project',
  description: 'Project description',
  state: 'active',
  projectStatus: 'on_track',
  startDate: new Date(past(10)),
  endDate: new Date(future(30)),
  tags: [],
  workspaceId: WORKSPACE_ID,
  createdBy: USER_ID,
  isActive: true,
  members: [{ userId: USER_ID, role: 'project_head' }],
  dateHistory: [],
  ...overrides,
});

const makeProjectMember = (overrides = {}) => ({
  id: 'mem-1',
  projectId: PROJECT_ID,
  userId: USER_ID,
  role: 'project_head',
  isActive: true,
  joinedAt: new Date(),
  ...overrides,
});

/** Wire $transaction to run callback with mockPrisma as tx */
const mockTransaction = () => {
  mockPrisma.$transaction.mockImplementation((cbOrArray) => {
    if (typeof cbOrArray === 'function') return cbOrArray(mockPrisma);
    return Promise.all(cbOrArray);
  });
};

// ─── POST /api/v1/projects ────────────────────────────────────────────────────

describe('POST /api/v1/projects — CreateProject', () => {
  const validBody = {
    name: 'Alpha Project',
    description: 'First project',
    state: 'Planning',
    startDate: past(1),
    endDate: future(60),
    tags: ['backend'],
    workspaceId: WORKSPACE_ID,
  };

  beforeEach(() => {
    mockTransaction();
    mockPrisma.project.create.mockResolvedValue(makeProject());
    mockPrisma.projectMember.create.mockResolvedValue(makeProjectMember());
    mockPrisma.projectMember.createMany.mockResolvedValue({ count: 0 });
  });

  it('201 — creates project and returns the record', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: PROJECT_ID, name: 'My Project' });
  });

  it('201 — creates project with initial members list', async () => {
    mockPrisma.projectMember.createMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/v1/projects')
      .send({
        ...validBody,
        members: [{ userId: OTHER_USER, role: 'member' }],
      });

    expect(res.status).toBe(201);
  });

  it('422 — missing name is rejected', async () => {
    const { name, ...body } = validBody;
    const res = await request(app).post('/api/v1/projects').send(body);
    expect(res.status).toBe(422);
  });

  it('422 — missing workspaceId is rejected', async () => {
    const { workspaceId, ...body } = validBody;
    const res = await request(app).post('/api/v1/projects').send(body);
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/projects ─────────────────────────────────────────────────────

describe('GET /api/v1/projects — GetProjects', () => {
  it('200 — returns paginated project list', async () => {
    mockPrisma.project.findMany.mockResolvedValue([makeProject()]);
    mockPrisma.project.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/projects')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 — empty list when user has no projects', async () => {
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.project.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/projects')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('200 — respects page and limit params', async () => {
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.project.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/projects')
      .query({ workspaceId: WORKSPACE_ID, page: 2, limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(5);
  });
});

// ─── GET /api/v1/projects/:id ─────────────────────────────────────────────────

describe('GET /api/v1/projects/:id — GetProject', () => {
  it('200 — returns project for a member', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(makeProject());

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(PROJECT_ID);
  });

  it('403 — user not a member is denied access', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProject({ members: [{ userId: OTHER_USER, role: 'member' }] })
    );

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(403);
  });

  it('404 — project not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(404);
  });

  it('404 — soft-deleted project treated as not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProject({ isActive: false, members: [{ userId: USER_ID, role: 'project_head' }] })
    );

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/v1/projects/:id ───────────────────────────────────────────────

describe('PATCH /api/v1/projects/:id — UpdateProject', () => {
  it('200 — project head updates name and description', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'project_head' })
    );
    mockPrisma.project.update.mockResolvedValue(makeProject({ name: 'Updated Name' }));

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .send({ name: 'Updated Name', description: 'New description' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('200 — project head updates projectStatus', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'project_head' })
    );
    mockPrisma.project.update.mockResolvedValue(makeProject({ projectStatus: 'at_risk' }));

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .send({ projectStatus: 'at_risk' });

    expect(res.status).toBe(200);
  });

  it('403 — non-project-head cannot update', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'member' })
    );

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(403);
  });

  it('403 — non-member cannot update', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/v1/projects/:id ──────────────────────────────────────────────

describe('DELETE /api/v1/projects/:id — DeleteProject', () => {
  it('204 — project head deletes project', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'project_head' })
    );
    mockPrisma.project.update.mockResolvedValue({});

    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(204);
  });

  it('403 — non-project-head cannot delete', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'member' })
    );

    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(403);
  });

  it('403 — non-member cannot delete', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(null);

    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/v1/projects/:id/extend-deadline ───────────────────────────────

describe('PATCH /api/v1/projects/:id/extend-deadline — ExtendProjectDeadline', () => {
  beforeEach(() => {
    mockPrisma.project.findUnique.mockResolvedValue(makeProject());
    mockPrisma.workspaceRoleCache.findUnique.mockResolvedValue({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      role: 'admin',
    });
    mockTransaction();
    mockPrisma.project.update.mockResolvedValue(makeProject({ endDate: new Date(future(90)) }));
    mockPrisma.projectDateHistory.create.mockResolvedValue({});
  });

  it('200 — admin extends project deadline', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: future(90), reason: 'Client requested more time' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'success' });
  });

  it('200 — owner can also extend deadline', async () => {
    mockPrisma.workspaceRoleCache.findUnique.mockResolvedValue({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      role: 'owner',
    });

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: future(90), reason: 'Owner approved' });

    expect(res.status).toBe(200);
  });

  it('400 — new end date must be later than current end date', async () => {
    // Current endDate is future(30), so future(15) is earlier
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: future(15), reason: 'Shorter deadline requested by client' });

    expect(res.status).toBe(400);
  });

  it('422 — invalid date string is rejected by validator', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: 'not-a-date', reason: 'Using a bad date value here' });

    expect(res.status).toBe(422);
  });

  it('403 — regular member cannot extend deadline', async () => {
    mockPrisma.workspaceRoleCache.findUnique.mockResolvedValue({
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
      role: 'member',
    });

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: future(90), reason: 'Trying to extend the deadline here' });

    expect(res.status).toBe(403);
  });

  it('403 — user with no role cache record is denied', async () => {
    mockPrisma.workspaceRoleCache.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: future(90), reason: 'No role assigned to this user' });

    expect(res.status).toBe(403);
  });

  it('404 — project not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ newEndDate: future(90), reason: 'ghost project' });

    expect(res.status).toBe(404);
  });

  it('422 — missing newEndDate is rejected by validator', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/extend-deadline`)
      .send({ reason: 'no date' });

    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/projects/:id/members ────────────────────────────────────────

describe('GET /api/v1/projects/:id/members — GetMembers', () => {
  it('200 — member can list all project members', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(makeProjectMember());
    mockPrisma.projectMember.findMany.mockResolvedValue([
      makeProjectMember(),
      makeProjectMember({ userId: OTHER_USER, role: 'member' }),
    ]);

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/members`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('403 — non-member cannot list members', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/members`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/v1/projects/:id/members ───────────────────────────────────────

describe('POST /api/v1/projects/:id/members — AddMember', () => {
  it('201 — project head adds a member', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'project_head' })
    );
    mockPrisma.projectMember.upsert.mockResolvedValue(
      makeProjectMember({ userId: NEW_USER, role: 'member' })
    );

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .send({ userId: NEW_USER, role: 'member' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(NEW_USER);
  });

  it('201 — project head adds a trainee', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'project_head' })
    );
    mockPrisma.projectMember.upsert.mockResolvedValue(
      makeProjectMember({ userId: NEW_USER, role: 'trainee' })
    );

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .send({ userId: NEW_USER, role: 'trainee' });

    expect(res.status).toBe(201);
  });

  it('403 — non-project-head cannot add members', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'member' })
    );

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .send({ userId: NEW_USER, role: 'member' });

    expect(res.status).toBe(403);
  });

  it('404 — requester not a member of project', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .send({ userId: NEW_USER, role: 'member' });

    expect(res.status).toBe(404);
  });

  it('422 — missing userId is rejected by validator', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .send({ role: 'member' });

    expect(res.status).toBe(422);
  });

  it('422 — missing role is rejected by validator', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/members`)
      .send({ userId: NEW_USER });

    expect(res.status).toBe(422);
  });
});

// ─── DELETE /api/v1/projects/:id/members/:userId ──────────────────────────────

describe('DELETE /api/v1/projects/:id/members/:userId — RemoveMember', () => {
  it('204 — project head removes a regular member', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head' }))  // requester
      .mockResolvedValueOnce(makeProjectMember({ userId: OTHER_USER, role: 'member' })); // target
    mockPrisma.projectMember.update.mockResolvedValue({});

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}`);

    expect(res.status).toBe(204);
  });

  it('204 — member can remove themselves', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'member' })) // requester (self)
      .mockResolvedValueOnce(makeProjectMember({ userId: USER_ID, role: 'member' })); // target = self
    mockPrisma.projectMember.update.mockResolvedValue({});

    // User_ID is authenticated; remove themselves
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${USER_ID}`);

    expect(res.status).toBe(204);
  });

  it('403 — cannot remove the project head', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head' }))
      .mockResolvedValueOnce(makeProjectMember({ userId: OTHER_USER, role: 'project_head' }));

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}`);

    expect(res.status).toBe(403);
  });

  it('403 — regular member cannot remove another member', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'member' }))
      .mockResolvedValueOnce(makeProjectMember({ userId: OTHER_USER, role: 'member' }));

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}`);

    expect(res.status).toBe(403);
  });

  it('403 — requester not a project member', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}`);

    expect(res.status).toBe(403);
  });

  it('404 — target member not found', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head' })) // requester ok
      .mockResolvedValueOnce(null); // target not found

    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/v1/projects/:id/members/:userId/role ─────────────────────────

describe('PATCH /api/v1/projects/:id/members/:userId/role — ChangeMemberRole', () => {
  it('200 — project head changes a member role', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head' }))  // _requireProjectHead
      .mockResolvedValueOnce(makeProjectMember({ userId: OTHER_USER, role: 'member' })); // target
    mockPrisma.projectMember.update.mockResolvedValue({});

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}/role`)
      .send({ role: 'tl' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Member role updated successfully' });
  });

  it('403 — cannot change project head role via this endpoint', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head' }))
      .mockResolvedValueOnce(makeProjectMember({ userId: OTHER_USER, role: 'project_head' }));

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}/role`)
      .send({ role: 'member' });

    expect(res.status).toBe(403);
  });

  it('403 — non-project-head cannot change roles', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'member' })
    );

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}/role`)
      .send({ role: 'tl' });

    expect(res.status).toBe(403);
  });

  it('404 — target member not found', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head' }))
      .mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}/role`)
      .send({ role: 'member' });

    expect(res.status).toBe(404);
  });

  it('422 — invalid role value rejected', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/members/${OTHER_USER}/role`)
      .send({ role: 'god' });

    expect(res.status).toBe(422);
  });
});

// ─── PATCH /api/v1/projects/:id/project-head ─────────────────────────────────

describe('PATCH /api/v1/projects/:id/project-head — ChangeProjectHead', () => {
  beforeEach(() => {
    mockTransaction();
    mockPrisma.projectMember.update.mockResolvedValue({});
  });

  it('200 — project head transfers ownership to an existing member', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head', userId: USER_ID })) // _requireProjectHead
      .mockResolvedValueOnce(makeProjectMember({ userId: NEW_USER, role: 'member' })); // new head

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/project-head`)
      .send({ userId: NEW_USER });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Project head changed successfully' });
  });

  it('400 — cannot transfer head to yourself', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'project_head', userId: USER_ID })
    );

    // Sending USER_ID (the authenticated user) as new head
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/project-head`)
      .send({ userId: USER_ID });

    expect(res.status).toBe(400);
  });

  it('400 — new head must be an active project member', async () => {
    mockPrisma.projectMember.findFirst
      .mockResolvedValueOnce(makeProjectMember({ role: 'project_head', userId: USER_ID }))
      .mockResolvedValueOnce(null); // new head not found in project

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/project-head`)
      .send({ userId: NEW_USER });

    expect(res.status).toBe(400);
  });

  it('403 — non-project-head cannot transfer ownership', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(
      makeProjectMember({ role: 'member' })
    );

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/project-head`)
      .send({ userId: NEW_USER });

    expect(res.status).toBe(403);
  });

  it('404 — requester not a project member', async () => {
    mockPrisma.projectMember.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/project-head`)
      .send({ userId: NEW_USER });

    expect(res.status).toBe(404);
  });

  it('422 — missing userId rejected by validator', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/project-head`)
      .send({});

    expect(res.status).toBe(422);
  });
});
