const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const CommentService = require('../services/comment.service');

const logger = CreateLogger('comment-service:consumers');

const prisma = require('../config/prisma');

const _isNonEmptyString = (input) => typeof input === 'string' && input.trim().length > 0;

// Maintain the local WorkspaceMemberCache read-model used for create-time authz.
const _handleWorkspaceEvent = async ({ value }) => {
    if (!value?.type) return;

    try {
        switch (value.type) {
            case 'MEMBER_ADDED':
            case 'MEMBER_ROLE_CHANGED': {
                const role = value.role || value.newRole;
                if (!_isNonEmptyString(value.workspaceId) || !_isNonEmptyString(value.userId) || !_isNonEmptyString(role)) {
                    logger.warn(`[${value.type}] Skipping workspace member cache update due to invalid payload`);
                    break;
                }
                await prisma.workspaceMemberCache.upsert({
                    where: { workspaceId_userId: { workspaceId: value.workspaceId, userId: value.userId } },
                    update: { role },
                    create: { workspaceId: value.workspaceId, userId: value.userId, role },
                });
                logger.info(`[${value.type}] Cached role=${role} userId=${value.userId} workspaceId=${value.workspaceId}`);
                break;
            }

            case 'MEMBER_REMOVED':
                if (!_isNonEmptyString(value.workspaceId) || !_isNonEmptyString(value.userId)) {
                    logger.warn(`[MEMBER_REMOVED] Skipping due to invalid payload`);
                    break;
                }
                await prisma.workspaceMemberCache.deleteMany({
                    where: { workspaceId: value.workspaceId, userId: value.userId },
                });
                logger.info(`[MEMBER_REMOVED] Cleared cache userId=${value.userId} workspaceId=${value.workspaceId}`);
                break;

            case 'WORKSPACE_DELETED':
                if (!_isNonEmptyString(value.workspaceId)) {
                    logger.warn(`[WORKSPACE_DELETED] Skipping due to invalid workspaceId`);
                    break;
                }
                await prisma.workspaceMemberCache.deleteMany({ where: { workspaceId: value.workspaceId } });
                logger.info(`[WORKSPACE_DELETED] Cleared workspace member cache for ${value.workspaceId}`);
                break;

            default:
                break;
        }
    } catch (err) {
        logger.error(`[WORKSPACE_EVENT_ERROR] type=${value?.type} workspaceId=${value?.workspaceId} userId=${value?.userId} error=${err.message}`);
        throw err;
    }
};

// Maintain the EntityExistsCache read-model and, on deletion, soft-delete the
// entity's comments. Comments live in their own DB, so this keeps them
// consistent and lets CreateComment 404 against deleted targets.
//   entityType — 'task' | 'project' | 'sprint'
//   created/deleted — the event-type strings for this topic
//   idField — the payload field carrying the entity id
const _handleEntityEvent = async ({ value }, { entityType, created, deleted, idField }) => {
    if (!value?.type) return;
    if (value.type !== created && value.type !== deleted) return;

    const entityId = value[idField];
    if (!_isNonEmptyString(entityId)) {
        logger.warn(`[${value.type}] missing ${idField}, skipping ${entityType} event`);
        return;
    }

    if (value.type === created) {
        await prisma.entityExistsCache.upsert({
            where: { entityType_entityId: { entityType, entityId } },
            update: { exists: true },
            create: { entityType, entityId, exists: true },
        });
        logger.info(`[${value.type}] cached exists=true for ${entityType}:${entityId}`);
        return;
    }

    // Deletion: mark the entity gone, then soft-delete its comments.
    await prisma.entityExistsCache.upsert({
        where: { entityType_entityId: { entityType, entityId } },
        update: { exists: false },
        create: { entityType, entityId, exists: false },
    });

    const count = await CommentService.SoftDeleteByEntity(entityType, entityId);
    if (count > 0) {
        logger.info(`[${value.type}] soft-deleted ${count} comments for ${entityType}:${entityId}`);
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
            'comment-service'
        );

        await SubscribeToTopics(
            consumer,
            [TOPICS.TASK_EVENTS, TOPICS.PROJECT_EVENTS, TOPICS.SPRINT_EVENTS, TOPICS.WORKSPACE_EVENTS],
            async (msg) => {
                if (msg.topic === TOPICS.TASK_EVENTS) {
                    return _handleEntityEvent(msg, { entityType: 'task', created: 'TASK_CREATED', deleted: 'TASK_DELETED', idField: 'taskId' });
                }
                if (msg.topic === TOPICS.PROJECT_EVENTS) {
                    return _handleEntityEvent(msg, { entityType: 'project', created: 'PROJECT_CREATED', deleted: 'PROJECT_DELETED', idField: 'projectId' });
                }
                if (msg.topic === TOPICS.SPRINT_EVENTS) {
                    return _handleEntityEvent(msg, { entityType: 'sprint', created: 'SPRINT_CREATED', deleted: 'SPRINT_DELETED', idField: 'sprintId' });
                }
                if (msg.topic === TOPICS.WORKSPACE_EVENTS) return _handleWorkspaceEvent(msg);
            }
        );

        logger.info('Kafka consumers started — listening to TASK_EVENTS + PROJECT_EVENTS + SPRINT_EVENTS + WORKSPACE_EVENTS');
    } catch (err) {
        logger.error(`Failed to start Kafka consumers: ${err.message}`);
    }
};

module.exports = { StartConsumer };
