'use strict';

/**
 * HTTP integration tests for the workflow-definition routes.
 * /api/v1/workflows  — CRUD for workflow definitions.
 *
 * All external dependencies (prisma, auth-middleware, kafka, supertokens,
 * InitAuth) are mocked so tests run fully in-process with no network I/O.
 */

// ---------------------------------------------------------------------------
// Module-level mocks — must come before any require() that loads the app.
// ---------------------------------------------------------------------------

// ── Auth state shared via closure (mock-prefixed to survive jest.mock hoisting)
const mockAuthState = { role: 'admin', userId: 'user-test-id' };

// ── SuperTokens / auth bootstrap ──────────────────────────────────────────
jest.mock('supertokens-node', () => ({
  init:              jest.fn(),
  getAllCORSHeaders:  jest.fn().mockReturnValue([]),
}));

jest.mock('supertokens-node/framework/express', () => ({
  middleware:    () => (_req, _res, next) => next(),
  errorHandler:  () => (err, _req, _res, next) => next(err),
}));

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, _res, next) => {
    req.session = {
      getUserId:             () => mockAuthState.userId,
      getAccessTokenPayload: () => ({ role: mockAuthState.role }),
    };
    next();
  },
  RequireRole: (_roles) => (_req, _res, next) => next(),
}));

// ── Kafka ──────────────────────────────────────────────────────────────────
jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({}),
  PublishEvent:   jest.fn().mockResolvedValue(undefined),
}));

// ── Prisma ────────────────────────────────────────────────────────────────
jest.mock('../config/prisma', () => ({
  workflowDefinition: {
    create:     jest.fn(),
    findMany:   jest.fn(),
    findFirst:  jest.fn(),
    update:     jest.fn(),
  },
  workflowInstance: {
    count: jest.fn(),
  },
}));

// ── Swagger (only loaded in non-production) ────────────────────────────────
jest.mock('../config/swagger', () => ({}), { virtual: true });

// ---------------------------------------------------------------------------
// Env vars required by app.js before Init
// ---------------------------------------------------------------------------
process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY        = 'test-key';
process.env.API_DOMAIN                 = 'http://localhost:3000';
process.env.WEBSITE_DOMAIN             = 'http://localhost:3001';
process.env.NODE_ENV                   = 'test';

// ---------------------------------------------------------------------------
// Real imports
// ---------------------------------------------------------------------------
const request = require('supertest');
const app     = require('../app');
const prisma  = require('../config/prisma');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const WORKSPACE_ID  = '550e8400-e29b-41d4-a716-446655440000';
const WORKFLOW_ID   = '660e8400-e29b-41d4-a716-446655440001';

const buildWorkflow = (overrides = {}) => ({
  id:          WORKFLOW_ID,
  workspaceId: WORKSPACE_ID,
  name:        'Test Workflow',
  description: 'A test workflow',
  isBuiltIn:   false,
  isActive:    true,
  createdBy:   'user-test-id',
  definition:  {
    initialStage:   'todo',
    terminalStages: ['done'],
    stages:         [{ id: 'todo', label: 'Todo' }, { id: 'done', label: 'Done' }],
    transitions:    [{ from: 'todo', to: 'done', label: 'Finish', allowedRoles: ['admin'] }],
  },
  ...overrides,
});

const validCreateBody = () => ({
  workspaceId: WORKSPACE_ID,
  name:        'Test Workflow',
  description: 'A test workflow',
  definition:  {
    initialStage:   'todo',
    terminalStages: ['done'],
    stages:         [{ id: 'todo', label: 'Todo' }, { id: 'done', label: 'Done' }],
    transitions:    [{ from: 'todo', to: 'done', label: 'Finish', allowedRoles: ['admin'] }],
  },
});

// ---------------------------------------------------------------------------
// describe: POST /api/v1/workflows
// ---------------------------------------------------------------------------

