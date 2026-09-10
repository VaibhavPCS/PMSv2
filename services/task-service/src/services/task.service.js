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
    // Overdue is auto-set by the overdue-scanner. The assignee can recover the
    // task by resuming work or completing it — otherwise it would be frozen.
    [TASK_STATUS.OVERDUE]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED],
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

const RECURRING_INTERVAL_DAYS = { daily: 1, weekly: 7, monthly: 30 };

const CreateTask = async (userId, {
    title, description, priority, startDate, dueDate,
    assignees, projectId, workspaceId, sprintId, parentTask, projectHeadId,
    isRecurring, recurringFrequency, recurringEndDate,
}) => {
    if (!Array.isArray(assignees) || assignees.length === 0) {
        throw new APIError(400, 'At least one assignee is required.');
    }

    const parsedStartDate = startDate ? new Date(startDate) : null;
    if (!parsedStartDate || Number.isNaN(parsedStartDate.getTime())) {
        throw new APIError(400, 'Invalid start date');
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

    const endDateCache = await prisma.projectEndDateCache.findUnique({ where: { projectId } });
    if (endDateCache?.endDate && parsedDueDate > endDateCache.endDate) {
        throw new APIError(400, 'Due date cannot be after project end date.');
    }

    if (sprintId) {
        const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
        if (!sprint || sprint.projectId !== projectId) {
            throw new APIError(400, 'Sprint does not belong to this project.');
        }
        const sprintActive = sprint.status === 'active' || sprint.isActive === true;
        if (!sprintActive) {
            throw new APIError(400, 'Sprint is not active.');
        }
        if (parsedStartDate < sprint.startDate || parsedDueDate > sprint.endDate) {
            throw new APIError(400, 'Task dates must fall within the sprint window.');
        }
    }

    let recurringIntervalDays = null;
    let parsedRecurringEndDate = null;
    if (isRecurring) {
        recurringIntervalDays = RECURRING_INTERVAL_DAYS[recurringFrequency];
        if (!recurringIntervalDays) {
            throw new APIError(400, 'A valid recurringFrequency is required for recurring tasks.');
        }
        parsedRecurringEndDate = recurringEndDate ? new Date(recurringEndDate) : null;
        if (!parsedRecurringEndDate || Number.isNaN(parsedRecurringEndDate.getTime())) {
            throw new APIError(400, 'A valid recurringEndDate is required for recurring tasks.');
        }
    }

    const task = await prisma.$transaction(async (tx) => {
        const created = await tx.task.create({
            data: {
                title, description, priority,
                startDate: parsedStartDate,
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

        if (isRecurring) {
            await tx.recurringTaskTemplate.create({
                data: {
                    projectId, workspaceId, title, description, priority,
                    assignees,
                    intervalDays: recurringIntervalDays,
                    nextDueDate: parsedDueDate,
                    endDate: parsedRecurringEndDate,
                    projectHeadId: projectHeadId || null,
                    createdBy: userId,
                },
            });
        }

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

// List ALL tasks in a workspace (not just the caller's). Used by the dashboard
// /workspace/all-tasks view. Scoped purely by workspaceId + isActive so every
// workspace member sees the same set. status is an optional client filter.
const GetAllWorkspaceTasks = async (workspaceId, query = {}) => {
    const where = { isActive: true, workspaceId };
    if (query.status) where.status = query.status;

    const tasks = await prisma.task.findMany({
        where,
        include: { assignees: true },
        orderBy: { createdAt: 'desc' },
    });

    return tasks;
};

// Approval queue is derived from Task.status (there is NO separate approvalStatus
// column). pending-approval == status IN ('completed','in_review');
// approved == status 'approved'.
const _APPROVAL_PENDING_STATUSES = [TASK_STATUS.COMPLETED, TASK_STATUS.IN_REVIEW];

const GetApprovalStats = async (workspaceId) => {
    const base = { workspaceId, isActive: true };
    const [pendingApproval, approved] = await Promise.all([
        prisma.task.count({ where: { ...base, status: { in: _APPROVAL_PENDING_STATUSES } } }),
        prisma.task.count({ where: { ...base, status: TASK_STATUS.APPROVED } }),
    ]);
    return { pendingApproval, approved };
};

const GetApprovalTasks = async (workspaceId) => {
    const tasks = await prisma.task.findMany({
        where: { workspaceId, isActive: true, status: { in: _APPROVAL_PENDING_STATUSES } },
        include: { assignees: true },
        orderBy: { dueDate: 'asc' },
    });
    return tasks;
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

const UpdateStatus = async (taskId, { status, reason, newEndDate }, userId) => {
    const { updated, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);

        const isAssignee = task.assignees.some(a => a.userId === userId);
        if (!isAssignee) throw new APIError(403, 'Only current assignees can update the task status.');

        _validateTransition(task.status, status);

        if (status === TASK_STATUS.COMPLETED) {
            const openSubtasks = await tx.task.count({
                where: {
                    parentTask: taskId,
                    isActive: true,
                    status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.APPROVED] },
                },
            });
            if (openSubtasks > 0) {
                throw new APIError(400, 'Cannot mark task as done while subtasks are incomplete or unapproved');
            }
        }

        const updateData = { status };
        // Resuming a paused task whose due date has passed — the assignee may supply a
        // fresh due date so the task is not immediately overdue again.
        if (task.status === TASK_STATUS.ON_HOLD && status === TASK_STATUS.IN_PROGRESS && newEndDate) {
            const parsedNewEndDate = new Date(newEndDate);
            if (Number.isNaN(parsedNewEndDate.getTime())) {
                throw new APIError(400, 'Invalid new end date');
            }
            if (parsedNewEndDate < task.startDate) {
                throw new APIError(400, 'New end date cannot be before the task start date.');
            }
            updateData.dueDate = parsedNewEndDate;
        }

        const updatedTask = await tx.task.update({ where: { id: taskId }, data: updateData });
        await tx.taskHistory.create({
            data: { taskId, userId, action: 'status_changed', fromValue: task.status, toValue: status, note: reason },
        });

        return { updated: updatedTask, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, status, userId);
    if (!publishResult.success) {
        logger.warn(`UpdateStatus — DB committed, event publish failed: ${publishResult.reason}`, { taskId });
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
        logger.warn(`ApproveTask — DB committed, event publish failed: ${publishResult.reason}`, { taskId });
    }
    return updated;
};

const RejectTask = async (taskId, { reason, rejectTo, newDueDate }, userId) => {
    _validateUserTarget(rejectTo, 'rejectTo');

    const parsedNewDueDate = new Date(newDueDate);
    if (Number.isNaN(parsedNewDueDate.getTime())) {
        throw new APIError(400, 'Invalid new due date');
    }

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

        if (parsedNewDueDate < task.startDate) {
            throw new APIError(400, 'New due date cannot be before the task start date.');
        }
        const endDateCache = await tx.projectEndDateCache.findUnique({ where: { projectId: task.projectId } });
        if (endDateCache?.endDate && parsedNewDueDate > endDateCache.endDate) {
            throw new APIError(400, 'New due date cannot be after project end date.');
        }

        await tx.task.update({
            where: { id: taskId },
            data: { status: TASK_STATUS.REJECTED, dueDate: parsedNewDueDate, cycleCount: { increment: 1 } },
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
        logger.warn(`RejectTask — DB committed, event publish failed: ${publishResult.reason}`, { taskId });
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
        logger.warn(`HandoverTask — DB committed, event publish failed: ${publishResult.reason}`, { taskId });
    }
    return updated;
};

const ReassignTask = async (taskId, { assigneeId, dueDate }, userId) => {
    _validateUserTarget(assigneeId, 'assigneeId');

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
        throw new APIError(400, 'Invalid due date');
    }

    const { updated, previousStatus, projectId, workspaceId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);
        _requireProjectHead(task, userId);

        const endDateCache = await tx.projectEndDateCache.findUnique({ where: { projectId: task.projectId } });
        if (endDateCache && parsedDueDate.getTime() > new Date(endDateCache.endDate).getTime()) {
            throw new APIError(400, 'Due date cannot be after the project end date.');
        }

        for (const assignee of task.assignees) {
            if (assignee.userId !== assigneeId) {
                await tx.taskAssignee.delete({
                    where: { taskId_userId: { taskId, userId: assignee.userId } },
                });
            }
        }
        await tx.taskAssignee.upsert({
            where: { taskId_userId: { taskId, userId: assigneeId } },
            update: {},
            create: { taskId, userId: assigneeId },
        });

        const updatedTask = await tx.task.update({
            where: { id: taskId },
            data: { dueDate: parsedDueDate, status: TASK_STATUS.PENDING },
        });

        await tx.taskHistory.create({
            data: {
                taskId,
                userId,
                action: 'reassigned',
                fromValue: task.status,
                toValue: TASK_STATUS.PENDING,
                note: `Reassigned to: ${assigneeId}`,
            },
        });

        return {
            updated: updatedTask,
            previousStatus: task.status,
            projectId: task.projectId,
            workspaceId: task.workspaceId,
        };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, TASK_STATUS.PENDING, userId);
    if (!publishResult.success) {
        logger.warn(`ReassignTask — DB committed, status event publish failed: ${publishResult.reason}`, { taskId });
    }
    try {
        await PublishTaskCreated(taskId, projectId, workspaceId, [assigneeId]);
    } catch (err) {
        logger.error(`[REASSIGN_ASSIGNMENT_PUBLISH_FAILED] taskId=${taskId} error=${err.message}`);
    }

    return updated;
};

// General task edit (title/description/priority/dates + optional status).
// Adapts the old monolith updateTask: permission = assignee | creator | project head;
// enforces start <= due and (when extending the due date) the project end-date cap.
const UpdateTask = async (taskId, body, userId) => {
    const { title, description, priority, startDate, dueDate, status } = body;

    const { updated, previousStatus, projectId, statusChanged } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);

        const isAssignee = task.assignees.some(a => a.userId === userId);
        const isCreator = task.createdBy === userId;
        const isProjectHead = task.projectHeadId === userId;
        if (!isAssignee && !isCreator && !isProjectHead) {
            throw new APIError(403, 'You can only update your own tasks.');
        }

        // Resolve the next start/due, falling back to the stored values.
        let nextStart = task.startDate;
        let nextDue = task.dueDate;
        if (startDate !== undefined) {
            const s = new Date(startDate);
            if (Number.isNaN(s.getTime())) throw new APIError(400, 'Invalid start date');
            nextStart = s;
        }
        if (dueDate !== undefined) {
            const d = new Date(dueDate);
            if (Number.isNaN(d.getTime())) throw new APIError(400, 'Invalid due date');
            nextDue = d;
        }
        if (nextStart > nextDue) {
            throw new APIError(400, 'Start date cannot be after due date.');
        }

        // Mirror the old project end-date guard (only when the due date is changing).
        if (dueDate !== undefined) {
            const endDateCache = await tx.projectEndDateCache.findUnique({ where: { projectId: task.projectId } });
            if (endDateCache?.endDate && nextDue > endDateCache.endDate) {
                throw new APIError(400, 'Due date cannot be after project end date.');
            }
        }

        const data = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (priority !== undefined) data.priority = priority;
        if (startDate !== undefined) data.startDate = nextStart;
        if (dueDate !== undefined) data.dueDate = nextDue;

        let didStatusChange = false;
        if (status !== undefined && status !== task.status) {
            _validateTransition(task.status, status);
            data.status = status;
            didStatusChange = true;
        }

        const updatedTask = await tx.task.update({ where: { id: taskId }, data });

        await tx.taskHistory.create({
            data: {
                taskId,
                userId,
                action: didStatusChange ? 'status_changed' : 'updated',
                fromValue: didStatusChange ? task.status : null,
                toValue: didStatusChange ? status : null,
            },
        });

        return {
            updated: updatedTask,
            previousStatus: task.status,
            projectId: task.projectId,
            statusChanged: didStatusChange,
        };
    });

    if (statusChanged) {
        const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, updated.status, userId);
        if (!publishResult.success) {
            logger.warn(`UpdateTask — DB committed, status event publish failed: ${publishResult.reason}`, { taskId });
        }
    }
    return updated;
};

// Put a task ON_HOLD. There are no dedicated SLA/hold-timestamp columns in this
// service's schema, so the pause is recorded as a TaskHistory entry carrying the
// reason (the old monolith stored holdReason + holdStartedAt on the task doc).
const HoldTask = async (taskId, { reason }, userId) => {
    const { updated, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);

        const isAssignee = task.assignees.some(a => a.userId === userId);
        const isProjectHead = task.projectHeadId === userId;
        if (!isAssignee && !isProjectHead) {
            throw new APIError(403, 'You do not have permission to put this task on hold.');
        }

        if (task.status === TASK_STATUS.ON_HOLD) {
            throw new APIError(400, 'Task is already on hold.');
        }
        _validateTransition(task.status, TASK_STATUS.ON_HOLD);

        const updatedTask = await tx.task.update({ where: { id: taskId }, data: { status: TASK_STATUS.ON_HOLD } });
        await tx.taskHistory.create({
            data: {
                taskId,
                userId,
                action: 'on_hold',
                fromValue: task.status,
                toValue: TASK_STATUS.ON_HOLD,
                note: reason,
            },
        });

        return { updated: updatedTask, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, TASK_STATUS.ON_HOLD, userId);
    if (!publishResult.success) {
        logger.warn(`HoldTask — DB committed, event publish failed: ${publishResult.reason}`, { taskId });
    }
    return updated;
};

// Resume an ON_HOLD task back to IN_PROGRESS. Mirrors the old resume logic: if the
// hold caused the due date to elapse, an optional newEndDate may be supplied to
// extend it (validated against start date + project end-date cap).
const ResumeTask = async (taskId, { newEndDate } = {}, userId) => {
    const { updated, previousStatus, projectId } = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
        if (!task || !task.isActive) throw new APIError(404, 'Task not found.');

        await _checkFlagged(task, tx, task.createdBy);

        const isAssignee = task.assignees.some(a => a.userId === userId);
        const isProjectHead = task.projectHeadId === userId;
        if (!isAssignee && !isProjectHead) {
            throw new APIError(403, 'You do not have permission to resume this task.');
        }

        if (task.status !== TASK_STATUS.ON_HOLD) {
            throw new APIError(400, 'Task is not on hold.');
        }
        _validateTransition(task.status, TASK_STATUS.IN_PROGRESS);

        const data = { status: TASK_STATUS.IN_PROGRESS };
        if (newEndDate) {
            const parsed = new Date(newEndDate);
            if (Number.isNaN(parsed.getTime())) throw new APIError(400, 'Invalid new end date');
            if (parsed < task.startDate) throw new APIError(400, 'New end date cannot be before the task start date.');
            const endDateCache = await tx.projectEndDateCache.findUnique({ where: { projectId: task.projectId } });
            if (endDateCache?.endDate && parsed > endDateCache.endDate) {
                throw new APIError(400, 'New end date cannot be after project end date.');
            }
            data.dueDate = parsed;
        }

        const updatedTask = await tx.task.update({ where: { id: taskId }, data });
        await tx.taskHistory.create({
            data: {
                taskId,
                userId,
                action: 'resumed',
                fromValue: task.status,
                toValue: TASK_STATUS.IN_PROGRESS,
            },
        });

        return { updated: updatedTask, previousStatus: task.status, projectId: task.projectId };
    });

    const publishResult = await _publishStatusChangedWithRetry(taskId, projectId, previousStatus, TASK_STATUS.IN_PROGRESS, userId);
    if (!publishResult.success) {
        logger.warn(`ResumeTask — DB committed, event publish failed: ${publishResult.reason}`, { taskId });
    }
    return updated;
};

