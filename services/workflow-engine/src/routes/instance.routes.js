const Router = require('express').Router();
const { z } = require('zod');

const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const { CreateInstance, GetInstance, TransitionStage, GetAvailableTransitions } = require('../controllers/instance.controller');

const TransitionSchema = z.object({
    toStage: z.string().min(1),
    note: z.string().optional(),
    attachmentUrl: z.string().url().optional(),
    referenceLink: z.string().url().optional(),
}).strict();

Router.post('/', AuthenticateToken, CreateInstance);
Router.get('/:taskId', AuthenticateToken, GetInstance);
Router.post('/:taskId/transition', AuthenticateToken, ValidateRequest(TransitionSchema), TransitionStage);
Router.get('/:taskId/transitions', AuthenticateToken, GetAvailableTransitions);

module.exports = Router;