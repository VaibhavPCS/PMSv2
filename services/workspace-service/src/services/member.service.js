const prisma                               = require('../config/prisma');
const { APIError }                         = require('@pms/error-handler');
const { ROLES }                            = require('@pms/constants');
const { PublishMemberAdded,
        PublishMemberRemoved }             = require('../events/publishers');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _getActiveMember = async (workspaceId, userId) => {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, isActive: true },
  });
};

const _requireAdminOrOwner = async (workspaceId, requesterId) => {
  const member = await _getActiveMember(workspaceId, requesterId);
  if (!member) throw new APIError(404, 'Workspace not found.');
  if (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN) {
    throw new APIError(403, 'Only owners and admins can perform this action.');
  }
  return member;
};

// ─── Service Functions ────────────────────────────────────────────────────────

const GetMembers = async (workspaceId, requesterId) => {
  const requester = await _getActiveMember(workspaceId, requesterId);
  if (!requester) throw new APIError(403, 'Access denied.');

  return prisma.workspaceMember.findMany({
    where: { workspaceId, isActive: true },
  });
};

const AddMember = async (workspaceId, userId, role) => {
  const member = await prisma.workspaceMember.upsert({
    where:  { workspaceId_userId: { workspaceId, userId } },
    update: { isActive: true, role },
    create: { workspaceId, userId, role },
  });
  await PublishMemberAdded(workspaceId, userId, role);
  return member;
};

const RemoveMember = async (workspaceId, targetUserId, requesterId) => {
  const target = await _getActiveMember(workspaceId, targetUserId);
  if (!target) throw new APIError(404, 'Member not found.');
  if (target.role === ROLES.OWNER) throw new APIError(403, 'Cannot remove the workspace owner.');

  // Self-leave is always allowed; otherwise requester must be owner or admin
  if (requesterId !== targetUserId) {
    await _requireAdminOrOwner(workspaceId, requesterId);
  }

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data:  { isActive: false },
  });
  await PublishMemberRemoved(workspaceId, targetUserId);
};

const ChangeMemberRole = async (workspaceId, targetUserId, newRole, requesterId) => {
  await _requireAdminOrOwner(workspaceId, requesterId);

  const target = await _getActiveMember(workspaceId, targetUserId);
  if (!target) throw new APIError(404, 'Member not found.');
  if (target.role === ROLES.OWNER) {
    throw new APIError(403, 'Cannot change the owner\'s role. Use transfer ownership.');
  }
  if (newRole === ROLES.OWNER) {
    throw new APIError(400, 'Cannot assign owner role directly. Use transfer ownership.');
  }

  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data:  { role: newRole },
  });
};

module.exports = {
  GetMembers,
  AddMember,
  RemoveMember,
  ChangeMemberRole,
};
