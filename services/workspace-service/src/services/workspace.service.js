const prisma                                      = require('../config/prisma');
const { APIError }                                = require('@pms/error-handler');
const { ROLES }                                   = require('@pms/constants');
const { PublishWorkspaceCreated,
        PublishWorkspaceDeleted }                 = require('../events/publishers');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _getActiveMember = async (workspaceId, userId) => {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, userId, isActive: true },
  });
};

// ─── Service Functions ────────────────────────────────────────────────────────

const CreateWorkspace = async (userId, { name, description, color }) => {
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name, description, color, ownerId: userId },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: ws.id, userId, role: ROLES.OWNER },
    });
    return ws;
  });

  await PublishWorkspaceCreated(workspace.id, userId, workspace.name);
  return workspace;
};

const GetMyWorkspaces = async (userId) => {
  return prisma.workspace.findMany({
    where:   { members: { some: { userId, isActive: true } } },
    include: { members: { where: { userId }, select: { role: true } } },
  });
};

const GetWorkspaceById = async (workspaceId, userId) => {
  const workspace = await prisma.workspace.findUnique({
    where:   { id: workspaceId },
    include: { members: { where: { isActive: true } } },
  });

  if (!workspace) throw new APIError(404, 'Workspace not found.');

  const member = workspace.members.find((m) => m.userId === userId);
  if (!member) throw new APIError(403, 'Access denied.');

  return workspace;
};

const UpdateWorkspace = async (workspaceId, userId, { name, description, color }) => {
  const member = await _getActiveMember(workspaceId, userId);
  if (!member) throw new APIError(404, 'Workspace not found.');
  if (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN) {
    throw new APIError(403, 'Only owners and admins can update the workspace.');
  }

  const data = {};
  if (name        !== undefined) data.name        = name;
  if (description !== undefined) data.description = description;
  if (color       !== undefined) data.color       = color;

  return prisma.workspace.update({ where: { id: workspaceId }, data });
};

const DeleteWorkspace = async (workspaceId, userId) => {
  const member = await _getActiveMember(workspaceId, userId);
  if (!member) throw new APIError(404, 'Workspace not found.');
  if (member.role !== ROLES.OWNER) {
    throw new APIError(403, 'Only the owner can delete the workspace.');
  }

  // Cascade in schema auto-deletes WorkspaceMembers and WorkspaceInvites
  await prisma.workspace.delete({ where: { id: workspaceId } });

  await PublishWorkspaceDeleted(workspaceId);
};

const TransferOwnership = async (workspaceId, currentOwnerId, newOwnerId) => {
  if (currentOwnerId === newOwnerId) {
    throw new APIError(400, 'New owner must be a different user.');
  }

  const currentMember = await _getActiveMember(workspaceId, currentOwnerId);
  if (!currentMember) throw new APIError(404, 'Workspace not found.');
  if (currentMember.role !== ROLES.OWNER) {
    throw new APIError(403, 'Only the owner can transfer ownership.');
  }

  const newMember = await _getActiveMember(workspaceId, newOwnerId);
  if (!newMember) throw new APIError(400, 'New owner must be an active member of the workspace.');

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.update({
      where: { id: workspaceId },
      data:  { ownerId: newOwnerId },
    });
    // Demote current owner → admin
    await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: currentOwnerId } },
      data:  { role: ROLES.ADMIN },
    });
    // Promote new owner
    await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
      data:  { role: ROLES.OWNER },
    });
    return ws;
  });

  return workspace;
};

module.exports = {
  CreateWorkspace,
  GetMyWorkspaces,
  GetWorkspaceById,
  UpdateWorkspace,
  DeleteWorkspace,
  TransferOwnership,
};
