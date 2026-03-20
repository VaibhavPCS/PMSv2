const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');

const logger = CreateLogger('comms-service:consumers');
let _io = null;

const SetIo = (io) => {
    _io = io;
};

const _handleTaskEvent = async ({ value }) => {
    if (!value?.type) return;

    switch (value.type) {
        case 'TASK_STATUS_CHANGED':
            if (!value.projectId || !value.taskId || !value.from || !value.to || !value.userId || !value.timestamp) {
                logger.warn(`[TASK_STATUS_CHANGED] Skipping emit due to invalid payload projectId=${value?.projectId} taskId=${value?.taskId}`);
                break;
            }
            if (!_io) {
                logger.warn(`[TASK_STATUS_CHANGED] Socket not initialized, skipping emit projectId=${value.projectId} taskId=${value.taskId}`);
                break;
            }
            _io.to(`project:${value.projectId}`).emit('task-status-changed', {
                taskId: value.taskId,
                projectId: value.projectId,
                from: value.from,
                to: value.to,
                changedBy: value.userId,
                timestamp: value.timestamp,
            });
            logger.info(`[TASK_STATUS_CHANGED] Emitted to project:${value.projectId} taskId=${value.taskId} ${value.from}→${value.to}`);
            break;

        default:
            break;
    }
};

const StartConsumer = async () => {
    try {
        const brokers = (process.env.KAFKA_BROKER || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        const env = String(process.env.NODE_ENV || '').toLowerCase();
        const isLocalEnv = env === 'development' || env === 'test';
        if (brokers.length === 0 && !isLocalEnv) {
            throw new Error('KAFKA_BROKER is required outside development/test environments.');
        }

        const consumer = await CreateConsumer(
            brokers.length > 0 ? brokers : ['localhost:9092'],
            'comms-service'
        );

        await SubscribeToTopics(
            consumer,
            [TOPICS.TASK_EVENTS],
            async (msg) => {
                if (msg.topic === TOPICS.TASK_EVENTS) return _handleTaskEvent(msg);
            }
        );

        logger.info('Kafka consumers started — listening to TASK_EVENTS');
    } catch (err) {
        logger.error(`Failed to start Kafka consumers: ${err.message}`);
        throw err;
    }
};

module.exports = { StartConsumer, SetIo };