const { Kafka } = require('kafkajs');
const { TOPICS } = require('@pms/constants');
const CreateProducer = async (brokers = ['localhost:9092']) => {
    const kafka = new Kafka({ clientId: 'pms-producer', brokers });
    const producer = kafka.producer();
    await producer.connect();
    return producer;
};
const CreateConsumer = async (brokers = ['localhost:9092'], groupId) => {
    const kafka = new Kafka({ clientId: `pms-${groupId}`, brokers });
    const consumer = kafka.consumer({ groupId });
    await consumer.connect();
    return consumer;
};
const PublishEvent = async (producer, topic, key, value) => {
    await producer.send({
        topic,
        messages: [
            { key, value: JSON.stringify(value) },
        ],
    });
};
const SubscribeToTopics = async (consumer, topics, handler) => {
    await consumer.subscribe({ topics, fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const key = message.key?.toString() ?? null;
            const value = JSON.parse(message.value.toString());
            await handler({ topic, key, value });
        },
    });
};

module.exports = { CreateProducer, CreateConsumer, PublishEvent, SubscribeToTopics, TOPICS };               