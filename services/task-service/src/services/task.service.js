const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { TASK_STATUS } = require('@pms/constants');
const { CreateLogger } = require('@pms/logger');
const { parsePagination } = require('@pms/validators');
const {
    PublishTaskCreated,
    PublishTaskStatusChanged,
    PublishTaskStatusChangedDLQ,
    PublishTaskDeleted,
} = require('../events/publishers');

const logger = CreateLogger('task-service:task-service');
const FLAG_REASONS = {
    SPRINT_EXPIRED: 'SPRINT_EXPIRED',
};

const ALLOWED_TRANSITIONS = {
    [TASK_STATUS.PENDING]: [TASK_STATUS.IN_PROGRESS],
    [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.ON_HOLD],
    [TASK_STATUS.ON_HOLD]: [TASK_STATUS.IN_PROGRESS],
    [TASK_STATUS.IN_REVIEW]: [TASK_STATUS.COMPLETED],
    [TASK_STATUS.REJECTED]: [TASK_STATUS.IN_PROGRESS],
};

const _validateTransition = (current, next) => {
    if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
        throw new APIError(400, `Cannot transition from '${current}' to '${next}'.`);
    }
};

const _checkFlagged = async (task, tx, systemUserId) => {
    if (task.isFlagged) {
        throw new APIError(423, 'Task is frozen — sprint end date has expired. Extend the sprint first.');
    }
    if (task.sprintId) {
        const sprint = await tx.sprint.findUnique({ where: { id: task.sprintId } });
        if (sprint && sprint.endDate < new Date()) {
            await tx.task.update({
                where: { id: task.id },
                data: { isFlagged: true, flagReason: FLAG_REASONS.SPRINT_EXPIRED },
            });
            await tx.taskHistory.create({
                data: {
                    taskId: task.id,
                    userId: systemUserId || task.createdBy,
                    action: 'flagged',
                    note: 'Sprint end date expired',
                },
            });
            throw new APIError(423, 'Task is frozen — sprint end date has expired. Extend the sprint first.');
        }
    }
};

const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(1, Number(ms) || 1)));

const _publishStatusChangedWithRetry = async (taskId, projectId, from, to, userId) => {
    const delays = [0, 150, 400];
    let lastError;

    for (let attempt = 0; attempt < delays.length; attempt += 1) {
        try {
            if (delays[attempt] > 0) await _sleep(delays[attempt]);
            await PublishTaskStatusChanged(taskId, projectId, from, to, userId);
            return { success: true, taskId };
        } catch (err) {
            lastError = err;
            logger.error(`[TASK_STATUS_PUBLISH_FAILED] attempt=${attempt + 1} taskId=${taskId} projectId=${projectId} from=${from} to=${to} userId=${userId} error=${err.message}`);
        }
    }

    logger.error(`[TASK_STATUS_PUBLISH_GIVEUP] taskId=${taskId} projectId=${projectId} from=${from} to=${to} userId=${userId} error=${lastError?.message}`);
    try {
        await PublishTaskStatusChangedDLQ({
            taskId,
            projectId,
            from,
            to,
            userId,
            error: lastError?.message,
        });
    } catch (dlqErr) {
        logger.error(`[TASK_STATUS_DLQ_FAILED] taskId=${taskId} projectId=${projectId} error=${dlqErr.message}`);
    }

    return { success: false, taskId, reason: lastError?.message || 'publish-failed' };
};

const _isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const _UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const _validateUserTarget = (value, fieldName) => {
    if (!_isNonEmptyString(value) || !_UUID_REGEX.test(value)) {
        throw new APIError(400, `Invalid ${fieldName}`);
    }
};

const _requireProjectHead = (task, userId) => {
    if (task.projectHeadId !== userId) {
        throw new APIError(403, 'Only the project head can perform this action.');
    }
};

const CreateTask = async (userId, {
    title, description, priority, dueDate,
    assignees, projectId, workspaceId, sprintId, parentTask, projectHeadId,
}) => {
    if (!Array.isArray(assignees) || assignees.length === 0) {
        throw new APIError(400, 'At least one assignee is required.');
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (!parsedDueDate || Number.isNaN(parsedDueDate.getTime())) {
        throw new APIError(400, 'Invalid due date');
    }

    const memberCache = await prisma.projectMemberRoleCache.findUnique({
        where: { projectId_userId: { projectId, userId } },
    });
    if (memberCache?.role === 'tl' && !parentTask) {
        throw new APIError(403, 'Team Leaders can only create subtasks. Provide a parentTask to proceed.');
    }

    const task = await prisma.$transaction(async (tx) => {
        const created = await tx.task.create({
            data: {
                title, description, priority,
                dueDate: parsedDueDate,
                projectId, workspaceId,
                sprintId: sprintId || null,
                parentTask: parentTask || null,
                createdBy: userId,
                projectHeadId: projectHeadId || null,
                status: TASK_STATUS.PENDING,
            },
        });

        for (const assigneeId of assignees) {
            await tx.taskAssignee.create({ data: { taskId: created.id, userId: assigneeId } });
        }

        await tx.taskHistory.create({
            data: { taskId: created.id, userId, action: 'created', toValue: TASK_STATUS.PENDING },
        });

        return created;
    });

    await PublishTaskCreated(task.id, projectId, workspaceId, assignees);
    return task;
};

const GetTasks = async (query, userId) => {
    const { projectId, sprintId, status } = query;
    const where = {
        isActive: true,
        assignees: { some: { userId } },
    };
    if (projectId) where.projectId = projectId;
    if (sprintId) where.sprintId = sprintId;
    if (status) where.status = status;

    const { safePage, safeLimit } = parsePagination(query);

    const [tasks, total] = await Promise.all([
        prisma.task.findMany({
            where,
            include: { assignees: true },
            orderBy: { createdAt: 'desc' },
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        }),
        prisma.task.count({ where }),
    ]);

    return { data: tasks, total, page: safePage, limit: safeLimit };
};

const GetTaskById = async (taskId, userId) => {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            assignees: true,
            // Cap history at 100 entries: full history is unbounded for long-lived tasks
            // and loading thousands of rows per request is a major performance risk at scale.
            // Older entries remain in the DB and can be retrieved via a dedicated history endpoint if needed.
            history: { orderBy: { createdAt: 'asc' }, take: 100 },
        },
    });

    if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

    const isAssignee = task.assignees.some(a => a.userId === userId);
    const isCreator = task.createdBy === userId;
    const isProjectHead = task.projectHeadId === userId;

    if (!isAssignee && !isCreator && !isProjectHead) {
        throw new APIError(403, 'Access denied.');
    }

    return task;
};

