const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS, ROLES } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');

const logger = CreateLogger('project-service:consumers');
const ELEVATED_ROLES = [ROLES.OWNER, ROLES.ADMIN];

const _handleWorkspaceEvent = async ({ value }) => {
  if (!value?.type) return;

  switch (value.type) {
    case 'WORKSPACE_DELETED':
      await prisma.project.updateMany({
        where: { workspaceId: value.workspaceId },
        data: { isActive: false },
      });
      await prisma.workspaceRoleCache.deleteMany({
        where: { workspaceId: value.workspaceId },
      });
      logger.info(`[WORKSPACE_DELETED] Deactivated projects in workspace ${value.workspaceId}`);
      break;

    case 'MEMBER_ADDED':
      if (ELEVATED_ROLES.includes(value.role)) {
        await prisma.workspaceRoleCache.upsert({
          where: { userId_workspaceId: { userId: value.userId, workspaceId: value.workspaceId } },
          update: { role: value.role },
          create: { userId: value.userId, workspaceId: value.workspaceId, role: value.role },
        });
        logger.info(`[MEMBER_ADDED] Cached elevated role for user ${value.userId} in workspace ${value.workspaceId}`);
      }
      break;

    case 'MEMBER_ROLE_CHANGED':
      if (ELEVATED_ROLES.includes(value.newRole)) {
        await prisma.workspaceRoleCache.upsert({
          where: { userId_workspaceId: { userId: value.userId, workspaceId: value.workspaceId } },
          update: { role: value.newRole },
          create: { userId: value.userId, workspaceId: value.workspaceId, role: value.newRole },
        });
      } else {
        await prisma.workspaceRoleCache.deleteMany({
          where: { userId: value.userId, workspaceId: value.workspaceId },
        });
      }
      logger.info(`[MEMBER_ROLE_CHANGED] Updated role cache for user ${value.userId} → ${value.newRole}`);
      break;

    case 'MEMBER_REMOVED':
      await prisma.projectMember.updateMany({
        where: { userId: value.userId, project: { workspaceId: value.workspaceId } },
        data: { isActive: false },
      });
      await prisma.workspaceRoleCache.deleteMany({
        where: { userId: value.userId, workspaceId: value.workspaceId },
      });
      logger.info(`[MEMBER_REMOVED] Deactivated memberships + cleared role cache for user ${value.userId}`);
      break;

    default:
      break;
  }
};

const StartConsumer = async () => {
  try {
    const consumer = await CreateConsumer(
      [process.env.KAFKA_BROKER || 'localhost:9092'],
      'project-service'
    );
    await SubscribeToTopics(consumer, [TOPICS.WORKSPACE_EVENTS], _handleWorkspaceEvent);
    logger.info('Kafka consumers started — listening to WORKSPACE_EVENTS');
  } catch (err) {
    logger.error(`Failed to start Kafka consumers: ${err.message}`);
  }
};

module.exports = { StartConsumer };
