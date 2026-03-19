const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');

const Logger = CreateLogger('workspace-service:consumers');

const _handleAuthEvent = async ({ value }) => {
  if (!value?.type) return;

  switch (value.type) {
    case 'USER_DEACTIVATED':
      await prisma.workspaceMember.updateMany({
        where: { userId: value.userId },
        data: { isActive: false },
      });
      Logger.info(`[AUTH_EVENTS] Deactivated all memberships for user ${value.userId}`);
      break;

    default:
      break;
  }
};


const StartConsumers = async () => {
  try {
    const consumer = await CreateConsumer(
      [process.env.KAFKA_BROKER || 'localhost:9092'],
      'workspace-service'
    );
    await SubscribeToTopics(consumer, [TOPICS.AUTH_EVENTS], _handleAuthEvent);
    Logger.info('Kafka consumers started — listening to AUTH_EVENTS');
  } catch (err) {
    Logger.error(`Failed to start Kafka consumers: ${err.message}`);
  }
};

module.exports = { StartConsumers };
