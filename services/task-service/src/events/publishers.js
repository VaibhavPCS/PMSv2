const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');

let _producer = null;
let _producerPromise = null;

const _getProducer = async () => {
  if (_producer) return _producer;
  if (_producerPromise) return _producerPromise;

  _producerPromise = CreateProducer([process.env.KAFKA_BROKER || 'localhost:9092'])
    .then((producer) => {
      _producer = producer;
      _producerPromise = null;
      return producer;
    })
    .catch((err) => {
      _producerPromise = null;
      throw err;
    });

  if (!_producer) {
    _producer = await _producerPromise;
  }

  return _producer;
};

const PublishTaskCreated = async (taskId, projectId, workspaceId, assignees) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.TASK_EVENTS, taskId, {
    type: 'TASK_CREATED',
    taskId,
    projectId,
    workspaceId,
    assignees,
    timestamp: new Date().toISOString(),
  });
};

const PublishTaskStatusChanged = async (taskId, from, to, userId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.TASK_EVENTS, taskId, {
    type: 'TASK_STATUS_CHANGED',
    taskId,
    from,
    to,
    userId,
    timestamp: new Date().toISOString(),
  });
};

const PublishTaskDeleted = async (taskId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.TASK_EVENTS, taskId, {
    type: 'TASK_DELETED',
    taskId,
    timestamp: new Date().toISOString(),
  });
};

const PublishSprintCreated = async (sprintId, projectId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.SPRINT_EVENTS, sprintId, {
    type: 'SPRINT_CREATED',
    sprintId,
    projectId,
    timestamp: new Date().toISOString(),
  });
};

const PublishSprintDeleted = async (sprintId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.SPRINT_EVENTS, sprintId, {
    type: 'SPRINT_DELETED',
    sprintId,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  PublishTaskCreated,
  PublishTaskStatusChanged,
  PublishTaskDeleted,
  PublishSprintCreated,
  PublishSprintDeleted,
};
