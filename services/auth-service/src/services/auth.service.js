const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { PublishUserRegistered, PublishUserUpdated } = require('../events/publishers');

const CreateUser = async (id, name, email) => {
  const user = await prisma.user.create({ data: { id, name, email } });
  await PublishUserRegistered(id, name, email);
  return user;
};

const GetUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError(404, 'User not found.');
  return user;
};

const UpdateUser = async (id, { name, profilePicture } = {}) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (profilePicture !== undefined) data.profilePicture = profilePicture;

  const user = await prisma.user.update({ where: { id }, data });
  await PublishUserUpdated(id, data);
  return user;
};

const SetLastLogin = async (id) => {
  return prisma.user.update({
    where: { id },
    data: { lastLogin: new Date() },
  });
};

const SetActiveWorkspace = async (id, workspaceId) => {
  return prisma.user.update({
    where: { id },
    data: { activeWorkspace: workspaceId },
  });
};

// Role is validated upstream via UpdateRoleSchema (z.enum) in auth.routes.js before this is called.
const UpdateUserRole = async (id, role) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError(404, 'User not found.');
  const updated = await prisma.user.update({ where: { id }, data: { role } });
  await PublishUserUpdated(id, { role });
  return updated;
};

module.exports = {
  CreateUser,
  GetUserById,
  UpdateUser,
  SetLastLogin,
  SetActiveWorkspace,
  UpdateUserRole,
};