// All active tasks for a project. The frontend project-detail view consumes
// response.tasks, so the controller wraps this list as { tasks: [...] }.
const GetProjectTasks = async (projectId) => {
    const tasks = await prisma.task.findMany({
        where: { projectId, isActive: true },
        include: { assignees: true },
        orderBy: { createdAt: 'desc' },
    });
    return tasks;
};

// Same as GetProjectTasks but scoped to the caller's own assignments.
const GetUserProjectTasks = async (projectId, userId) => {
    const tasks = await prisma.task.findMany({
        where: { projectId, isActive: true, assignees: { some: { userId } } },
        include: { assignees: true },
        orderBy: { createdAt: 'desc' },
    });
    return tasks;
};

// Assignable members for a project, derived from the local ProjectMemberRoleCache
// read model (populated via PROJECT_MEMBER_ADDED / *_ROLE_CHANGED events). This
// service holds no user name/email, so each member is { _id, userId, role }; the
// frontend hydrates display fields from the project-service /project/:id payload.
const GetProjectMembers = async (projectId) => {
    const members = await prisma.projectMemberRoleCache.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
    });
    return members.map((m) => ({ _id: m.userId, userId: m.userId, role: m.role }));
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
    GetAllWorkspaceTasks,
    GetApprovalStats,
    GetApprovalTasks,
    GetTaskById,
    UpdateTask,
    HoldTask,
    ResumeTask,
    GetProjectTasks,
    GetUserProjectTasks,
    GetProjectMembers,
    UpdateStatus,
    ApproveTask,
    RejectTask,
    HandoverTask,
    ReassignTask,
    DeleteTask,
};
