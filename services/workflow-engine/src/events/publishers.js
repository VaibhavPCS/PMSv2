const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');

let _producer = null;
const getProducer = async () => {
    if (!_producer) _producer = await CreateProducer([process.env.KAFKA_BROKER]);
    return _producer;
};

const PublishWorkflowTransitioned = async (taskId, fromStage, toStage, performedBy, isTerminal) => {
    const producer = await getProducer();
    await PublishEvent(producer, TOPICS.WORKFLOW_EVENTS, taskId, {
        type: 'WORKFLOW_STAGE_CHANGED',
        taskId,
        fromStage,
        toStage,
        performedBy,
        isTerminal,
        timestamp: new Date().toISOString(),
    });
};

const PublishWorkflowSLABreached = async (taskId, stage, hoursInStage, escalationRule) => {
    const producer = await getProducer();
    await PublishEvent(producer, TOPICS.WORKFLOW_EVENTS, taskId, {
        type: 'WORKFLOW_SLA_BREACHED',
        taskId,
        stage,
        hoursInStage,
        escalationRule,
        timestamp: new Date().toISOString(),
    });
};

module.exports = {
    PublishWorkflowTransitioned,
    PublishWorkflowSLABreached,
};