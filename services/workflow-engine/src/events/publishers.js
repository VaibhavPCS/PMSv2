const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');

const logger = CreateLogger('workflow-engine:publishers');

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

const PublishWorkflowAutoAssignFailed = async ({
    taskId,
    instanceId,
    toStage,
    autoAssignRole,
    triggeredBy,
    attempt,
    failedAt,
    errorMessage,
    errorStack,
}) => {
    const producer = await getProducer();
    const timestamp = new Date().toISOString();
    const eventKey = instanceId || taskId;

    if (errorStack) {
        logger.error('[WORKFLOW_AUTO_ASSIGN_FAILED]', {
            taskId,
            instanceId,
            toStage,
            autoAssignRole,
            attempt,
            errorMessage,
            errorStack,
        });
    }

    await PublishEvent(producer, TOPICS.WORKFLOW_EVENTS, eventKey, {
        type: 'WORKFLOW_AUTO_ASSIGN_FAILED',
        taskId,
        instanceId,
        toStage,
        autoAssignRole,
        triggeredBy,
        attempt,
        failedAt,
        errorMessage,
        timestamp,
    });

    const retryTopic = process.env.WORKFLOW_ASSIGNMENT_RETRY_TOPIC || 'pms.workflow.assignment.retry';
    await PublishEvent(producer, retryTopic, eventKey, {
        type: 'WORKFLOW_AUTO_ASSIGN_RETRY_REQUESTED',
        taskId,
        instanceId,
        toStage,
        autoAssignRole,
        triggeredBy,
        attempt,
        failedAt,
        errorMessage,
        timestamp,
    });
};

module.exports = {
    PublishWorkflowTransitioned,
    PublishWorkflowSLABreached,
    PublishWorkflowAutoAssignFailed,
};