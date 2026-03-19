// ─── Phase 1 — MemberService Tests ───────────────────────────────────────────

jest.mock('../../config/prisma', () => ({
  workspaceMember: {
    findFirst: jest.fn(),
    findMany:  jest.fn(),
    upsert:    jest.fn(),
    update:    jest.fn(),
  },
}));

jest.mock('../../events/publishers', () => ({
  PublishMemberAdded:   jest.fn().mockResolvedValue(undefined),
  PublishMemberRemoved: jest.fn().mockResolvedValue(undefined),
}));

const prisma         = require('../../config/prisma');
const { PublishMemberAdded,
        PublishMemberRemoved } = require('../../events/publishers');
const MemberService  = require('../member.service');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OWNER  = { workspaceId: 'ws-1', userId: 'user-1', role: 'owner',  isActive: true };
const ADMIN  = { workspaceId: 'ws-1', userId: 'user-2', role: 'admin',  isActive: true };
const MEMBER = { workspaceId: 'ws-1', userId: 'user-3', role: 'member', isActive: true };

// ─── GetMembers ───────────────────────────────────────────────────────────────

describe('MemberService.GetMembers', () => {
  it('returns all active members when requester is a member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER);
    prisma.workspaceMember.findMany.mockResolvedValue([OWNER, ADMIN, MEMBER]);

    const result = await MemberService.GetMembers('ws-1', 'user-1');

    expect(result).toHaveLength(3);
  });

  it('throws 403 when requester is not an active member', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(MemberService.GetMembers('ws-1', 'user-999'))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── AddMember ────────────────────────────────────────────────────────────────

describe('MemberService.AddMember', () => {
  it('upserts member row and publishes MEMBER_ADDED event', async () => {
    prisma.workspaceMember.upsert.mockResolvedValue(MEMBER);

    const result = await MemberService.AddMember('ws-1', 'user-3', 'member');

    expect(prisma.workspaceMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { workspaceId_userId: { workspaceId: 'ws-1', userId: 'user-3' } },
        create: expect.objectContaining({ role: 'member' }),
        update: expect.objectContaining({ isActive: true }),
      })
    );
    expect(PublishMemberAdded).toHaveBeenCalledWith('ws-1', 'user-3', 'member');
    expect(result).toEqual(MEMBER);
  });
});

// ─── RemoveMember ─────────────────────────────────────────────────────────────

describe('MemberService.RemoveMember', () => {
  it('allows a member to leave themselves (self-leave)', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(MEMBER);
    prisma.workspaceMember.update.mockResolvedValue({});

    await MemberService.RemoveMember('ws-1', 'user-3', 'user-3');

    expect(prisma.workspaceMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
    expect(PublishMemberRemoved).toHaveBeenCalledWith('ws-1', 'user-3');
  });

  it('allows an admin to remove another member', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(MEMBER)  // target
      .mockResolvedValueOnce(ADMIN);  // requester passes _requireAdminOrOwner
    prisma.workspaceMember.update.mockResolvedValue({});

    await MemberService.RemoveMember('ws-1', 'user-3', 'user-2');

    expect(prisma.workspaceMember.update).toHaveBeenCalled();
  });

  it('throws 403 when trying to remove the workspace owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(OWNER);

    await expect(MemberService.RemoveMember('ws-1', 'user-1', 'user-2'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 when a regular member tries to remove another member', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(MEMBER)   // target found, not owner
      .mockResolvedValueOnce(MEMBER);  // requester is also a regular member

    await expect(MemberService.RemoveMember('ws-1', 'user-3', 'user-99'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 404 when the target member does not exist', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await expect(MemberService.RemoveMember('ws-1', 'ghost', 'user-1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── ChangeMemberRole ─────────────────────────────────────────────────────────

describe('MemberService.ChangeMemberRole', () => {
  it('updates role when requester is the owner and target is a regular member', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(OWNER)   // requester
      .mockResolvedValueOnce(MEMBER); // target
    const updated = { ...MEMBER, role: 'team_lead' };
    prisma.workspaceMember.update.mockResolvedValue(updated);

    const result = await MemberService.ChangeMemberRole('ws-1', 'user-3', 'team_lead', 'user-1');

    expect(prisma.workspaceMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'team_lead' } })
    );
    expect(result.role).toBe('team_lead');
  });

  it('throws 403 when target is the workspace owner', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(ADMIN)  // requester (admin is allowed to call ChangeMemberRole)
      .mockResolvedValueOnce(OWNER); // but target is the owner

    await expect(MemberService.ChangeMemberRole('ws-1', 'user-1', 'admin', 'user-2'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 400 when trying to assign the owner role directly', async () => {
    prisma.workspaceMember.findFirst
      .mockResolvedValueOnce(OWNER)   // requester
      .mockResolvedValueOnce(MEMBER); // target

    await expect(MemberService.ChangeMemberRole('ws-1', 'user-3', 'owner', 'user-1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 403 when requester is not admin or owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(MEMBER); // requester is regular member

    await expect(MemberService.ChangeMemberRole('ws-1', 'user-3', 'team_lead', 'user-99'))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});
