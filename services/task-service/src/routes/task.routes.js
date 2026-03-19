const Router = require('express').Router();
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, CreateTaskSchema, UpdateTaskStatusSchema, ApproveTaskSchema, RejectTaskSchema, HandoverSchema } = require('@pms/validators');
const { CreateTask, GetTasks, GetTask, UpdateStatus, ApproveTask, RejectTask, HandoverTask, DeleteTask, } = require('../controller/task.controller');

Router.post('/', AuthenticateToken, ValidateRequest(CreateTaskSchema), CreateTask);
Router.get('/', AuthenticateToken, GetTasks);
Router.get('/:id', AuthenticateToken, GetTask);
Router.patch('/:id/status', AuthenticateToken, ValidateRequest(UpdateTaskStatusSchema), UpdateStatus);
Router.post('/:id/approve', AuthenticateToken, ValidateRequest(ApproveTaskSchema), ApproveTask);
Router.post('/:id/reject', AuthenticateToken, ValidateRequest(RejectTaskSchema), RejectTask);
Router.post('/:id/handover', AuthenticateToken, ValidateRequest(HandoverSchema), HandoverTask);
Router.delete('/:id', AuthenticateToken, DeleteTask);

module.exports = Router;