const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS }                       = require('@pms/constants');

let _producer = null;

const _getProducer = async () => {
  if (!_producer) {
    _producer = await CreateProducer([process.env.KAFKA_BROKER || 'localhost:9092']);
  }
  return _producer;
};

const PublishProjectCreated = async (projectId, createdBy, workspaceId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:        'PROJECT_CREATED',
    projectId,
    createdBy,
    workspaceId,
    timestamp:   new Date().toISOString(),
  });
};

const PublishProjectUpdated = async (projectId, updatedBy) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:      'PROJECT_UPDATED',
    projectId,
    updatedBy,
    timestamp: new Date().toISOString(),
  });
};

const PublishProjectDeleted = async (projectId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:      'PROJECT_DELETED',
    projectId,
    timestamp: new Date().toISOString(),
  });
};

const PublishProjectMemberAdded = async (projectId, userId, role) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:      'PROJECT_MEMBER_ADDED',
    projectId,
    userId,
    role,
    timestamp: new Date().toISOString(),
  });
};

const PublishProjectMemberRemoved = async (projectId, userId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:      'PROJECT_MEMBER_REMOVED',
    projectId,
    userId,
    timestamp: new Date().toISOString(),
  });
};

const PublishProjectMemberRoleChanged = async (projectId, userId, newRole) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:      'PROJECT_MEMBER_ROLE_CHANGED',
    projectId,
    userId,
    newRole,
    timestamp: new Date().toISOString(),
  });
};

const PublishProjectHeadChanged = async (projectId, oldHeadId, newHeadId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.PROJECT_EVENTS, projectId, {
    type:      'PROJECT_HEAD_CHANGED',
    projectId,
    oldHeadId,
    newHeadId,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  PublishProjectCreated,
  PublishProjectUpdated,
  PublishProjectDeleted,
  PublishProjectMemberAdded,
  PublishProjectMemberRemoved,
  PublishProjectMemberRoleChanged,
  PublishProjectHeadChanged,
};
