const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');

const logger = CreateLogger('task-service:consumers');

const _isNonEmptyString = (input) => typeof input === 'string' && input.trim().length > 0;

const _handleProjectEvent = async ({ value }) => {
  if (!value?.type) return;

  try {
    switch (value.type) {
      case 'PROJECT_DELETED':
        if (!_isNonEmptyString(value.projectId)) {
          logger.error(`[PROJECT_DELETED] Skipping task deactivation due to invalid projectId: ${value?.projectId}`);
          break;
        }
        await prisma.task.updateMany({
          where: { projectId: value.projectId },
          data: { isActive: false },
        });
        logger.info(`[PROJECT_DELETED] Deactivated tasks for project ${value.projectId}`);
        break;

      case 'PROJECT_HEAD_CHANGED':
        if (!_isNonEmptyString(value.projectId) || !_isNonEmptyString(value.newHeadId)) {
          logger.error(`[PROJECT_HEAD_CHANGED] Skipping task update due to invalid payload projectId=${value?.projectId} newHeadId=${value?.newHeadId}`);
          break;
        }
        await prisma.task.updateMany({
          where: { projectId: value.projectId, isActive: true },
          data: { projectHeadId: value.newHeadId },
        });
        logger.info(`[PROJECT_HEAD_CHANGED] Updated projectHeadId to ${value.newHeadId} for tasks in project ${value.projectId}`);
        break;

      case 'PROJECT_DEADLINE_EXTENDED': {
        if (!_isNonEmptyString(value.projectId)) {
          logger.error(`[PROJECT_DEADLINE_EXTENDED] Skipping deadline update due to invalid projectId: ${value?.projectId}`);
          break;
        }

        const newEndDate = new Date(value.newEndDate);
        if (Number.isNaN(newEndDate.getTime())) {
          logger.error(`[PROJECT_DEADLINE_EXTENDED] Skipping deadline update due to invalid newEndDate: ${value?.newEndDate}`);
          break;
        }

        const count = await prisma.$transaction(async (tx) => {
          await tx.projectEndDateCache.upsert({
            where: { projectId: value.projectId },
            update: { endDate: newEndDate },
            create: { projectId: value.projectId, endDate: newEndDate },
          });

          const updateResult = await tx.task.updateMany({
            where: { projectId: value.projectId, isFlagged: true, flagReason: 'SPRINT_EXPIRED' },
            data: { isFlagged: false, flagReason: null },
          });

          return updateResult.count;
        });

        if (count > 0) {
          logger.info(`[PROJECT_DEADLINE_EXTENDED] Unfroze ${count} flagged tasks in project ${value.projectId}`);
        }
        logger.info(`[PROJECT_DEADLINE_EXTENDED] Updated end date cache for project ${value.projectId} → ${value.newEndDate}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error(
      `[PROJECT_EVENT_ERROR] type=${value?.type} projectId=${value?.projectId} newEndDate=${value?.newEndDate} newHeadId=${value?.newHeadId} error=${err.message}`
    );
    throw err;
  }
};

const _handleWorkspaceEvent = async ({ value }) => {
  if (!value?.type) return;

  switch (value.type) {
    case 'WORKSPACE_DELETED':
      if (!_isNonEmptyString(value.workspaceId)) {
        logger.warn(`[WORKSPACE_DELETED] Skipping task deactivation due to invalid workspaceId: ${value?.workspaceId}`);
        break;
      }
      await prisma.task.updateMany({
        where: { workspaceId: value.workspaceId },
        data: { isActive: false },
      });
      logger.info(`[WORKSPACE_DELETED] Deactivated tasks for workspace ${value.workspaceId}`);
      break;

    case 'MEMBER_REMOVED':
      if (!_isNonEmptyString(value.userId) || !_isNonEmptyString(value.workspaceId)) {
        logger.warn(`[MEMBER_REMOVED] Skipping assignee cleanup due to invalid payload userId=${value?.userId} workspaceId=${value?.workspaceId}`);
        break;
      }
      await prisma.taskAssignee.deleteMany({
        where: {
          userId: value.userId,
          task: { workspaceId: value.workspaceId },
        },
      });
      logger.info(`[MEMBER_REMOVED] Removed task assignments for user ${value.userId} in workspace ${value.workspaceId}`);
      break;

    default:
      break;
  }
};

const StartConsumer = async () => {
  try {
    const consumer = await CreateConsumer(
      [process.env.KAFKA_BROKER || 'localhost:9092'],
      'task-service'
    );

    await SubscribeToTopics(
      consumer,
      [TOPICS.PROJECT_EVENTS, TOPICS.WORKSPACE_EVENTS],
      async (msg) => {
        const topic = msg.topic;
        if (topic === TOPICS.PROJECT_EVENTS) return _handleProjectEvent(msg);
        if (topic === TOPICS.WORKSPACE_EVENTS) return _handleWorkspaceEvent(msg);
      }
    );

    logger.info('Kafka consumers started — listening to PROJECT_EVENTS + WORKSPACE_EVENTS');
  } catch (err) {
    logger.error(`Failed to start Kafka consumers: ${err.message}`);
    throw err;
  }
};

module.exports = { StartConsumer };
