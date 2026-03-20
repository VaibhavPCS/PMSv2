const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { CreateLogger } = require('@pms/logger');
const { PublishSprintCreated, PublishSprintDeleted } = require('../events/publishers');

const logger = CreateLogger('task-service:sprint-service');
const FLAG_REASONS = {
    SPRINT_EXPIRED: 'SPRINT_EXPIRED',
};

const _fetchSprint = async (sprintId) => {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || !sprint.isActive) throw new APIError(404, 'Sprint not found.');
    return sprint;
};

const _validateDates = (startDate, endDate) => {
    if (new Date(startDate) >= new Date(endDate)) {
        throw new APIError(400, 'Sprint start date must be before end date.');
    }
};

const _checkProjectEndDate = async (projectId, sprintEndDate) => {
    const cache = await prisma.projectEndDateCache.findUnique({ where: { projectId } });
    if (cache && new Date(sprintEndDate) > cache.endDate) {
        const limit = cache.endDate.toISOString().split('T')[0];
        throw new APIError(400, `Sprint end date cannot exceed the project end date (${limit}). Extend the project deadline first.`);
    }
};

const _requireAuthenticatedUser = (userId) => {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
        throw new APIError(401, 'Authentication required.');
    }
};

const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(1, Number(ms) || 1)));

const _publishWithRetry = async (publishFn, context) => {
    const delays = [0, 150, 400];
    let lastError;

    for (let attempt = 0; attempt < delays.length; attempt += 1) {
        try {
            if (delays[attempt] > 0) await _sleep(delays[attempt]);
            await publishFn();
            return;
        } catch (err) {
            lastError = err;
            logger.error(`[SPRINT_EVENT_PUBLISH_FAILED] attempt=${attempt + 1} context=${context} error=${err.message}`);
        }
    }

    throw lastError;
};

const _scheduleSprintCreatedRetry = (sprintId, projectId) => {
    setTimeout(async () => {
        try {
            await _publishWithRetry(
                () => PublishSprintCreated(sprintId, projectId),
                `SPRINT_CREATED_RETRY sprintId=${sprintId} projectId=${projectId}`
            );
            logger.info(`[SPRINT_CREATED_RETRY_SUCCESS] sprintId=${sprintId} projectId=${projectId}`);
        } catch (retryErr) {
            logger.error(`[SPRINT_CREATED_RETRY_FAILED] sprintId=${sprintId} projectId=${projectId} error=${retryErr.message}`);
        }
    }, 1000);
};

const CreateSprint = async (userId, { name, goal, projectId, startDate, endDate }) => {
    _requireAuthenticatedUser(userId);
    _validateDates(startDate, endDate);
    await _checkProjectEndDate(projectId, endDate);

    const sprint = await prisma.sprint.create({
        data: {
            name,
            goal: goal || null,
            projectId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        },
    });

    try {
        await _publishWithRetry(
            () => PublishSprintCreated(sprint.id, projectId),
            `SPRINT_CREATED sprintId=${sprint.id} projectId=${projectId}`
        );
    } catch (err) {
        logger.error(`[SPRINT_CREATED_PUBLISH_DEFERRED] sprintId=${sprint.id} projectId=${projectId} error=${err.message}`);
        _scheduleSprintCreatedRetry(sprint.id, projectId);
    }

    return sprint;
};

const GetSprints = async (projectId) => {
    if (!projectId) throw new APIError(400, 'projectId query parameter is required.');
    return prisma.sprint.findMany({
        where: { projectId, isActive: true },
        orderBy: { startDate: 'asc' },
    });
};

