const { CreateConsumer, SubscribeToTopics } = require('@pms/kafka');
const { TOPICS, ROLES, TASK_STATUS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');

const logger = CreateLogger('project-service:consumers');
const ELEVATED_ROLES = [ROLES.OWNER, ROLES.ADMIN];
const CLOSED_TASK_STATUSES = [TASK_STATUS.COMPLETED, TASK_STATUS.APPROVED];

const _isNonEmptyString = (input) => typeof input === 'string' && input.trim().length > 0;

// Increment a counter on the open-work cache (upsert so a missing row starts at 0).
const _bumpOpenWork = async (projectId, field, delta) => {
  await prisma.projectOpenWorkCache.upsert({
    where: { projectId },
    update: { [field]: { increment: delta } },
    create: { projectId, [field]: delta > 0 ? delta : 0 },
  });
  // Clamp at 0 — defensive against out-of-order / duplicate decrements.
  await prisma.projectOpenWorkCache.updateMany({
    where: { projectId, [field]: { lt: 0 } },
    data: { [field]: 0 },
  });
};

const _handleTaskEvent = async ({ value }) => {
  if (!value?.type) return;

  try {
    switch (value.type) {
      case 'TASK_CREATED': {
        if (!_isNonEmptyString(value.taskId) || !_isNonEmptyString(value.projectId)) {
          logger.warn(`[TASK_CREATED] Skipping open-work update due to invalid payload taskId=${value?.taskId} projectId=${value?.projectId}`);
          break;
        }
        // Track this task as open; only bump if it was not already tracked (idempotent).
        const existing = await prisma.openTaskRef.findUnique({ where: { taskId: value.taskId } });
        if (existing) break;
        await prisma.openTaskRef.create({ data: { taskId: value.taskId, projectId: value.projectId } });
        await _bumpOpenWork(value.projectId, 'openTasks', 1);
        logger.info(`[TASK_CREATED] openTasks++ project=${value.projectId} task=${value.taskId}`);
        break;
      }

      case 'TASK_STATUS_CHANGED': {
        if (!_isNonEmptyString(value.taskId) || !CLOSED_TASK_STATUSES.includes(value.to)) break;
        // Only decrement when the task is currently tracked as open (idempotent).
        const ref = await prisma.openTaskRef.findUnique({ where: { taskId: value.taskId } });
        if (!ref) break;
        await prisma.openTaskRef.delete({ where: { taskId: value.taskId } });
        await _bumpOpenWork(ref.projectId, 'openTasks', -1);
        logger.info(`[TASK_STATUS_CHANGED] openTasks-- project=${ref.projectId} task=${value.taskId} → ${value.to}`);
        break;
      }

      case 'TASK_DELETED': {
        if (!_isNonEmptyString(value.taskId)) break;
        // Payload has no projectId — resolve it from the ref table.
        const ref = await prisma.openTaskRef.findUnique({ where: { taskId: value.taskId } });
        if (!ref) break;
        await prisma.openTaskRef.delete({ where: { taskId: value.taskId } });
        await _bumpOpenWork(ref.projectId, 'openTasks', -1);
        logger.info(`[TASK_DELETED] openTasks-- project=${ref.projectId} task=${value.taskId}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error(`[TASK_EVENT_ERROR] type=${value?.type} taskId=${value?.taskId} error=${err.message}`);
    throw err;
  }
};

const _handleSprintEvent = async ({ value }) => {
  if (!value?.type) return;

  try {
    switch (value.type) {
      case 'SPRINT_CREATED': {
        if (!_isNonEmptyString(value.sprintId) || !_isNonEmptyString(value.projectId)) {
          logger.warn(`[SPRINT_CREATED] Skipping open-work update due to invalid payload sprintId=${value?.sprintId} projectId=${value?.projectId}`);
          break;
        }
        const existing = await prisma.openSprintRef.findUnique({ where: { sprintId: value.sprintId } });
        if (existing) break;
        await prisma.openSprintRef.create({ data: { sprintId: value.sprintId, projectId: value.projectId } });
        await _bumpOpenWork(value.projectId, 'activeSprints', 1);
        logger.info(`[SPRINT_CREATED] activeSprints++ project=${value.projectId} sprint=${value.sprintId}`);
        break;
      }

      case 'SPRINT_DELETED': {
        if (!_isNonEmptyString(value.sprintId)) break;
        // Payload has no projectId — resolve it from the ref table.
        const ref = await prisma.openSprintRef.findUnique({ where: { sprintId: value.sprintId } });
        if (!ref) break;
        await prisma.openSprintRef.delete({ where: { sprintId: value.sprintId } });
        await _bumpOpenWork(ref.projectId, 'activeSprints', -1);
        logger.info(`[SPRINT_DELETED] activeSprints-- project=${ref.projectId} sprint=${value.sprintId}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error(`[SPRINT_EVENT_ERROR] type=${value?.type} sprintId=${value?.sprintId} error=${err.message}`);
    throw err;
  }
};

const _handleWorkspaceEvent = async ({ value }) => {
  if (!value?.type) return;

  switch (value.type) {
    case 'WORKSPACE_DELETED':
      await prisma.project.updateMany({
        where: { workspaceId: value.workspaceId },
        data: { isActive: false },
      });
      await prisma.workspaceRoleCache.deleteMany({
        where: { workspaceId: value.workspaceId },
      });
      logger.info(`[WORKSPACE_DELETED] Deactivated projects in workspace ${value.workspaceId}`);
      break;

    case 'MEMBER_ADDED':
      if (ELEVATED_ROLES.includes(value.role)) {
        await prisma.workspaceRoleCache.upsert({
          where: { userId_workspaceId: { userId: value.userId, workspaceId: value.workspaceId } },
          update: { role: value.role },
          create: { userId: value.userId, workspaceId: value.workspaceId, role: value.role },
        });
        logger.info(`[MEMBER_ADDED] Cached elevated role for user ${value.userId} in workspace ${value.workspaceId}`);
      }
      break;

    case 'MEMBER_ROLE_CHANGED':
      if (ELEVATED_ROLES.includes(value.newRole)) {
        await prisma.workspaceRoleCache.upsert({
          where: { userId_workspaceId: { userId: value.userId, workspaceId: value.workspaceId } },
          update: { role: value.newRole },
          create: { userId: value.userId, workspaceId: value.workspaceId, role: value.newRole },
        });
      } else {
        await prisma.workspaceRoleCache.deleteMany({
          where: { userId: value.userId, workspaceId: value.workspaceId },
        });
      }
      logger.info(`[MEMBER_ROLE_CHANGED] Updated role cache for user ${value.userId} → ${value.newRole}`);
      break;

    case 'MEMBER_REMOVED':
      await prisma.projectMember.updateMany({
        where: { userId: value.userId, project: { workspaceId: value.workspaceId } },
        data: { isActive: false },
      });
      await prisma.workspaceRoleCache.deleteMany({
        where: { userId: value.userId, workspaceId: value.workspaceId },
      });
      logger.info(`[MEMBER_REMOVED] Deactivated memberships + cleared role cache for user ${value.userId}`);
      break;

    default:
      break;
  }
};

const StartConsumer = async () => {
  try {
    const consumer = await CreateConsumer(
      [process.env.KAFKA_BROKER || 'localhost:9092'],
      'project-service'
    );
    await SubscribeToTopics(
      consumer,
      [TOPICS.WORKSPACE_EVENTS, TOPICS.TASK_EVENTS, TOPICS.SPRINT_EVENTS],
      async (msg) => {
        if (msg.topic === TOPICS.WORKSPACE_EVENTS) return _handleWorkspaceEvent(msg);
        if (msg.topic === TOPICS.TASK_EVENTS) return _handleTaskEvent(msg);
        if (msg.topic === TOPICS.SPRINT_EVENTS) return _handleSprintEvent(msg);
      }
    );
    logger.info('Kafka consumers started — listening to WORKSPACE_EVENTS + TASK_EVENTS + SPRINT_EVENTS');
  } catch (err) {
    logger.error(`Failed to start Kafka consumers: ${err.message}`);
  }
};

module.exports = { StartConsumer };