const UpdateStatus = async (taskId, { status, reason }, userId) => {
    const { updated, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);

        const isAssignee = task.assignees.some(a => a.userId === userId);
        if (!isAssignee) throw new APIError(403, 'Only current assignees can update the task status.');

        _validateTransition(task.status, status);

        const updatedTask = await tx.task.update({ where: { id: taskId }, data: { status } });
        await tx.taskHistory.create({
            data: { taskId, userId, action: 'status_changed', fromValue: task.status, toValue: status, note: reason },
        });

        return { updated: updatedTask, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, status, userId);
    if (!publishResult.success) {
        throw new APIError(502, `Task status updated but event publish failed: ${publishResult.reason}`);
    }
    return updated;
};

const ApproveTask = async (taskId, { comment }, userId) => {
    const { updated, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);
        _requireProjectHead(task, userId);

        if (task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.IN_REVIEW) {
            throw new APIError(400, `Task must be 'completed' or 'in_review' to approve. Current: '${task.status}'.`);
        }

        const updatedTask = await tx.task.update({ where: { id: taskId }, data: { status: TASK_STATUS.APPROVED } });
        await tx.taskHistory.create({
            data: { taskId, userId, action: 'approved', fromValue: task.status, toValue: TASK_STATUS.APPROVED, note: comment },
        });

        return { updated: updatedTask, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, TASK_STATUS.APPROVED, userId);
    if (!publishResult.success) {
        throw new APIError(502, `Task approval updated but event publish failed: ${publishResult.reason}`);
    }
    return updated;
};

const RejectTask = async (taskId, { reason, rejectTo }, userId) => {
    _validateUserTarget(rejectTo, 'rejectTo');

    const { updatedTask, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);
        _requireProjectHead(task, userId);

        if (task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.IN_REVIEW) {
            throw new APIError(400, `Task must be 'completed' or 'in_review' to reject. Current: '${task.status}'.`);
        }

        const knownParticipants = new Set([
            task.createdBy,
            task.projectHeadId,
            ...task.assignees.map((a) => a.userId),
        ].filter(Boolean));
        if (!knownParticipants.has(rejectTo)) {
            throw new APIError(400, 'Invalid rejectTo');
        }

        await tx.task.update({
            where: { id: taskId },
            data: { status: TASK_STATUS.REJECTED, cycleCount: { increment: 1 } },
        });

        await tx.taskAssignee.upsert({
            where: { taskId_userId: { taskId, userId: rejectTo } },
            update: {},
            create: { taskId, userId: rejectTo },
        });
        await tx.taskHistory.create({
            data: {
                taskId,
                userId,
                action: 'rejected',
                fromValue: task.status,
                toValue: TASK_STATUS.REJECTED,
                note: `${reason} | Assigned to: ${rejectTo}`,
            },
        });

        const refreshed = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        return { updatedTask: refreshed, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, TASK_STATUS.REJECTED, userId);
    if (!publishResult.success) {
        throw new APIError(502, `Task rejection updated but event publish failed: ${publishResult.reason}`);
    }

    return updatedTask;
};

const HandoverTask = async (taskId, { notes, handoverTo }, userId) => {
    _validateUserTarget(handoverTo, 'handoverTo');

    const { updated, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);
        _requireProjectHead(task, userId);

        if (task.status !== TASK_STATUS.COMPLETED) {
            throw new APIError(400, `Task must be 'completed' to hand over for review. Current: '${task.status}'.`);
        }

        const updatedTask = await tx.task.update({ where: { id: taskId }, data: { status: TASK_STATUS.IN_REVIEW } });
        await tx.taskAssignee.upsert({
            where: { taskId_userId: { taskId, userId: handoverTo } },
            update: {},
            create: { taskId, userId: handoverTo },
        });
        await tx.taskHistory.create({
            data: {
                taskId,
                userId,
                action: 'in_review',
                fromValue: task.status,
                toValue: TASK_STATUS.IN_REVIEW,
                note: `${notes} | Reviewer: ${handoverTo}`,
            },
        });

        return { updated: updatedTask, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, TASK_STATUS.IN_REVIEW, userId);
    if (!publishResult.success) {
        throw new APIError(502, `Task handover updated but event publish failed: ${publishResult.reason}`);
    }
    return updated;
};

const DeleteTask = async (taskId, userId) => {
    await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');
        if (task.createdBy !== userId) throw new APIError(403, 'Only the task creator can delete this task.');

        await tx.task.update({ where: { id: taskId }, data: { isActive: false } });
    });

    await PublishTaskDeleted(taskId);
};

module.exports = {
    CreateTask,
    GetTasks,
    GetTaskById,
    UpdateStatus,
    ApproveTask,
    RejectTask,
    HandoverTask,
    DeleteTask,
};
