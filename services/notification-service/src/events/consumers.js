const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const NotificationService = require('../services/notification.service');

const StartConsumers = async () => {
    const consumer = await CreateConsumer(
        [process.env.KAFKA_BROKER],
        'notification-service',
    );

    await SubscribeToTopics(
        consumer,
        [
            TOPICS.AUTH_EVENTS,
            TOPICS.WORKSPACE_EVENTS,
            TOPICS.PROJECT_EVENTS,
            TOPICS.TASK_EVENTS,
            TOPICS.SPRINT_EVENTS,
        ],
        handleEvent,
    );
};

const handleEvent = async ({ topic, key, value }) => {
    await NotificationService.DispatchNotification(key, topic, value);
};

module.exports = { StartConsumers };