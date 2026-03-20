const prisma         = require('../config/prisma');
const { APIError }   = require('@pms/error-handler');
const { TASK_STATUS } = require('@pms/constants');
const { PublishTaskCreated } = require('../events/publishers');
const { CreateLogger }       = require('@pms/logger');

const logger = CreateLogger('task-service:recurring-service');

const _parseDate = (value, fieldName) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new APIError(400, `${fieldName} must be a valid date.`);
  }
  return parsed;
};

const CreateTemplate = async (userId, {
  projectId, workspaceId, title, description, priority,
  assignees, intervalDays, startDate, endDate, projectHeadId,
}) => {
  if (!projectId) {
    throw new APIError(400, 'projectId is required.');
  }
  if (!workspaceId) {
    throw new APIError(400, 'workspaceId is required.');
  }
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new APIError(400, 'title is required.');
  }

  if (!Array.isArray(assignees) || assignees.length === 0) {
    throw new APIError(400, 'At least one assignee is required.');
  }
  if (!Number.isInteger(intervalDays) || intervalDays < 1) {
    throw new APIError(400, 'intervalDays must be a positive integer.');
  }

  // First task is due startDate (or intervalDays from now if not provided)
  const firstDue = startDate
    ? _parseDate(startDate, 'startDate')
    : new Date(Date.now() + intervalDays * 86_400_000);

  let parsedEndDate = null;
  if (endDate) {
    parsedEndDate = _parseDate(endDate, 'endDate');
    if (parsedEndDate.getTime() <= firstDue.getTime()) {
      throw new APIError(400, 'endDate must be after startDate.');
    }
  }

  return prisma.recurringTaskTemplate.create({
    data: {
      projectId,
      workspaceId,
      title,
      description:   description || null,
      priority,
      assignees,
      intervalDays,
      nextDueDate:   firstDue,
      endDate:       parsedEndDate,
      projectHeadId: projectHeadId || null,
      createdBy:     userId,
    },
  });
};

const GetTemplates = async (projectId, userId) => {
  if (!projectId) throw new APIError(400, 'projectId query parameter is required.');

  const hasAccess = await prisma.projectMemberRoleCache.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!hasAccess) {
    throw new APIError(403, 'Access denied for project templates.');
  }

  return prisma.recurringTaskTemplate.findMany({
    where:   { projectId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
};

const DeleteTemplate = async (templateId, userId) => {
  const template = await prisma.recurringTaskTemplate.findUnique({ where: { id: templateId } });
  if (!template || !template.isActive) throw new APIError(404, 'Recurring template not found.');
  if (template.createdBy !== userId) throw new APIError(403, 'Only the creator can delete this template.');
  await prisma.recurringTaskTemplate.update({ where: { id: templateId }, data: { isActive: false } });
};

// Called by the scheduler — not exposed via HTTP
const SpawnDueTasks = async () => {
  const now = new Date();

  const templates = await prisma.recurringTaskTemplate.findMany({
    where: {
      isActive:    true,
      nextDueDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  let spawned = 0;
  const createdTasks = [];

  for (const tpl of templates) {
    try {
      const createdTask = await prisma.$transaction(async (tx) => {
        const next = new Date(tpl.nextDueDate);
        next.setDate(next.getDate() + tpl.intervalDays);

        const claim = await tx.recurringTaskTemplate.updateMany({
          where: {
            id: tpl.id,
            isActive: true,
            nextDueDate: tpl.nextDueDate,
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          data: { nextDueDate: next },
        });

        if (claim.count !== 1) {
          return null;
        }

        const task = await tx.task.create({
          data: {
            title:         tpl.title,
            description:   tpl.description,
            priority:      tpl.priority,
            dueDate:       tpl.nextDueDate,
            projectId:     tpl.projectId,
            workspaceId:   tpl.workspaceId,
            sprintId:      null,
            parentTask:    null,
            createdBy:     tpl.createdBy,
            projectHeadId: tpl.projectHeadId,
            status:        TASK_STATUS.PENDING,
          },
        });

        if (Array.isArray(tpl.assignees) && tpl.assignees.length > 0) {
          await tx.taskAssignee.createMany({
            data: tpl.assignees.map((assigneeId) => ({ taskId: task.id, userId: assigneeId })),
            skipDuplicates: true,
          });
        }

        await tx.taskHistory.create({
          data: { taskId: task.id, userId: tpl.createdBy, action: 'created', toValue: TASK_STATUS.PENDING },
        });

        return {
          taskId: task.id,
          projectId: tpl.projectId,
          workspaceId: tpl.workspaceId,
          assignees: tpl.assignees,
        };
      });

      if (!createdTask) continue;

      createdTasks.push(createdTask);

      spawned += 1;
    } catch (err) {
      logger.error(`[SPAWN_DUE_TASKS] Failed for template ${tpl.id}: ${err.message}`);
    }
  }

  for (const task of createdTasks) {
    try {
      await PublishTaskCreated(task.taskId, task.projectId, task.workspaceId, task.assignees);
    } catch (publishErr) {
      logger.error(`[SPAWN_DUE_TASKS_PUBLISH_FAILED] taskId=${task.taskId} error=${publishErr.message}`);
    }
  }

  return spawned;
};

module.exports = { CreateTemplate, GetTemplates, DeleteTemplate, SpawnDueTasks };
