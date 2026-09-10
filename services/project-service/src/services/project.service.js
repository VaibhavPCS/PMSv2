const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { ROLES, PROJECT_STATE, PROJECT_STATUS } = require('@pms/constants');
const { parsePagination } = require('@pms/validators');
const { PublishProjectCreated, PublishProjectUpdated, PublishProjectDeleted, PublishProjectDeadlineExtended } = require('../events/publishers');

const _getActiveMember = async (projectId, userId) => {
    return prisma.projectMember.findFirst({
        where: { projectId, userId, isActive: true }
    });
};

const _requireWorkspaceAdminOrOwner = async (workspaceId, userId) => {
    const cache = await prisma.workspaceRoleCache.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!cache || ![ROLES.ADMIN, ROLES.OWNER].includes(cache.role)) {
        throw new APIError(403, 'Only workspace admins or owners can perform this action.');
    }
};

const CreateProject = async (userId, { name, description, state, projectStatus, startDate, endDate, tags, members }, workspaceId) => {
    return prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
            data: { name, description, state, projectStatus, startDate, endDate, tags, workspaceId, createdBy: userId }
        });

        await tx.projectMember.create({
            data: { projectId: project.id, userId, role: ROLES.PROJECT_HEAD }
        });

        if (members && members.length > 0) {
            await tx.projectMember.createMany({
                data: members.map(({ userId: memberId, role }) => ({ projectId: project.id, userId: memberId, role }))
            });
        }

        await PublishProjectCreated(project.id, userId, workspaceId);
        return project;
    });
};

const GetProjects = async (workspaceId, userId, { page, limit } = {}) => {
    const { safePage, safeLimit } = parsePagination({ page, limit });

    const where = {
        workspaceId,
        isActive: true,
        members: { some: { userId, isActive: true } },
    };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            include: {
                members: { where: { userId }, select: { role: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        }),
        prisma.project.count({ where }),
    ]);

    return { data: projects, total, page: safePage, limit: safeLimit };
};

const RECENT_SORT_FIELDS = ['startDate', 'endDate', 'createdAt'];

// Maps a raw prisma project row to the shape the dashboard reads. The frontend
// reads response.projects[] expecting _id (NOT id), title (NOT name) and a
// human-readable status driven by the project `state` (whose values lowercase
// to the dashboard buckets: planning / in progress / on hold / completed).
const _toRecentProject = (p) => ({
    _id:         p.id,
    title:       p.name,
    description: p.description ?? null,
    status:      p.state ?? null,
    startDate:   p.startDate,
    endDate:     p.endDate,
    createdAt:   p.createdAt,
    updatedAt:   p.updatedAt,
});

const GetRecentProjects = async (workspaceId, userId, { page, limit, sortBy } = {}) => {
    // Honour page/limit server-side; allow up to 1000 (dashboard sends limit=1000)
    // which the regular parsePagination helper would clamp to 100.
    const safePage  = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 20));
    const orderField = RECENT_SORT_FIELDS.includes(sortBy) ? sortBy : 'startDate';

    const projects = await prisma.project.findMany({
        where: {
            workspaceId,
            isActive: true,
            members: { some: { userId, isActive: true } },
        },
        include: {
            members: { where: { userId }, select: { role: true } },
        },
        orderBy: { [orderField]: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
    });

    return projects.map(_toRecentProject);
};

const GetProjectById = async (projectId, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            members: { where: { isActive: true }, select: { userId: true, role: true } },
            dateHistory: { orderBy: { createdAt: 'desc' } },
        }
    });

    if (!project || !project.isActive) throw new APIError(404, 'Project not found.');

    const isMember = project.members.some(m => m.userId === userId);
    if (!isMember) throw new APIError(403, 'Access denied.');

    return project;
};

const UpdateProject = async (projectId, userId, { name, description, state, projectStatus, endDate, tags }) => {
    const member = await _getActiveMember(projectId, userId);
    if (!member || member.role !== ROLES.PROJECT_HEAD) {
        throw new APIError(403, 'Only project heads can update the project.');
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (state !== undefined) data.state = state;
    if (projectStatus !== undefined) data.projectStatus = projectStatus;
    if (endDate !== undefined) data.endDate = endDate;
    if (tags !== undefined) data.tags = tags;

    const completingState = state !== undefined && state === PROJECT_STATE.COMPLETED;
    const completingStatus = projectStatus !== undefined && projectStatus === PROJECT_STATUS.COMPLETED;
    if (completingState || completingStatus) {
        const work = await prisma.projectOpenWorkCache.findUnique({ where: { projectId } });
        const openTasks = work?.openTasks ?? 0;
        const activeSprints = work?.activeSprints ?? 0;
        if (openTasks > 0 || activeSprints > 0) {
            throw new APIError(400, `Cannot complete project: ${openTasks} open task(s) and ${activeSprints} active sprint(s) remaining`);
        }
    }

    const updated = await prisma.project.update({ where: { id: projectId }, data });
    await PublishProjectUpdated(projectId, userId);
    return updated;
};

const DeleteProject = async (projectId, userId) => {
    const member = await _getActiveMember(projectId, userId);
    if (!member || member.role !== ROLES.PROJECT_HEAD) {
        throw new APIError(403, 'Only project heads can delete the project.');
    }
    await prisma.project.update({ where: { id: projectId }, data: { isActive: false } });
    await PublishProjectDeleted(projectId);
};

const ExtendProjectDeadline = async (projectId, userId, { newEndDate, reason }) => {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !project.isActive) throw new APIError(404, 'Project not found.');

    await _requireWorkspaceAdminOrOwner(project.workspaceId, userId);

    const newDate = new Date(newEndDate);
    if (Number.isNaN(newDate.getTime())) {
        throw new APIError(400, 'Invalid end date');
    }
    if (project.endDate && newDate <= project.endDate) {
        throw new APIError(400, 'New end date must be later than the current end date.');
    }

    const [updated] = await prisma.$transaction([
        prisma.project.update({
            where: { id: projectId },
            data: { endDate: newDate },
        }),
        prisma.projectDateHistory.create({
            data: {
                projectId,
                oldEndDate: project.endDate,
                newEndDate: newDate,
                reason,
                extendedBy: userId,
            },
        }),
    ]);

    await PublishProjectDeadlineExtended(projectId, newDate.toISOString(), userId);
    return updated;
};

module.exports = {
    CreateProject,
    GetProjects,
    GetRecentProjects,
    GetProjectById,
    UpdateProject,
    DeleteProject,
    ExtendProjectDeadline,
};