// ─── Phase 1 — InviteService Tests ───────────────────────────────────────────

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

jest.mock('../../config/prisma', () => {
  const m = {
    workspaceMember: {
      findFirst: jest.fn(),
      upsert:    jest.fn(),
    },
    workspaceInvite: {
      findFirst:  jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
  };
  m.$transaction = jest.fn((fn) => fn(m));
  return m;
});

jest.mock('../../events/publishers', () => ({
  PublishMemberAdded: jest.fn().mockResolvedValue(undefined),
}));

const prisma         = require('../../config/prisma');
const { PublishMemberAdded } = require('../../events/publishers');
const InviteService  = require('../invite.service');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER_MEMBER  = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner', isActive: true };
const ADMIN_MEMBER  = { workspaceId: 'ws-1', userId: 'user-2', role: 'admin', isActive: true };
const MEMBER_MEMBER = { workspaceId: 'ws-1', userId: 'user-3', role: 'member', isActive: true };

const VALID_INVITE = {
  id:          'inv-1',
  token:       'tok-abc',
  workspaceId: 'ws-1',
  email:       'bob@test.com',
  role:        'member',
  acceptedAt:  null,
  expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

// ─── CreateInvite ─────────────────────────────────────────────────────────────

describe('InviteService.CreateInvite', () => {
  it('throws 403 when requester is a regular member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(MEMBER_MEMBER);

    await expect(InviteService.CreateInvite('ws-1', 'bob@test.com', 'member', 'user-3'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 when trying to invite someone as owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER_MEMBER);
    prisma.workspaceInvite.findFirst.mockResolvedValue(null);

    await expect(InviteService.CreateInvite('ws-1', 'bob@test.com', 'owner', 'user-1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 409 when an active invite already exists for the email', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER_MEMBER);
    prisma.workspaceInvite.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(InviteService.CreateInvite('ws-1', 'bob@test.com', 'member', 'user-1'))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates invite and returns it when requester is admin', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(ADMIN_MEMBER);
    prisma.workspaceInvite.findFirst.mockResolvedValue(null);
    prisma.workspaceInvite.create.mockResolvedValue(VALID_INVITE);

    const result = await InviteService.CreateInvite('ws-1', 'bob@test.com', 'member', 'user-2');

    expect(prisma.workspaceInvite.create).toHaveBeenCalled();
    expect(result).toEqual(VALID_INVITE);
  });
});

// ─── ValidateInvite ───────────────────────────────────────────────────────────

describe('InviteService.ValidateInvite', () => {
  it('throws 404 when token does not exist', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue(null);

    await expect(InviteService.ValidateInvite('bad-token'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Invite not found.' });
  });

  it('throws 410 when invite has already been accepted', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      ...VALID_INVITE,
      acceptedAt: new Date('2026-01-01'),
    });

    await expect(InviteService.ValidateInvite('used-token'))
      .rejects.toMatchObject({ statusCode: 410 });
  });

  it('throws 410 when invite has expired', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      ...VALID_INVITE,
      acceptedAt: null,
      expiresAt:  new Date('2020-01-01'),
    });

    await expect(InviteService.ValidateInvite('expired-token'))
      .rejects.toMatchObject({ statusCode: 410 });
  });

  it('returns the invite when valid', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue(VALID_INVITE);

    const result = await InviteService.ValidateInvite('tok-abc');

    expect(result).toEqual(VALID_INVITE);
  });
});

// ─── AcceptInvite ─────────────────────────────────────────────────────────────

describe('InviteService.AcceptInvite', () => {
  it('runs in a transaction, upserts member, marks invite accepted, publishes event', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue(VALID_INVITE);
    prisma.workspaceMember.upsert.mockResolvedValue({});
    prisma.workspaceInvite.update.mockResolvedValue({});

    await InviteService.AcceptInvite('tok-abc', 'user-99');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.workspaceMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-99' } },
        update: expect.objectContaining({ isActive: true, role: 'member' }),
      })
    );
    expect(prisma.workspaceInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: 'tok-abc' } })
    );
    expect(PublishMemberAdded).toHaveBeenCalledWith('ws-1', 'user-99', 'member');
  });

  it('throws 410 if the token is already used (validated before transaction)', async () => {
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      ...VALID_INVITE,
      acceptedAt: new Date(),
    });

    await expect(InviteService.AcceptInvite('used-tok', 'user-99'))
      .rejects.toMatchObject({ statusCode: 410 });
  });
});

// ─── RevokeInvite ─────────────────────────────────────────────────────────────

describe('InviteService.RevokeInvite', () => {
  it('throws 403 when requester is a regular member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(MEMBER_MEMBER);

    await expect(InviteService.RevokeInvite('ws-1', 'bob@test.com', 'user-3'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when no active invite found for the email', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER_MEMBER);
    prisma.workspaceInvite.findFirst.mockResolvedValue(null);

    await expect(InviteService.RevokeInvite('ws-1', 'nobody@test.com', 'user-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('hard-deletes the invite when requester is the owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER_MEMBER);
    prisma.workspaceInvite.findFirst.mockResolvedValue({ id: 'inv-1' });
    prisma.workspaceInvite.delete.mockResolvedValue({});

    await InviteService.RevokeInvite('ws-1', 'bob@test.com', 'user-1');

    expect(prisma.workspaceInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
  });
});
