const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken, RequireRole } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const { ROLES } = require('@pms/constants');
const { CreateWorkflow, GetWorkflows, GetWorkflowById, UpdateWorkflow, DeleteWorkflow } = require('../controllers/workflow.controller');

const CreateWorkflowSchema = z.object({
    workspaceId: z.string().uuid(),
    name: z.string().min(2),
    description: z.string().optional(),
    definition: z.object({}).passthrough(),     
}).strict();

const UpdateWorkflowSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    definition: z.object({}).passthrough().optional(),
}).strict();

const IdParamSchema = z.object({ id: z.string().uuid() }).strict();

Router.post('/', AuthenticateToken, RequireRole([ROLES.ADMIN, ROLES.OWNER]), ValidateRequest(CreateWorkflowSchema), CreateWorkflow);
Router.get('/', AuthenticateToken, GetWorkflows);
Router.get('/:id', AuthenticateToken, ValidateRequest(IdParamSchema), GetWorkflowById);
Router.patch('/:id', AuthenticateToken, ValidateRequest(IdParamSchema), RequireRole([ROLES.ADMIN, ROLES.OWNER]), ValidateRequest(UpdateWorkflowSchema), UpdateWorkflow);
Router.delete('/:id', AuthenticateToken, ValidateRequest(IdParamSchema), RequireRole([ROLES.ADMIN, ROLES.OWNER]), DeleteWorkflow);
module.exports = Router;