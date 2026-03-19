const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { ROLES } = require('@pms/constants');
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

const GetProjects = async (workspaceId, userId) => {
    return prisma.project.findMany({
        where: {
            workspaceId,
            isActive: true,
            members: { some: { userId, isActive: true } }
        },
        include: {
            members: { where: { userId }, select: { role: true } }
        }
    });
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
    GetProjectById,
    UpdateProject,
    DeleteProject,
    ExtendProjectDeadline,
};