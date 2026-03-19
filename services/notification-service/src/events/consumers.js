const { CreateConsumer, SubscribeToTopics, CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const NotificationService = require('../services/notification.service');

let _producer = null;

const getProducer = async () => {
  if (!_producer) {
    _producer = CreateProducer([process.env.KAFKA_BROKER]);
  }

  try {
    return await _producer;
  } catch (err) {
    _producer = null;
    throw err;
  }
};

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
  const maxAttempts = 3;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await NotificationService.DispatchNotification(key, topic, value);
        console.log(`[notification-service] Dispatched notification for event ${key} on topic ${topic}`);
        return;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const backoffMs = 200 * (2 ** (attempt - 1));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  } catch (err) {
    const dlqTopic = process.env.NOTIFICATION_DLQ_TOPIC || 'pms.notification.dlq';

    try {
      const producer = await getProducer();
      await PublishEvent(producer, dlqTopic, key || 'unknown', {
        topic,
        key,
        value,
        error: err.message,
        failedAt: new Date().toISOString(),
      });
    } catch (dlqErr) {
      console.error('[notification-service] Failed to publish to DLQ:', {
        topic,
        key,
        error: dlqErr.message,
        payloadPresent: value !== undefined,
      });
      throw err;
    }

    console.error('[notification-service] Failed to dispatch notification after retries:', {
      topic,
      key,
      error: err.message,
      payloadPresent: value !== undefined,
    });
  }
};

module.exports = { StartConsumers };