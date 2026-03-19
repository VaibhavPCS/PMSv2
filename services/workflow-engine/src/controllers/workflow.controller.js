const { CatchAsync, APIError } = require('@pms/error-handler');
const WorkflowService = require('../services/workflow.service');

const _assertWorkflowReadAccess = (req) => {
  const role = req.session.getAccessTokenPayload().role;
  if (!['admin', 'owner'].includes(role)) {
    throw new APIError(403, 'Forbidden');
  }
};

const CreateWorkflow   = CatchAsync(async (req, res) => {
  const userId   = req.session.getUserId();
  const workflow = await WorkflowService.CreateDefinition(userId, req.body);
  res.status(201).json({ status: 'success', data: workflow });
});

const GetWorkflows     = CatchAsync(async (req, res) => {
  const { workspaceId } = req.query;
  if (typeof workspaceId !== 'string' || !workspaceId.trim()) {
    throw new APIError(400, 'workspaceId is required');
  }

  _assertWorkflowReadAccess(req);

  const workflows = await WorkflowService.ListDefinitions(workspaceId);
  res.status(200).json({ status: 'success', data: workflows });
});

const GetWorkflowById  = CatchAsync(async (req, res) => {
  _assertWorkflowReadAccess(req);
  const workflow = await WorkflowService.GetDefinition(req.params.id);
  res.status(200).json({ status: 'success', data: workflow });
});

const UpdateWorkflow   = CatchAsync(async (req, res) => {
  _assertWorkflowReadAccess(req);
  await WorkflowService.GetDefinition(req.params.id);
  const workflow = await WorkflowService.UpdateDefinition(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: workflow });
});

const DeleteWorkflow   = CatchAsync(async (req, res) => {
  _assertWorkflowReadAccess(req);
  await WorkflowService.GetDefinition(req.params.id);
  await WorkflowService.DeleteDefinition(req.params.id);
  res.status(200).json({ status: 'success', data: null });
});

module.exports = { CreateWorkflow, GetWorkflows, GetWorkflowById, UpdateWorkflow, DeleteWorkflow };
