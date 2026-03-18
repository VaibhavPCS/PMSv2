const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS }                       = require('@pms/constants');

// ─── Lazy singleton producer ──────────────────────────────────────────────────

let _producer = null;

const _getProducer = async () => {
  if (!_producer) {
    _producer = await CreateProducer([process.env.KAFKA_BROKER || 'localhost:9092']);
  }
  return _producer;
};

// ─── Publishers ───────────────────────────────────────────────────────────────

const PublishWorkspaceCreated = async (workspaceId, ownerId, name) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.WORKSPACE_EVENTS, workspaceId, {
    type:        'WORKSPACE_CREATED',
    workspaceId,
    ownerId,
    name,
    timestamp:   new Date().toISOString(),
  });
};

const PublishWorkspaceDeleted = async (workspaceId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.WORKSPACE_EVENTS, workspaceId, {
    type:        'WORKSPACE_DELETED',
    workspaceId,
    timestamp:   new Date().toISOString(),
  });
};

const PublishMemberAdded = async (workspaceId, userId, role) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.WORKSPACE_EVENTS, workspaceId, {
    type:        'MEMBER_ADDED',
    workspaceId,
    userId,
    role,
    timestamp:   new Date().toISOString(),
  });
};

const PublishMemberRemoved = async (workspaceId, userId) => {
  const producer = await _getProducer();
  await PublishEvent(producer, TOPICS.WORKSPACE_EVENTS, workspaceId, {
    type:        'MEMBER_REMOVED',
    workspaceId,
    userId,
    timestamp:   new Date().toISOString(),
  });
};

module.exports = {
  PublishWorkspaceCreated,
  PublishWorkspaceDeleted,
  PublishMemberAdded,
  PublishMemberRemoved,
};
