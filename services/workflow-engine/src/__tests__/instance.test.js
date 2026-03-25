'use strict';

/**
 * HTTP integration tests for the workflow-instance routes.
 * /api/v1/workflow-instances
 *
 * Covers: CreateInstance, GetInstance, TransitionStage, GetAvailableTransitions.
 * Also covers: SLA tracking creation/close, auto-assignment, terminal state blocking.
 */

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// Auth state shared via closure (mock-prefixed to survive jest.mock hoisting)
const mockAuthState = { role: 'admin', userId: 'user-test-id' };

jest.mock('supertokens-node', () => ({
  init:             jest.fn(),
  getAllCORSHeaders: jest.fn().mockReturnValue([]),
}));

jest.mock('supertokens-node/framework/express', () => ({
  middleware:   () => (_req, _res, next) => next(),
  errorHandler: () => (err, _req, _res, next) => next(err),
}));

jest.mock('@pms/auth-middleware', () => ({
  InitAuth: jest.fn(),
  AuthenticateToken: (req, _res, next) => {
    req.session = {
      getUserId:             () => mockAuthState.userId,
      getAccessTokenPayload: () => ({ role: mockAuthState.role }),
    };
    req.memberRole = mockAuthState.role;
    next();
  },
  RequireRole: (_roles) => (_req, _res, next) => next(),
}));

