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

    return _producerPromise;
};

const PublishCommentAdded = async (comment) => {
    const producer = await _getProducer();
    await PublishEvent(producer, TOPICS.COMMENT_EVENTS, comment.id, {
        type: 'COMMENT_ADDED',
        commentId: comment.id,
        workspaceId: comment.workspaceId,
        entityType: comment.entityType,
        entityId: comment.entityId,
        authorId: comment.authorId,
        parentId: comment.parentId || null,
        mentions: comment.mentions || [],
        timestamp: new Date().toISOString(),
    });
};

const PublishCommentDeleted = async ({ id, entityType, entityId }) => {
    const producer = await _getProducer();
    await PublishEvent(producer, TOPICS.COMMENT_EVENTS, id, {
        type: 'COMMENT_DELETED',
        commentId: id,
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
    });
};

module.exports = { PublishCommentAdded, PublishCommentDeleted };
