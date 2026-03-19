const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { ROLES } = require('@pms/constants');
const {
  PublishProjectMemberAdded,
  PublishProjectMemberRemoved,
  PublishProjectMemberRoleChanged,
  PublishProjectHeadChanged,
} = require('../events/publishers');

const _requireProjectHead = async (projectId, requesterId) => {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: requesterId, isActive: true },
  });
  if (!member) {
    throw new APIError(404, 'Project not found or access denied');
  }
  if (member.role !== ROLES.PROJECT_HEAD) {
    throw new APIError(403, 'Only project heads can perform this action');
  }
  return member;
};

const GetMembers = async (projectId, requesterId) => {
  const requesterMember = await prisma.projectMember.findFirst({
    where: { projectId, userId: requesterId, isActive: true },
  });
  if (!requesterMember) {
    throw new APIError(403, 'Access denied');
  }
  return await prisma.projectMember.findMany({
    where: { projectId, isActive: true },
    select: { id: true, userId: true, role: true, joinedAt: true },
  });
};

const AddMember = async (projectId, newUserId, role, requesterId) => {
  await _requireProjectHead(projectId, requesterId);
  if (!['tl', 'trainee', ROLES.MEMBER].includes(role)) {
    throw new APIError(400, 'Invalid role');
  }
  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: newUserId } },
    update: { isActive: true, role },
    create: { projectId, userId: newUserId, role, isActive: true },
  });
  await PublishProjectMemberAdded(projectId, newUserId, role);
  return member;
};

const RemoveMember = async (projectId, targetUserId, requesterId) => {
  const requesterMember = await prisma.projectMember.findFirst({
    where: { projectId, userId: requesterId, isActive: true },
  });
  if (!requesterMember) {
    throw new APIError(403, 'Access denied');
  }
  const targetMember = await prisma.projectMember.findFirst({
    where: { projectId, userId: targetUserId, isActive: true },
  });
  if (!targetMember) {
    throw new APIError(404, 'Target member not found');
  }
  if (targetMember.role === ROLES.PROJECT_HEAD) {
    throw new APIError(403, 'Cannot remove project head');
  }
  if (requesterId !== targetUserId && requesterMember.role !== ROLES.PROJECT_HEAD) {
    throw new APIError(403, 'Only project heads can remove other members');
  }
  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { isActive: false },
  });
  await PublishProjectMemberRemoved(projectId, targetUserId);
};

const ChangeMemberRole = async (projectId, targetUserId, newRole, requesterId) => {
  await _requireProjectHead(projectId, requesterId);
  if (!['tl', 'trainee', ROLES.MEMBER].includes(newRole)) {
    throw new APIError(400, 'Invalid role');
  }
  const targetMember = await prisma.projectMember.findFirst({
    where: { projectId, userId: targetUserId, isActive: true },
  });
  if (!targetMember) {
    throw new APIError(404, 'Target member not found');
  }
  if (targetMember.role === ROLES.PROJECT_HEAD) {
    throw new APIError(403, 'Use ChangeProjectHead to change project head role');
  }
  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role: newRole },
  });
  await PublishProjectMemberRoleChanged(projectId, targetUserId, newRole);
  return updated;
};

const ChangeProjectHead = async (projectId, newHeadUserId, requesterId) => {
  const currentHead = await _requireProjectHead(projectId, requesterId);
  if (newHeadUserId === requesterId) {
    throw new APIError(400, 'You are already the project head');
  }
  const newHeadMember = await prisma.projectMember.findFirst({
    where: { projectId, userId: newHeadUserId, isActive: true },
  });
  if (!newHeadMember) {
    throw new APIError(400, 'New project head must be an active member');
  }
  await prisma.$transaction(async (tx) => {
    await tx.projectMember.update({
      where: { projectId_userId: { projectId, userId: currentHead.userId } },
      data: { role: ROLES.MEMBER },
    });
    await tx.projectMember.update({
      where: { projectId_userId: { projectId, userId: newHeadUserId } },
      data: { role: ROLES.PROJECT_HEAD },
    });
  });
  await PublishProjectHeadChanged(projectId, requesterId, newHeadUserId);
};

module.exports = {
  GetMembers,
  AddMember,
  RemoveMember,
  ChangeMemberRole,
  ChangeProjectHead,
};