jest.mock('@pms/kafka', () => ({
  CreateProducer: jest.fn().mockResolvedValue({}),
  PublishEvent:   jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../config/prisma', () => {
  const txMock = {
    workflowInstance:          { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    workflowTransitionHistory: { create: jest.fn() },
    workflowSLATracking:       { create: jest.fn(), updateMany: jest.fn() },
  };

  return {
    workflowDefinition: { findUnique: jest.fn() },
    workflowInstance:   { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(txMock)),
    __txMock: txMock,
  };
});

jest.mock('../engine/auto-assignment', () => ({
  AutoAssign: jest.fn(),
}));

jest.mock('../config/swagger', () => ({}), { virtual: true });

// ---------------------------------------------------------------------------
// Env bootstrap
// ---------------------------------------------------------------------------
process.env.SUPERTOKENS_CONNECTION_URI = 'http://localhost:3567';
process.env.SUPERTOKENS_API_KEY        = 'test-key';
process.env.API_DOMAIN                 = 'http://localhost:3000';
process.env.WEBSITE_DOMAIN             = 'http://localhost:3001';
process.env.NODE_ENV                   = 'test';

// ---------------------------------------------------------------------------
// Imports (after mocks are in place)
// ---------------------------------------------------------------------------
const request    = require('supertest');
const app        = require('../app');
const prisma     = require('../config/prisma');
const { AutoAssign } = require('../engine/auto-assignment');

// Helper to grab the shared tx mock object
const txMock = () => prisma.__txMock;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const TASK_ID       = 'task-abc-123';
const WORKFLOW_DEF_ID = '660e8400-e29b-41d4-a716-446655440001';
const INSTANCE_ID   = 'inst-xyz-789';

/** The minimal workflow definition embedded in a definition record. */
const buildDefinitionJson = (overrides = {}) => ({
  initialStage:    'todo',
  terminalStages:  ['done'],
  autoAssignRole:  null,
  stages: [
    { id: 'todo',        label: 'Todo'        },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'done',        label: 'Done'        },
  ],
  transitions: [
    {
      from:         'todo',
      to:           'in-progress',
      label:        'Start',
      allowedRoles: ['admin', 'member'],
    },
    {
      from:         'in-progress',
      to:           'done',
      label:        'Complete',
      allowedRoles: ['admin', 'member'],
      requiresNote: true,
    },
  ],
  escalationRules: [],
  ...overrides,
});

const buildDefinitionRecord = (defJsonOverrides = {}) => ({
  id:         WORKFLOW_DEF_ID,
  isActive:   true,
  isBuiltIn:  false,
  definition: buildDefinitionJson(defJsonOverrides),
});

const buildInstance = (overrides = {}) => ({
  id:                   INSTANCE_ID,
  taskId:               TASK_ID,
  workflowDefinitionId: WORKFLOW_DEF_ID,
  currentStage:         'todo',
  isTerminal:           false,
  currentAssigneeId:    null,
  createdBy:            'user-test-id',
  definition:           buildDefinitionRecord(),
  history:              [],
  slaTracking:          [],
  ...overrides,
});

/**
 * Set up the tx mock functions for a successful TransitionStage flow.
 */
const setupTransitionMocks = ({
  instance      = buildInstance({ currentStage: 'todo' }),
  toStage       = 'in-progress',
} = {}) => {
  const tx = txMock();
  tx.workflowInstance.findUnique.mockResolvedValue(instance);
  tx.workflowInstance.update.mockResolvedValue({ ...instance, currentStage: toStage });
  tx.workflowTransitionHistory.create.mockResolvedValue({});
  tx.workflowSLATracking.updateMany.mockResolvedValue({ count: 1 });
  tx.workflowSLATracking.create.mockResolvedValue({});

  const updatedInstance = buildInstance({
    currentStage: toStage,
    currentAssigneeId: null,
  });
  prisma.workflowInstance.findUnique.mockResolvedValue({
    ...updatedInstance,
    history:     [],
    slaTracking: [],
    definition:  buildDefinitionRecord(),
  });
};

// ---------------------------------------------------------------------------
// describe: POST /api/v1/workflow-instances — CreateInstance
// ---------------------------------------------------------------------------

describe('POST /api/v1/workflow-instances — CreateInstance', () => {
  it('201: creates a workflow instance and SLA tracking row', async () => {
    prisma.workflowDefinition.findUnique.mockResolvedValue(buildDefinitionRecord());

    const tx = txMock();
    const createdInstance = buildInstance();
    tx.workflowInstance.create.mockResolvedValue(createdInstance);
    tx.workflowSLATracking.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/workflow-instances')
      .send({ taskId: TASK_ID, workflowDefinitionId: WORKFLOW_DEF_ID });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.taskId).toBe(TASK_ID);

    expect(tx.workflowSLATracking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stage: 'todo' }),
      }),
    );
  });

  it('404: returns 404 when workflow definition does not exist', async () => {
    prisma.workflowDefinition.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/workflow-instances')
      .send({ taskId: TASK_ID, workflowDefinitionId: WORKFLOW_DEF_ID });

    expect(res.status).toBe(404);
  });

  it('404: returns 404 when workflow definition is inactive', async () => {
    // findUnique with { isActive: true } in where returns null when record is inactive
    prisma.workflowDefinition.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/workflow-instances')
      .send({ taskId: TASK_ID, workflowDefinitionId: WORKFLOW_DEF_ID });

    expect(res.status).toBe(404);
  });

  it('500: propagates unexpected database errors', async () => {
    prisma.workflowDefinition.findUnique.mockRejectedValue(new Error('DB failure'));

    const res = await request(app)
      .post('/api/v1/workflow-instances')
      .send({ taskId: TASK_ID, workflowDefinitionId: WORKFLOW_DEF_ID });

    expect(res.status).toBe(500);
  });

  it('201: stores createdBy from session userId', async () => {
    prisma.workflowDefinition.findUnique.mockResolvedValue(buildDefinitionRecord());

    const tx = txMock();
    tx.workflowInstance.create.mockResolvedValue(buildInstance());
    tx.workflowSLATracking.create.mockResolvedValue({});

    await request(app)
      .post('/api/v1/workflow-instances')
      .send({ taskId: TASK_ID, workflowDefinitionId: WORKFLOW_DEF_ID });

    expect(tx.workflowInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdBy: 'user-test-id' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// describe: GET /api/v1/workflow-instances/:taskId — GetInstance
// ---------------------------------------------------------------------------

describe('GET /api/v1/workflow-instances/:taskId — GetInstance', () => {
  it('200: returns the workflow instance with history and SLA tracking', async () => {
    const instance = buildInstance({
      history:     [{ id: 'h1', fromStage: 'todo', toStage: 'in-progress' }],
      slaTracking: [{ id: 's1', stage: 'todo', enteredAt: new Date(), exitedAt: null }],
    });
    prisma.workflowInstance.findUnique.mockResolvedValue(instance);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.taskId).toBe(TASK_ID);
    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.slaTracking).toHaveLength(1);
  });

  it('404: returns 404 when instance does not exist for taskId', async () => {
    prisma.workflowInstance.findUnique.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}`);

    expect(res.status).toBe(404);
  });

  it('200: returns instance with empty history and slaTracking when newly created', async () => {
    prisma.workflowInstance.findUnique.mockResolvedValue(buildInstance());

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.history).toHaveLength(0);
    expect(res.body.data.slaTracking).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// describe: POST /api/v1/workflow-instances/:taskId/transition — TransitionStage
// ---------------------------------------------------------------------------

describe('POST /api/v1/workflow-instances/:taskId/transition — TransitionStage', () => {

  afterEach(() => {
    mockAuthState.role = 'admin';
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('200: transitions from todo to in-progress for an admin', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.currentStage).toBe('in-progress');
    });

    it('200: closes the current SLA tracking row when transitioning', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(txMock().workflowSLATracking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ exitedAt: null }),
          data:  expect.objectContaining({ exitedAt: expect.any(Date) }),
        }),
      );
    });

    it('200: creates a new SLA tracking row for the incoming stage (non-terminal)', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(txMock().workflowSLATracking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stage: 'in-progress' }),
        }),
      );
    });

    it('200: does NOT create a new SLA tracking row when transitioning to a terminal stage', async () => {
      const instance = buildInstance({ currentStage: 'in-progress' });
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);
      tx.workflowInstance.update.mockResolvedValue({ ...instance, currentStage: 'done', isTerminal: true });
      tx.workflowTransitionHistory.create.mockResolvedValue({});
      tx.workflowSLATracking.updateMany.mockResolvedValue({ count: 1 });
      tx.workflowSLATracking.create.mockResolvedValue({});

      prisma.workflowInstance.findUnique.mockResolvedValue(
        buildInstance({ currentStage: 'done', isTerminal: true }),
      );

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'done', note: 'All done' });

      const slaCalls = tx.workflowSLATracking.create.mock.calls;
      const newSlaForDone = slaCalls.filter(
        (call) => call[0]?.data?.stage === 'done',
      );
      expect(newSlaForDone).toHaveLength(0);
    });

    it('200: records a transition history entry', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(txMock().workflowTransitionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStage: 'todo',
            toStage:   'in-progress',
          }),
        }),
      );
    });

    it('200: passes note, attachmentUrl and referenceLink into the history entry', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({
          toStage:       'in-progress',
          note:          'Starting now',
          attachmentUrl: 'https://example.com/file.pdf',
          referenceLink: 'https://github.com/pr/42',
        });

      expect(txMock().workflowTransitionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            note:          'Starting now',
            attachmentUrl: 'https://example.com/file.pdf',
            referenceLink: 'https://github.com/pr/42',
          }),
        }),
      );
    });
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  describe('validation errors', () => {
    it('422: rejects a body missing toStage', async () => {
      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('422: rejects an empty string for toStage', async () => {
      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: '' });

      expect(res.status).toBe(422);
    });

    it('422: rejects a non-URL attachmentUrl', async () => {
      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress', attachmentUrl: 'not-a-url' });

      expect(res.status).toBe(422);
    });

    it('422: rejects a non-URL referenceLink', async () => {
      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress', referenceLink: 'not-a-url' });

      expect(res.status).toBe(422);
    });

    it('422: rejects extra fields in the transition body', async () => {
      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress', unknownField: 'oops' });

      expect(res.status).toBe(422);
    });
  });

  // ── Role-based access (403) ────────────────────────────────────────────────

  describe('role-based access control', () => {
    it('403: returns 403 when the memberRole is not in allowedRoles for the transition', async () => {
      mockAuthState.role = 'qa';

      const instance = buildInstance({ currentStage: 'todo' });
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(403);
    });
  });

  // ── Requires note ─────────────────────────────────────────────────────────

  describe('requiresNote enforcement', () => {
    it('400: returns 400 when transition requires a note but none is provided', async () => {
      const instance = buildInstance({ currentStage: 'in-progress' });
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'done' });

      expect(res.status).toBe(400);
    });

    it('200: succeeds when a required note is provided', async () => {
      const instance = buildInstance({ currentStage: 'in-progress' });
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);
      tx.workflowInstance.update.mockResolvedValue({ ...instance, currentStage: 'done', isTerminal: true });
      tx.workflowTransitionHistory.create.mockResolvedValue({});
      tx.workflowSLATracking.updateMany.mockResolvedValue({ count: 1 });
      tx.workflowSLATracking.create.mockResolvedValue({});

      prisma.workflowInstance.findUnique.mockResolvedValue(
        buildInstance({ currentStage: 'done', isTerminal: true }),
      );

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'done', note: 'All done' });

      expect(res.status).toBe(200);
    });
  });

  // ── Requires attachment ───────────────────────────────────────────────────

  describe('requiresAttachment enforcement', () => {
    it('400: returns 400 when transition requires attachment but none provided', async () => {
      const defJson = buildDefinitionJson({
        transitions: [
          {
            from:               'todo',
            to:                 'in-progress',
            label:              'Start with proof',
            allowedRoles:       ['admin'],
            requiresAttachment: true,
          },
        ],
      });

      const instance = buildInstance({
        currentStage: 'todo',
        definition:   { ...buildDefinitionRecord(), definition: defJson },
      });

      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(400);
    });
  });

  // ── Terminal state blocking ───────────────────────────────────────────────

  describe('terminal state blocking', () => {
    it('400: returns 400 when attempting to transition from a terminal stage', async () => {
      const instance = buildInstance({ currentStage: 'done', isTerminal: true });
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/terminal/i);
    });

    it('400: returns 400 for a second transition on an already-terminal instance', async () => {
      const instance = buildInstance({ currentStage: 'done', isTerminal: true });
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'todo' });

      expect(res.status).toBe(400);
    });
  });

  // ── 404 ───────────────────────────────────────────────────────────────────

  describe('not found', () => {
    it('404: returns 404 when instance does not exist for the given taskId', async () => {
      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(404);
    });
  });

  // ── SLA tracking ─────────────────────────────────────────────────────────

  describe('SLA tracking', () => {
    it('closes the open SLA row with exitedAt set to current time on every transition', async () => {
      const before = Date.now();
      setupTransitionMocks({ toStage: 'in-progress' });

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      const updateCall = txMock().workflowSLATracking.updateMany.mock.calls[0][0];
      expect(updateCall.data.exitedAt).toBeInstanceOf(Date);
      expect(updateCall.data.exitedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('opens a fresh SLA row with the new stage on every non-terminal transition', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      const createCall = txMock().workflowSLATracking.create.mock.calls.find(
        (c) => c[0]?.data?.stage === 'in-progress',
      );
      expect(createCall).toBeDefined();
      expect(createCall[0].data.enteredAt).toBeInstanceOf(Date);
    });
  });

  // ── Auto-assignment ───────────────────────────────────────────────────────

  describe('auto-assignment', () => {
    it('calls AutoAssign and updates currentAssigneeId when autoAssignRole is defined', async () => {
      const defJson = buildDefinitionJson({
        autoAssignRole: 'developer',
        transitions: [
          {
            from:           'todo',
            to:             'in-progress',
            label:          'Start',
            allowedRoles:   ['admin'],
            autoAssignRole: 'developer',
          },
          {
            from:         'in-progress',
            to:           'done',
            label:        'Finish',
            allowedRoles: ['admin'],
            requiresNote: true,
          },
        ],
      });

      const instance = buildInstance({
        currentStage: 'todo',
        definition:   { ...buildDefinitionRecord(), definition: defJson },
      });

      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);
      tx.workflowInstance.update.mockResolvedValue({ ...instance, currentStage: 'in-progress' });
      tx.workflowTransitionHistory.create.mockResolvedValue({});
      tx.workflowSLATracking.updateMany.mockResolvedValue({ count: 1 });
      tx.workflowSLATracking.create.mockResolvedValue({});

      AutoAssign.mockResolvedValue('assigned-user-id');

      prisma.workflowInstance.update.mockResolvedValue({});
      prisma.workflowInstance.findUnique.mockResolvedValue(
        buildInstance({ currentStage: 'in-progress', currentAssigneeId: 'assigned-user-id' }),
      );

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(200);
      expect(AutoAssign).toHaveBeenCalled();
      expect(prisma.workflowInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentAssigneeId: 'assigned-user-id' },
        }),
      );
    });

    it('does NOT call AutoAssign when autoAssignRole is null/absent', async () => {
      setupTransitionMocks({ toStage: 'in-progress' });
      AutoAssign.mockClear();

      await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(AutoAssign).not.toHaveBeenCalled();
    });

    it('continues gracefully when AutoAssign throws an error (non-fatal)', async () => {
      const defJson = buildDefinitionJson({ autoAssignRole: 'developer' });
      const instance = buildInstance({
        currentStage: 'todo',
        definition:   { ...buildDefinitionRecord(), definition: defJson },
      });

      const tx = txMock();
      tx.workflowInstance.findUnique.mockResolvedValue(instance);
      tx.workflowInstance.update.mockResolvedValue({ ...instance, currentStage: 'in-progress' });
      tx.workflowTransitionHistory.create.mockResolvedValue({});
      tx.workflowSLATracking.updateMany.mockResolvedValue({ count: 1 });
      tx.workflowSLATracking.create.mockResolvedValue({});

      AutoAssign.mockRejectedValue(new Error('Assignment service unavailable'));

      prisma.workflowInstance.findUnique.mockResolvedValue(
        buildInstance({ currentStage: 'in-progress' }),
      );

      const res = await request(app)
        .post(`/api/v1/workflow-instances/${TASK_ID}/transition`)
        .send({ toStage: 'in-progress' });

      expect(res.status).toBe(200);
    });
  });
});

// ---------------------------------------------------------------------------
// describe: GET /api/v1/workflow-instances/:taskId/transitions — GetAvailableTransitions
// ---------------------------------------------------------------------------

describe('GET /api/v1/workflow-instances/:taskId/transitions — GetAvailableTransitions', () => {
  afterEach(() => {
    mockAuthState.role = 'admin';
  });

  it('200: returns allowed transitions for the current stage and role', async () => {
    const instance = buildInstance({ currentStage: 'todo' });
    prisma.workflowInstance.findUnique.mockResolvedValue(instance);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}/transitions`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const labels = res.body.data.map((t) => t.label);
    expect(labels).toContain('Start');
  });

  it('200: excludes transitions that require a githubTrigger', async () => {
    const defJson = buildDefinitionJson({
      transitions: [
        {
          from:          'todo',
          to:            'in-progress',
          label:         'Start',
          allowedRoles:  ['admin'],
        },
        {
          from:          'todo',
          to:            'deployed',
          label:         'Auto CI',
          allowedRoles:  ['admin'],
          githubTrigger: 'pr_merged',
        },
      ],
    });

    const instance = buildInstance({
      currentStage: 'todo',
      definition:   { ...buildDefinitionRecord(), definition: defJson },
    });
    prisma.workflowInstance.findUnique.mockResolvedValue(instance);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}/transitions`);

    expect(res.status).toBe(200);
    const labels = res.body.data.map((t) => t.label);
    expect(labels).toContain('Start');
    expect(labels).not.toContain('Auto CI');
  });

  it('200: excludes transitions where the role is not in allowedRoles', async () => {
    mockAuthState.role = 'devops';

    const instance = buildInstance({ currentStage: 'todo' });
    prisma.workflowInstance.findUnique.mockResolvedValue(instance);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}/transitions`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('200: returns empty array when no transitions exist from the current stage', async () => {
    const instance = buildInstance({ currentStage: 'done', isTerminal: true });
    prisma.workflowInstance.findUnique.mockResolvedValue(instance);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}/transitions`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('404: returns 404 when instance does not exist', async () => {
    prisma.workflowInstance.findUnique.mockResolvedValue(null);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}/transitions`);

    expect(res.status).toBe(404);
  });

  it('200: shape of each transition includes to, label, requiresNote, requiresAttachment, requiresReferenceLink', async () => {
    const instance = buildInstance({ currentStage: 'todo' });
    prisma.workflowInstance.findUnique.mockResolvedValue(instance);

    const res = await request(app).get(`/api/v1/workflow-instances/${TASK_ID}/transitions`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const t = res.body.data[0];
    expect(t).toHaveProperty('to');
    expect(t).toHaveProperty('label');
    expect(t).toHaveProperty('requiresNote');
    expect(t).toHaveProperty('requiresAttachment');
    expect(t).toHaveProperty('requiresReferenceLink');
  });
});