const GetSprintById = async (sprintId) => {
    const sprint = await _fetchSprint(sprintId);
    const tasks = await prisma.task.findMany({
        where: { sprintId, isActive: true },
        include: { assignees: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return { ...sprint, tasks };
};

const UpdateSprint = async (sprintId, { name, goal, startDate, endDate }, userId) => {
    _requireAuthenticatedUser(userId);
    const sprint = await _fetchSprint(sprintId);

    const newStart = startDate ? new Date(startDate) : sprint.startDate;
    const newEnd = endDate ? new Date(endDate) : sprint.endDate;

    _validateDates(newStart, newEnd);
    await _checkProjectEndDate(sprint.projectId, newEnd);
    if (endDate && new Date(endDate) > sprint.endDate) {
        await prisma.task.updateMany({
            where: { sprintId, isFlagged: true, flagReason: FLAG_REASONS.SPRINT_EXPIRED },
            data: { isFlagged: false, flagReason: null },
        });
    }

    return prisma.sprint.update({
        where: { id: sprintId },
        data: {
            ...(name !== undefined && { name }),
            ...(goal !== undefined && { goal }),
            ...(startDate !== undefined && { startDate: newStart }),
            ...(endDate !== undefined && { endDate: newEnd }),
        },
    });
};

const DeleteSprint = async (sprintId, userId) => {
    _requireAuthenticatedUser(userId);
    await _fetchSprint(sprintId);

    const [, deletedSprint] = await prisma.$transaction([
        prisma.task.updateMany({
            where: { sprintId },
            data: { sprintId: null },
        }),
        prisma.sprint.update({
            where: { id: sprintId },
            data: { isActive: false },
        }),
    ]);

    try {
        await _publishWithRetry(
            () => PublishSprintDeleted(sprintId),
            `SPRINT_DELETED sprintId=${sprintId}`
        );
    } catch (err) {
        logger.error(`[SPRINT_DELETED_PUBLISH_DEFERRED] sprintId=${sprintId} error=${err.message}`);
    }

    return deletedSprint;
};

const StartSprint = async (sprintId, userId) => {
    _requireAuthenticatedUser(userId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
        const sprint = await tx.sprint.findUnique({ where: { id: sprintId } });
        if (!sprint || !sprint.isActive) {
            throw new APIError(404, 'Sprint not found.');
        }
        if (sprint.status !== 'planned') {
            throw new APIError(400, `Sprint is already '${sprint.status}'. Only planned sprints can be started.`);
        }

        const updated = await tx.sprint.updateMany({
            where: { id: sprintId, isActive: true, status: 'planned' },
            data: { status: 'active', startedAt: now },
        });

        if (updated.count !== 1) {
            throw new APIError(400, 'Sprint can no longer be started. Please refresh and retry.');
        }

        return tx.sprint.findUnique({ where: { id: sprintId } });
    });

    return result;
};

const CloseSprint = async (sprintId, userId, { carryOverSprintId } = {}) => {
    _requireAuthenticatedUser(userId);

    const INCOMPLETE_STATUSES = ['pending', 'in_progress', 'on_hold', 'in_review', 'rejected'];

    return prisma.$transaction(async (tx) => {
        const sprint = await tx.sprint.findUnique({ where: { id: sprintId } });
        if (!sprint || !sprint.isActive) {
            throw new APIError(404, 'Sprint not found.');
        }
        if (sprint.status !== 'active') {
            throw new APIError(400, `Sprint is '${sprint.status}'. Only active sprints can be closed.`);
        }

        if (carryOverSprintId) {
            const target = await tx.sprint.findUnique({ where: { id: carryOverSprintId } });
            if (!target || !target.isActive || target.status === 'closed' || target.projectId !== sprint.projectId) {
                throw new APIError(400, 'carryOverSprintId must be an active, non-closed sprint in the same project.');
            }

            await tx.task.updateMany({
                where: { sprintId, isActive: true, status: { in: INCOMPLETE_STATUSES } },
                data: { sprintId: carryOverSprintId },
            });
        } else {
            await tx.task.updateMany({
                where: { sprintId, isActive: true, status: { in: INCOMPLETE_STATUSES } },
                data: { sprintId: null },
            });
        }

        return tx.sprint.update({
            where: { id: sprintId },
            data: { status: 'closed', closedAt: new Date() },
        });
    });
};

module.exports = {
    CreateSprint,
    GetSprints,
    GetSprintById,
    UpdateSprint,
    DeleteSprint,
    StartSprint,
    CloseSprint,
};
