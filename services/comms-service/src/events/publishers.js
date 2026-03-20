const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');

let _producer = null;
const getProducer = async () => {
  if (!_producer) {
    _producer = CreateProducer([process.env.KAFKA_BROKER]);
  }

  const producerPromise = _producer;
  try {
    return await producerPromise;
  } catch (err) {
    if (_producer === producerPromise) {
      _producer = null;
    }
    throw err;
  }
};

const PublishMessageSent = async (chatId, message) => {
  const producer = await getProducer();
  await PublishEvent(producer, TOPICS.COMMS_EVENTS, message.id, {
    type:      'MESSAGE_SENT',
    chatId,
    messageId: message.id,
    senderId:  message.senderId,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { PublishMessageSent };
