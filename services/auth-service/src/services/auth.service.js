const prisma        = require('../config/prisma');
const { APIError }  = require('@pms/error-handler');

const CreateUser = async (id, name, email) => {
  return prisma.user.create({
    data: { id, name, email },
  });
};

const GetUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError(404, 'User not found.');
  return user;
};

const UpdateUser = async (id, { name, profilePicture } = {}) => {
  const data = {};
  if (name           !== undefined) data.name           = name;
  if (profilePicture !== undefined) data.profilePicture = profilePicture;

  return prisma.user.update({ where: { id }, data });
};

const SetLastLogin = async (id) => {
  return prisma.user.update({
    where: { id },
    data:  { lastLogin: new Date() },
  });
};

const SetActiveWorkspace = async (id, workspaceId) => {
  return prisma.user.update({
    where: { id },
    data:  { activeWorkspace: workspaceId },
  });
};

module.exports = {
  CreateUser,
  GetUserById,
  UpdateUser,
  SetLastLogin,
  SetActiveWorkspace,
};
