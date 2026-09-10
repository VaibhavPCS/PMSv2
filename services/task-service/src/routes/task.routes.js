const Router = require('express').Router();
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, ValidateQuery, GetTasksQuerySchema, CreateTaskSchema, UpdateTaskSchema, HoldTaskSchema, UpdateTaskStatusSchema, ApproveTaskSchema, RejectTaskSchema, HandoverSchema, ReassignTaskSchema } = require('@pms/validators');
const { CreateTask, GetTasks, GetAllWorkspaceTasks, GetApprovalStats, GetApprovalTasks, GetTask, UpdateTask, HoldTask, ResumeTask, GetProjectTasks, GetUserProjectTasks, GetProjectMembers, UpdateStatus, ApproveTask, RejectTask, HandoverTask, ReassignTask, DeleteTask, } = require('../controller/task.controller');

Router.post('/', AuthenticateToken, ValidateRequest(CreateTaskSchema), CreateTask);
Router.get('/', AuthenticateToken, ValidateQuery(GetTasksQuerySchema), GetTasks);
// Static routes MUST precede '/:id' so the literal segments are not captured as :id.
Router.get('/all', AuthenticateToken, GetAllWorkspaceTasks);
Router.get('/approval-stats', AuthenticateToken, GetApprovalStats);
Router.get('/approval-tasks', AuthenticateToken, GetApprovalTasks);
// Project-scoped task lists / members — STATIC '/project/*' segments, registered
// before '/:id' so 'project' is never captured as a task id. The most specific
// paths come first so '/project/:projectId/user' & '/members' win over the bare list.
Router.get('/project/:projectId/user', AuthenticateToken, GetUserProjectTasks);
Router.get('/project/:projectId/members', AuthenticateToken, GetProjectMembers);
Router.get('/project/:projectId', AuthenticateToken, GetProjectTasks);
Router.get('/:id', AuthenticateToken, GetTask);
Router.put('/:id', AuthenticateToken, ValidateRequest(UpdateTaskSchema), UpdateTask);
Router.patch('/:id/status', AuthenticateToken, ValidateRequest(UpdateTaskStatusSchema), UpdateStatus);
Router.post('/:id/hold', AuthenticateToken, ValidateRequest(HoldTaskSchema), HoldTask);
Router.post('/:id/resume', AuthenticateToken, ResumeTask);
Router.post('/:id/approve', AuthenticateToken, ValidateRequest(ApproveTaskSchema), ApproveTask);
Router.post('/:id/reject', AuthenticateToken, ValidateRequest(RejectTaskSchema), RejectTask);
Router.post('/:id/handover', AuthenticateToken, ValidateRequest(HandoverSchema), HandoverTask);
Router.post('/:id/reassign', AuthenticateToken, ValidateRequest(ReassignTaskSchema), ReassignTask);
Router.delete('/:id', AuthenticateToken, DeleteTask);

module.exports = Router;