const { CatchAsync } = require('@pms/error-handler');
const WorkflowService = require('../services/workflow.service');

const CreateWorkflow   = CatchAsync(async (req, res) => {
  const userId   = req.session.getUserId();
  const workflow = await WorkflowService.CreateDefinition(userId, req.body);
  res.status(201).json({ status: 'success', data: workflow });
});

const GetWorkflows     = CatchAsync(async (req, res) => {
  const { workspaceId } = req.query;
  const workflows = await WorkflowService.ListDefinitions(workspaceId);
  res.status(200).json({ status: 'success', data: workflows });
});

const GetWorkflowById  = CatchAsync(async (req, res) => {
  const workflow = await WorkflowService.GetDefinition(req.params.id);
  res.status(200).json({ status: 'success', data: workflow });
});

const UpdateWorkflow   = CatchAsync(async (req, res) => {
  const workflow = await WorkflowService.UpdateDefinition(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: workflow });
});

const DeleteWorkflow   = CatchAsync(async (req, res) => {
  await WorkflowService.DeleteDefinition(req.params.id);
  res.status(200).json({ status: 'success', data: null });
});

module.exports = { CreateWorkflow, GetWorkflows, GetWorkflowById, UpdateWorkflow, DeleteWorkflow };
