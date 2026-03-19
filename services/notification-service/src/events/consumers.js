const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const NotificationService = require('../services/notification.service');

const StartConsumers = async () => {
  const broker = process.env.KAFKA_BROKER;

  if (!broker) {
    const error = new Error('KAFKA_BROKER is required to start notification consumers.');
    console.error('[notification-service] Failed to start Kafka consumer:', error.message);
    throw error;
  }

  try {
    const consumer = await CreateConsumer([broker], 'notification-service');
    await SubscribeToTopics(consumer, Object.values(TOPICS), handleEvent);
    console.log('[notification-service] Kafka consumer started and subscribed to topics');
    return consumer;
  } catch (err) {
    console.error('[notification-service] Failed to initialize Kafka consumer:', err.message);
    throw err;
  }
};

const handleEvent = async ({ topic, key, value }) => {
  try {
    await NotificationService.DispatchNotification(key, topic, value);
    console.log(`[notification-service] Dispatched notification for event ${key} on topic ${topic}`);
  } catch (err) {
    console.error(
      `[notification-service] Failed to dispatch notification for event ${key} on topic ${topic}:`,
      { error: err.message, topic, key, value }
    );
  }
};

module.exports = { StartConsumers };