const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');

const logger = CreateLogger('meeting-service:consumers');

const _isNonEmptyString = (input) => typeof input === 'string' && input.trim().length > 0;

// Maintain the local WorkspaceMemberCache read-model used for create-time authz.
const _handleWorkspaceEvent = async ({ value }) => {
  if (!value?.type) return;

  try {
    switch (value.type) {
      case 'MEMBER_ADDED':
      case 'MEMBER_ROLE_CHANGED': {
        const role = value.role || value.newRole;
        if (!_isNonEmptyString(value.workspaceId) || !_isNonEmptyString(value.userId) || !_isNonEmptyString(role)) {
          logger.warn(`[${value.type}] Skipping workspace member cache update due to invalid payload`);
          break;
        }
        await prisma.workspaceMemberCache.upsert({
          where: { workspaceId_userId: { workspaceId: value.workspaceId, userId: value.userId } },
          update: { role },
          create: { workspaceId: value.workspaceId, userId: value.userId, role },
        });
        logger.info(`[${value.type}] Cached role=${role} userId=${value.userId} workspaceId=${value.workspaceId}`);
        break;
      }

      case 'MEMBER_REMOVED':
        if (!_isNonEmptyString(value.workspaceId) || !_isNonEmptyString(value.userId)) {
          logger.warn(`[MEMBER_REMOVED] Skipping due to invalid payload`);
          break;
        }
        await prisma.workspaceMemberCache.deleteMany({
          where: { workspaceId: value.workspaceId, userId: value.userId },
        });
        logger.info(`[MEMBER_REMOVED] Cleared cache userId=${value.userId} workspaceId=${value.workspaceId}`);
        break;

      case 'WORKSPACE_DELETED':
        if (!_isNonEmptyString(value.workspaceId)) {
          logger.warn(`[WORKSPACE_DELETED] Skipping due to invalid workspaceId`);
          break;
        }
        await prisma.workspaceMemberCache.deleteMany({ where: { workspaceId: value.workspaceId } });
        logger.info(`[WORKSPACE_DELETED] Cleared workspace member cache for ${value.workspaceId}`);
        break;

      default:
        break;
    }
  } catch (err) {
    logger.error(`[WORKSPACE_EVENT_ERROR] type=${value?.type} workspaceId=${value?.workspaceId} userId=${value?.userId} error=${err.message}`);
    throw err;
  }
};

// Maintain the local ProjectWorkspaceCache read-model used to verify a
// meeting's projectId belongs to its workspace at create time.
const _handleProjectEvent = async ({ value }) => {
  if (!value?.type) return;

  try {
    switch (value.type) {
      case 'PROJECT_CREATED':
        if (!_isNonEmptyString(value.projectId) || !_isNonEmptyString(value.workspaceId)) {
          logger.warn(`[PROJECT_CREATED] Skipping project workspace cache update due to invalid payload`);
          break;
        }
        await prisma.projectWorkspaceCache.upsert({
          where: { projectId: value.projectId },
          update: { workspaceId: value.workspaceId },
          create: { projectId: value.projectId, workspaceId: value.workspaceId },
        });
        logger.info(`[PROJECT_CREATED] Cached projectId=${value.projectId} workspaceId=${value.workspaceId}`);
        break;

      case 'PROJECT_DELETED':
        if (!_isNonEmptyString(value.projectId)) {
          logger.warn(`[PROJECT_DELETED] Skipping due to invalid projectId`);
          break;
        }
        await prisma.projectWorkspaceCache.deleteMany({ where: { projectId: value.projectId } });
        logger.info(`[PROJECT_DELETED] Cleared project workspace cache for ${value.projectId}`);
        break;

      default:
        break;
    }
  } catch (err) {
    logger.error(`[PROJECT_EVENT_ERROR] type=${value?.type} projectId=${value?.projectId} workspaceId=${value?.workspaceId} error=${err.message}`);
    throw err;
  }
};

const StartConsumer = async () => {
  try {
    const consumer = await CreateConsumer(
      [process.env.KAFKA_BROKER || 'localhost:9092'],
      'meeting-service'
    );

    await SubscribeToTopics(
      consumer,
      [TOPICS.WORKSPACE_EVENTS, TOPICS.PROJECT_EVENTS],
      async (msg) => {
        if (msg.topic === TOPICS.WORKSPACE_EVENTS) return _handleWorkspaceEvent(msg);
        if (msg.topic === TOPICS.PROJECT_EVENTS) return _handleProjectEvent(msg);
      }
    );

    logger.info('Kafka consumers started — listening to WORKSPACE_EVENTS + PROJECT_EVENTS');
  } catch (err) {
    logger.error(`Failed to start Kafka consumers: ${err.message}`);
  }
};

module.exports = { StartConsumer };