describe('POST /api/v1/workflows — CreateWorkflow', () => {
  it('201: creates a workflow definition and returns it', async () => {
    prisma.workflowDefinition.create.mockResolvedValue(buildWorkflow());

    const res = await request(app)
      .post('/api/v1/workflows')
      .send(validCreateBody());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.name).toBe('Test Workflow');
    expect(prisma.workflowDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: WORKSPACE_ID, createdBy: 'user-test-id' }),
      }),
    );
  });

  it('422: rejects a body missing workspaceId', async () => {
    const body = validCreateBody();
    delete body.workspaceId;

    const res = await request(app)
      .post('/api/v1/workflows')
      .send(body);

    expect(res.status).toBe(422);
  });

  it('422: rejects a name shorter than 2 characters', async () => {
    const res = await request(app)
      .post('/api/v1/workflows')
      .send({ ...validCreateBody(), name: 'x' });

    expect(res.status).toBe(422);
  });

  it('422: rejects an invalid UUID for workspaceId', async () => {
    const res = await request(app)
      .post('/api/v1/workflows')
      .send({ ...validCreateBody(), workspaceId: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });

  it('422: rejects extra/unknown fields (strict schema)', async () => {
    const res = await request(app)
      .post('/api/v1/workflows')
      .send({ ...validCreateBody(), surpriseField: 'oops' });

    expect(res.status).toBe(422);
  });

  it('500: propagates unexpected prisma errors', async () => {
    prisma.workflowDefinition.create.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .post('/api/v1/workflows')
      .send(validCreateBody());

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// describe: GET /api/v1/workflows
// ---------------------------------------------------------------------------

describe('GET /api/v1/workflows — GetWorkflows', () => {
  it('200: returns a list of active workflow definitions', async () => {
    prisma.workflowDefinition.findMany.mockResolvedValue([buildWorkflow()]);

    const res = await request(app)
      .get('/api/v1/workflows')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(prisma.workflowDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WORKSPACE_ID, isActive: true } }),
    );
  });

  it('200: returns an empty array when no workflows exist', async () => {
    prisma.workflowDefinition.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/workflows')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('400: returns 400 when workspaceId query param is absent', async () => {
    const res = await request(app).get('/api/v1/workflows');

    expect(res.status).toBe(400);
  });

  it('400: returns 400 when workspaceId is an empty string', async () => {
    const res = await request(app)
      .get('/api/v1/workflows')
      .query({ workspaceId: '   ' });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// describe: GET /api/v1/workflows/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/workflows/:id — GetWorkflowById', () => {
  it('200: returns the workflow when it exists', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow());

    const res = await request(app).get(`/api/v1/workflows/${WORKFLOW_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(WORKFLOW_ID);
  });

  it('404: returns 404 when the workflow does not exist', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/workflows/${WORKFLOW_ID}`);

    expect(res.status).toBe(404);
  });

  it('422: returns 422 when id is not a valid UUID', async () => {
    const res = await request(app).get('/api/v1/workflows/not-a-uuid');

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// describe: PATCH /api/v1/workflows/:id — UpdateWorkflow
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/workflows/:id — UpdateWorkflow', () => {
  it('200: updates the workflow name', async () => {
    const updated = buildWorkflow({ name: 'Renamed Workflow' });
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow());
    prisma.workflowDefinition.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({ name: 'Renamed Workflow' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Workflow');
  });

  it('200: updates description only', async () => {
    const updated = buildWorkflow({ description: 'New description' });
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow());
    prisma.workflowDefinition.update.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({ description: 'New description' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('New description');
  });

  it('403: returns 403 when trying to update a built-in workflow', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow({ isBuiltIn: true }));

    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('404: returns 404 when the workflow does not exist', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({ name: 'Ghost Update' });

    expect(res.status).toBe(404);
  });

  it('422: rejects a name shorter than 2 characters', async () => {
    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({ name: 'X' });

    expect(res.status).toBe(422);
  });

  it('422: rejects extra fields in the body', async () => {
    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({ name: 'Valid Name', hackerField: true });

    expect(res.status).toBe(422);
  });

  it('422: returns 422 when id param is not a valid UUID', async () => {
    const res = await request(app)
      .patch('/api/v1/workflows/not-a-uuid')
      .send({ name: 'Valid Name' });

    expect(res.status).toBe(422);
  });

  it('200: returns existing record unchanged when no updatable fields are provided', async () => {
    const existing = buildWorkflow();
    prisma.workflowDefinition.findFirst
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);

    const res = await request(app)
      .patch(`/api/v1/workflows/${WORKFLOW_ID}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(existing);
  });
});

// ---------------------------------------------------------------------------
// describe: DELETE /api/v1/workflows/:id — DeleteWorkflow
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/workflows/:id — DeleteWorkflow', () => {
  it('200: soft-deletes (sets isActive=false) a non-built-in, unused workflow', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow());
    prisma.workflowInstance.count.mockResolvedValue(0);
    prisma.workflowDefinition.update.mockResolvedValue(buildWorkflow({ isActive: false }));

    const res = await request(app).delete(`/api/v1/workflows/${WORKFLOW_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(prisma.workflowDefinition.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it('403: returns 403 when trying to delete a built-in workflow', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow({ isBuiltIn: true }));

    const res = await request(app).delete(`/api/v1/workflows/${WORKFLOW_ID}`);

    expect(res.status).toBe(403);
  });

  it('404: returns 404 when workflow does not exist', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(null);

    const res = await request(app).delete(`/api/v1/workflows/${WORKFLOW_ID}`);

    expect(res.status).toBe(404);
  });

  it('409: returns 409 when the workflow is in use by active tasks', async () => {
    prisma.workflowDefinition.findFirst.mockResolvedValue(buildWorkflow());
    prisma.workflowInstance.count.mockResolvedValue(3);

    const res = await request(app).delete(`/api/v1/workflows/${WORKFLOW_ID}`);

    expect(res.status).toBe(409);
  });

  it('422: returns 422 when id param is not a valid UUID', async () => {
    const res = await request(app).delete('/api/v1/workflows/not-a-uuid');

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// describe: _assertWorkflowReadAccess — non-admin role guard
// ---------------------------------------------------------------------------

describe('Read-access role guard', () => {
  afterEach(() => {
    mockAuthState.role = 'admin';
  });

  it('403: GET /workflows returns 403 for a role that is neither admin nor owner', async () => {
    mockAuthState.role = 'member';

    prisma.workflowDefinition.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/workflows')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(403);
  });

  it('200: GET /workflows succeeds for admin role', async () => {
    mockAuthState.role = 'admin';
    prisma.workflowDefinition.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/workflows')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
  });

  it('200: GET /workflows succeeds for owner role', async () => {
    mockAuthState.role = 'owner';
    prisma.workflowDefinition.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/workflows')
      .query({ workspaceId: WORKSPACE_ID });

    expect(res.status).toBe(200);
  });
});
