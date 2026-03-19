// ─── Phase 1 — Workspace Controller Tests (supertest) ────────────────────────

jest.mock('supertokens-node', () => ({
  init:               jest.fn(),
  getAllCORSHeaders:   () => [],
}));

jest.mock('supertokens-node/framework/express', () => ({
  middleware:    () => (req, res, next) => next(),
  errorHandler:  () => (err, req, res, next) => next(err),
}));

jest.mock('@pms/auth-middleware', () => ({
  InitAuth:          jest.fn(),
  AuthenticateToken: (req, res, next) => {
    req.session = { getUserId: () => 'st-user-123' };
    next();
  },
}));

jest.mock('@pms/validators', () => ({
  ValidateRequest:        () => (req, res, next) => next(),
  CreateWorkspaceSchema:  {},
  UpdateWorkspaceSchema:  {},
  InviteMemberSchema:     {},
  AcceptInviteSchema:     {},
}));

jest.mock('../../services/workspace.service');
jest.mock('../../services/member.service');
jest.mock('../../services/invite.service');

const request          = require('supertest');
const App              = require('../../app');
const WorkspaceService = require('../../services/workspace.service');
const MemberService    = require('../../services/member.service');
const InviteService    = require('../../services/invite.service');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_WS = {
  id:        'ws-1',
  name:      'Acme',
  color:     '#6366f1',
  ownerId:   'st-user-123',
  isActive:  true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_MEMBER = {
  id:          'm-1',
  workspaceId: 'ws-1',
  userId:      'st-user-123',
  role:        'owner',
  isActive:    true,
};

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

describe('POST /api/v1/workspaces', () => {
  it('returns 201 with the created workspace', async () => {
    WorkspaceService.CreateWorkspace.mockResolvedValue(MOCK_WS);

    const res = await request(App)
      .post('/api/v1/workspaces')
      .send({ name: 'Acme', color: '#6366f1' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({ id: 'ws-1' });
    expect(WorkspaceService.CreateWorkspace).toHaveBeenCalledWith('st-user-123', expect.any(Object));
  });
});

describe('GET /api/v1/workspaces', () => {
  it('returns 200 with an array of workspaces', async () => {
    WorkspaceService.GetMyWorkspaces.mockResolvedValue([MOCK_WS]);

    const res = await request(App).get('/api/v1/workspaces');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe('ws-1');
  });
});

describe('GET /api/v1/workspaces/:id', () => {
  it('returns 200 with workspace data', async () => {
    WorkspaceService.GetWorkspaceById.mockResolvedValue(MOCK_WS);

    const res = await request(App).get('/api/v1/workspaces/ws-1');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('ws-1');
  });

  it('returns 404 when workspace not found', async () => {
    const { APIError } = jest.requireActual('@pms/error-handler');
    WorkspaceService.GetWorkspaceById.mockRejectedValue(new APIError(404, 'Workspace not found.'));

    const res = await request(App).get('/api/v1/workspaces/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Workspace not found.');
  });

  it('returns 403 when caller is not a member', async () => {
    const { APIError } = jest.requireActual('@pms/error-handler');
    WorkspaceService.GetWorkspaceById.mockRejectedValue(new APIError(403, 'Access denied.'));

    const res = await request(App).get('/api/v1/workspaces/ws-1');

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/workspaces/:id', () => {
  it('returns 200 with updated workspace', async () => {
    WorkspaceService.UpdateWorkspace.mockResolvedValue({ ...MOCK_WS, name: 'Updated' });

    const res = await request(App)
      .patch('/api/v1/workspaces/ws-1')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });
});

describe('DELETE /api/v1/workspaces/:id', () => {
  it('returns 204 with no body on successful delete', async () => {
    WorkspaceService.DeleteWorkspace.mockResolvedValue(undefined);

    const res = await request(App).delete('/api/v1/workspaces/ws-1');

    expect(res.status).toBe(204);
  });

  it('returns 403 when caller is not the owner', async () => {
    const { APIError } = jest.requireActual('@pms/error-handler');
    WorkspaceService.DeleteWorkspace.mockRejectedValue(
      new APIError(403, 'Only the owner can delete the workspace.')
    );

    const res = await request(App).delete('/api/v1/workspaces/ws-1');

    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/workspaces/:id/transfer', () => {
  it('returns 200 with workspace after ownership transfer', async () => {
    WorkspaceService.TransferOwnership.mockResolvedValue({ ...MOCK_WS, ownerId: 'user-2' });

    const res = await request(App)
      .post('/api/v1/workspaces/ws-1/transfer')
      .send({ newOwnerId: 'user-2' });

    expect(res.status).toBe(200);
    expect(res.body.data.ownerId).toBe('user-2');
  });
});

// ─── Members ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/workspaces/:id/members', () => {
  it('returns 200 with member list', async () => {
    MemberService.GetMembers.mockResolvedValue([MOCK_MEMBER]);

    const res = await request(App).get('/api/v1/workspaces/ws-1/members');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].role).toBe('owner');
  });
});

describe('DELETE /api/v1/workspaces/:id/members/:userId', () => {
  it('returns 204 on successful member removal', async () => {
    MemberService.RemoveMember.mockResolvedValue(undefined);

    const res = await request(App).delete('/api/v1/workspaces/ws-1/members/user-2');

    expect(res.status).toBe(204);
  });
});

describe('PATCH /api/v1/workspaces/:id/members/:userId/role', () => {
  it('returns 200 with updated member', async () => {
    MemberService.ChangeMemberRole.mockResolvedValue({ ...MOCK_MEMBER, role: 'team_lead' });

    const res = await request(App)
      .patch('/api/v1/workspaces/ws-1/members/user-2/role')
      .send({ role: 'team_lead' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('team_lead');
  });
});

// ─── Invites ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/workspaces/accept-invite', () => {
  it('returns 200 with success message on valid token', async () => {
    InviteService.AcceptInvite.mockResolvedValue(undefined);

    const res = await request(App)
      .post('/api/v1/workspaces/accept-invite')
      .send({ token: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Invite accepted.');
  });
});

describe('POST /api/v1/workspaces/:id/invite', () => {
  it('returns 201 with invite data', async () => {
    const invite = {
      id:        'inv-1',
      email:     'bob@test.com',
      role:      'member',
      expiresAt: new Date().toISOString(),
    };
    InviteService.CreateInvite.mockResolvedValue(invite);

    const res = await request(App)
      .post('/api/v1/workspaces/ws-1/invite')
      .send({ email: 'bob@test.com', role: 'member' });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('bob@test.com');
  });
});

describe('DELETE /api/v1/workspaces/:id/invite', () => {
  it('returns 204 on successful invite revocation', async () => {
    InviteService.RevokeInvite.mockResolvedValue(undefined);

    const res = await request(App)
      .delete('/api/v1/workspaces/ws-1/invite')
      .send({ email: 'bob@test.com' });

    expect(res.status).toBe(204);
  });
});
