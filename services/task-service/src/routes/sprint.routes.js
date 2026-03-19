const Router = require('express').Router();
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, ValidateQuery, GetSprintsQuerySchema, CreateSprintSchema, UpdateSprintSchema } = require('@pms/validators');
const { CreateSprint, GetSprints, GetSprint, UpdateSprint, DeleteSprint } = require('../controller/sprint.controller');

Router.post('/', AuthenticateToken, ValidateRequest(CreateSprintSchema), CreateSprint);
Router.get('/', AuthenticateToken, ValidateQuery(GetSprintsQuerySchema), GetSprints);
Router.get('/:id', AuthenticateToken, GetSprint);
Router.patch('/:id', AuthenticateToken, ValidateRequest(UpdateSprintSchema), UpdateSprint);
Router.delete('/:id', AuthenticateToken, DeleteSprint);

module.exports = Router;