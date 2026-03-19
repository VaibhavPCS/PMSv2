const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { ROLES } = require('@pms/constants');
const { PublishProjectCreated, PublishProjectUpdated, PublishProjectDeleted } = require('../events/publishers');

const _getActiveMember = async (projectId, userId) => {
    return await prisma.projectMember.findFirst({
        where: { projectId, userId, isActive: true }
    });
};

const CreateProject = async (userId, { name, description, state, projectStatus, startDate, dueDate, tags, members }, workspaceId) => {
    return await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
            data: {
                name,
                description,
                state,
                projectStatus,
                startDate,
                dueDate,
                tags,
                workspaceId,
                createdBy: userId
            }
        });

        await tx.projectMember.create({
            data: {
                projectId: project.id,
                userId,
                role: ROLES.PROJECT_HEAD
            }
        });

        if (members && members.length > 0) {
            const memberCreates = members.map(({ userId: memberId, role }) => ({
                projectId: project.id,
                userId: memberId,
                role
            }));
            await tx.projectMember.createMany({ data: memberCreates });
        }

        await PublishProjectCreated(project.id, userId, workspaceId);
        return project;
    });
};

const GetProjects = async (workspaceId, userId) => {
    return await prisma.project.findMany({
        where: {
            workspaceId,
            isActive: true,
            members: {
                some: {
                    userId,
                    isActive: true
                }
            }
        },
        include: {
            members: {
                where: { userId },
                select: { role: true }
            }
        }
    });
};

const GetProjectById = async (projectId, userId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            members: {
                where: { isActive: true },
                select: { userId: true, role: true }
            }
        }
    });

    if (!project || !project.isActive) {
        throw new APIError(404, 'Project not found.');
    }

    const isMember = project.members.some(member => member.userId === userId);
    if (!isMember) {
        throw new APIError(403, 'Access denied.');
    }

    return project;
};

const UpdateProject = async (projectId, userId, { name, description, state, projectStatus, dueDate, tags }) => {
    const member = await _getActiveMember(projectId, userId);
    if (!member || member.role !== ROLES.PROJECT_HEAD) {
        throw new APIError(403, 'Only project heads can update the project.');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (state !== undefined) updateData.state = state;
    if (projectStatus !== undefined) updateData.projectStatus = projectStatus;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (tags !== undefined) updateData.tags = tags;

    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: updateData
    });

    await PublishProjectUpdated(projectId, userId);

    return updatedProject;
};

const DeleteProject = async (projectId, userId) => {
    const member = await _getActiveMember(projectId, userId);
    if (!member || member.role !== ROLES.PROJECT_HEAD) {
        throw new APIError(403, 'Only project heads can delete the project.');
    }

    await prisma.project.update({
        where: { id: projectId },
        data: { isActive: false }
    });

    await PublishProjectDeleted(projectId);
}

module.exports = {
    CreateProject,
    GetProjects,
    GetProjectById,
    UpdateProject,
    DeleteProject
};