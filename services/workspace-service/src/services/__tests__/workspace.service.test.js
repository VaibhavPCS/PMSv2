// ─── Phase 1 — WorkspaceService Tests ────────────────────────────────────────

jest.mock('../../config/prisma', () => {
  const m = {
    workspace: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
      count:      jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
  };
  m.$transaction = jest.fn((fn) => fn(m));
  return m;
});

jest.mock('../../events/publishers', () => ({
  PublishWorkspaceCreated: jest.fn().mockResolvedValue(undefined),
  PublishWorkspaceDeleted: jest.fn().mockResolvedValue(undefined),
  PublishMemberAdded:      jest.fn().mockResolvedValue(undefined),
  PublishMemberRemoved:    jest.fn().mockResolvedValue(undefined),
}));

const prisma            = require('../../config/prisma');
const { PublishWorkspaceCreated,
        PublishWorkspaceDeleted } = require('../../events/publishers');
const WorkspaceService  = require('../workspace.service');

// ─── Reset Once queues before every test ──────────────────────────────────────
// clearMocks (jest.config) resets call counts but NOT mockResolvedValueOnce queues.
// Without this, a test that throws early can leave unconsumed Once values that
// bleed into the next test.

beforeEach(() => {
  prisma.workspaceMember.findFirst.mockReset();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_WS = {
  id: 'ws-1', name: 'Acme', description: null,
  color: '#6366f1', ownerId: 'user-1', isActive: true,
  createdAt: new Date(), updatedAt: new Date(),
};

const OWNER  = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner',  isActive: true };
const ADMIN  = { workspaceId: 'ws-1', userId: 'user-2', role: 'admin',  isActive: true };
const MEMBER = { workspaceId: 'ws-1', userId: 'user-3', role: 'member', isActive: true };

// ─── CreateWorkspace ──────────────────────────────────────────────────────────

describe('WorkspaceService.CreateWorkspace', () => {
  it('creates workspace + owner member row in a transaction and publishes event', async () => {
    prisma.workspace.create.mockResolvedValue(MOCK_WS);
    prisma.workspaceMember.create.mockResolvedValue(OWNER);

    const result = await WorkspaceService.CreateWorkspace('user-1', { name: 'Acme', color: '#6366f1' });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Acme', ownerId: 'user-1' }) })
    );
    expect(prisma.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'owner', userId: 'user-1' }) })
    );
    expect(PublishWorkspaceCreated).toHaveBeenCalledWith('ws-1', 'user-1', 'Acme');
    expect(result).toEqual(MOCK_WS);
  });
});

// ─── GetMyWorkspaces ──────────────────────────────────────────────────────────

describe('WorkspaceService.GetMyWorkspaces', () => {
  it('queries workspaces where the user is an active member', async () => {
    prisma.workspace.findMany.mockResolvedValue([MOCK_WS]);
    prisma.workspace.count.mockResolvedValue(1);

    const result = await WorkspaceService.GetMyWorkspaces('user-1');

    expect(prisma.workspace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ members: { some: { userId: 'user-1', isActive: true } } }),
      })
    );
    expect(result).toMatchObject({ data: [MOCK_WS], total: 1, page: 1, limit: 20 });
  });
});

// ─── GetWorkspaceById ─────────────────────────────────────────────────────────

describe('WorkspaceService.GetWorkspaceById', () => {
  it('returns workspace when caller is an active member', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ ...MOCK_WS, members: [OWNER] });

    const result = await WorkspaceService.GetWorkspaceById('ws-1', 'user-1');

    expect(result).toMatchObject({ id: 'ws-1' });
  });

  it('throws 404 when workspace does not exist', async () => {
    prisma.workspace.findUnique.mockResolvedValue(null);

    await expect(WorkspaceService.GetWorkspaceById('ws-1', 'user-1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Workspace not found.' });
  });

  it('throws 403 when caller is not in the member list', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ ...MOCK_WS, members: [] });

    await expect(WorkspaceService.GetWorkspaceById('ws-1', 'user-999'))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── UpdateWorkspace ──────────────────────────────────────────────────────────

describe('WorkspaceService.UpdateWorkspace', () => {
  it('updates successfully when caller is the owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER);
    prisma.workspace.update.mockResolvedValue({ ...MOCK_WS, name: 'New Name' });

    const result = await WorkspaceService.UpdateWorkspace('ws-1', 'user-1', { name: 'New Name' });

    expect(result.name).toBe('New Name');
  });

  it('updates successfully when caller is an admin', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(ADMIN);
    prisma.workspace.update.mockResolvedValue(MOCK_WS);

    await expect(
      WorkspaceService.UpdateWorkspace('ws-1', 'user-2', { color: '#fff' })
    ).resolves.toBeDefined();
  });

  it('throws 403 when caller is a regular member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(MEMBER);

    await expect(WorkspaceService.UpdateWorkspace('ws-1', 'user-3', { name: 'X' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when caller is not a member at all', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(WorkspaceService.UpdateWorkspace('ws-1', 'ghost', { name: 'X' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── DeleteWorkspace ──────────────────────────────────────────────────────────

describe('WorkspaceService.DeleteWorkspace', () => {
  it('hard-deletes and publishes event when caller is the owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER);
    prisma.workspace.delete.mockResolvedValue(MOCK_WS);

    await WorkspaceService.DeleteWorkspace('ws-1', 'user-1');

    expect(prisma.workspace.delete).toHaveBeenCalledWith({ where: { id: 'ws-1' } });
    expect(PublishWorkspaceDeleted).toHaveBeenCalledWith('ws-1');
  });

  it('throws 403 when caller is not the owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(ADMIN);

    await expect(WorkspaceService.DeleteWorkspace('ws-1', 'user-2'))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(prisma.workspace.delete).not.toHaveBeenCalled();
  });
});

// ─── TransferOwnership ────────────────────────────────────────────────────────

describe('WorkspaceService.TransferOwnership', () => {
  it('throws 400 when new owner is the same as current owner', async () => {
    await expect(WorkspaceService.TransferOwnership('ws-1', 'user-1', 'user-1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 403 when caller is not the owner', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(ADMIN)  // caller is admin, not owner
      .mockResolvedValueOnce(MEMBER);

    await expect(WorkspaceService.TransferOwnership('ws-1', 'user-2', 'user-3'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 when new owner is not an active member', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(OWNER)  // current owner check passes
      .mockResolvedValueOnce(null);  // new owner not found

    await expect(WorkspaceService.TransferOwnership('ws-1', 'user-1', 'user-99'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('runs transfer in a transaction and returns updated workspace', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(OWNER)
      .mockResolvedValueOnce(MEMBER);

    const updated = { ...MOCK_WS, ownerId: 'user-3' };
    prisma.workspace.update.mockResolvedValue(updated);
    prisma.workspaceMember.update.mockResolvedValue({});

    const result = await WorkspaceService.TransferOwnership('ws-1', 'user-1', 'user-3');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.ownerId).toBe('user-3');
  });
});
