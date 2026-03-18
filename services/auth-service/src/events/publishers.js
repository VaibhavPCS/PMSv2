const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS }                       = require('@pms/constants');

let _producer = null;

const _getProducer = async () => {
  if (!_producer) {
    _producer = await CreateProducer([process.env.KAFKA_BROKER || 'localhost:9092']);
  }
  return _producer;
};

const PublishUserRegistered = async (userId, name, email) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.AUTH_EVENTS, userId, {
    type:      'USER_REGISTERED',
    userId,
    name,
    email,
    timestamp: new Date().toISOString(),
  });
};

const PublishUserUpdated = async (userId, updates) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.AUTH_EVENTS, userId, {
    type:      'USER_UPDATED',
    userId,
    ...updates,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { PublishUserRegistered, PublishUserUpdated };
