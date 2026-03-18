const { CatchAsync }      = require('@pms/error-handler');
const WorkspaceService    = require('../services/workspace.service');

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

const CreateWorkspace = CatchAsync(async (req, res) => {
  const userId    = req.session.getUserId();
  const workspace = await WorkspaceService.CreateWorkspace(userId, req.body);
  res.status(201).json({ status: 'success', data: workspace });
});

const GetMyWorkspaces = CatchAsync(async (req, res) => {
  const userId     = req.session.getUserId();
  const workspaces = await WorkspaceService.GetMyWorkspaces(userId);
  res.status(200).json({ status: 'success', data: workspaces });
});

const GetWorkspace = CatchAsync(async (req, res) => {
  const userId    = req.session.getUserId();
  const workspace = await WorkspaceService.GetWorkspaceById(req.params.id, userId);
  res.status(200).json({ status: 'success', data: workspace });
});

const UpdateWorkspace = CatchAsync(async (req, res) => {
  const userId    = req.session.getUserId();
  const workspace = await WorkspaceService.UpdateWorkspace(req.params.id, userId, req.body);
  res.status(200).json({ status: 'success', data: workspace });
});

const DeleteWorkspace = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  await WorkspaceService.DeleteWorkspace(req.params.id, userId);
  res.status(204).send();
});

const TransferOwnership = CatchAsync(async (req, res) => {
  const userId    = req.session.getUserId();
  const workspace = await WorkspaceService.TransferOwnership(req.params.id, userId, req.body.newOwnerId);
  res.status(200).json({ status: 'success', data: workspace });
});

module.exports = {
  CreateWorkspace,
  GetMyWorkspaces,
  GetWorkspace,
  UpdateWorkspace,
  DeleteWorkspace,
  TransferOwnership,
};
