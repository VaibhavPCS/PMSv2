const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');

const CreateDefinition = async (createdBy, { workspaceId, name, description, definition }) => {
  return prisma.workflowDefinition.create({
    data: { workspaceId, name, description, definition, createdBy },
  });
};

const ListDefinitions = async (workspaceId) => {
  return prisma.workflowDefinition.findMany({
    where: { workspaceId, isActive: true },
  });
};

const GetDefinition = async (id) => {
  const def = await prisma.workflowDefinition.findFirst({ where: { id, isActive: true } });
  if (!def) throw new APIError(404, 'Workflow definition not found.');
  return def;
};

const UpdateDefinition = async (id, { name, description, definition }) => {
  const existing = await GetDefinition(id);
  if (existing.isBuiltIn) throw new APIError(403, 'Built-in workflow definitions cannot be modified.');

  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (definition !== undefined) data.definition = definition;

  if (Object.keys(data).length === 0) {
    return existing;
  }

  return prisma.workflowDefinition.update({ where: { id }, data });
};

const DeleteDefinition = async (id) => {
  const existing = await GetDefinition(id);
  if (existing.isBuiltIn) throw new APIError(403, 'Built-in workflow definitions cannot be deleted.');

  const activeInstances = await prisma.workflowInstance.count({
    where: { workflowDefinitionId: id, isTerminal: false },
  });
  if (activeInstances > 0) {
    throw new APIError(409, 'Workflow is in use by active tasks.');
  }

  return prisma.workflowDefinition.update({
    where: { id },
    data: { isActive: false },
  });
};

module.exports = {
  CreateDefinition,
  ListDefinitions,
  GetDefinition,
  UpdateDefinition,
  DeleteDefinition,
};