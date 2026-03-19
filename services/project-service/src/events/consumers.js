const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');

const logger = CreateLogger('project-service:consumers');

const _handleWorkspaceEvent = async ({ value }) => {
  if (!value?.type) return;

  switch (value.type) {
    case 'WORKSPACE_DELETED':
      await prisma.project.updateMany({
        where: { workspaceId: value.workspaceId },
        data:  { isActive: false },
      });
      logger.info(`[WORKSPACE_DELETED] Marked projects in workspace ${value.workspaceId} as inactive`);
      break;

    case 'MEMBER_REMOVED':
      await prisma.projectMember.updateMany({
        where: { userId: value.userId },
        data:  { isActive: false },
      });
      logger.info(`[MEMBER_REMOVED] Marked project memberships for user ${value.userId} as inactive`);
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
