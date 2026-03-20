const Router = require('express').Router();
const { APIError } = require('@pms/error-handler');
const { ROLES } = require('@pms/constants');
const { AuthenticateToken, RequireRole } = require('@pms/auth-middleware');
const {
	ValidateRequest,
	ValidateQuery,
	GetSprintsQuerySchema,
	CreateSprintSchema,
	UpdateSprintSchema,
} = require('@pms/validators');
const { CreateSprint, GetSprints, GetSprint, UpdateSprint, DeleteSprint, StartSprint, CloseSprint } = require('../controller/sprint.controller');

const _UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ValidateIdParam = (req, _res, next) => {
	if (!_UUID_REGEX.test(String(req.params.id || ''))) {
		return next(new APIError(400, 'Invalid ID format'));
	}
	next();
};

Router.post('/', AuthenticateToken, ValidateRequest(CreateSprintSchema), CreateSprint);
Router.get('/', AuthenticateToken, ValidateQuery(GetSprintsQuerySchema), GetSprints);
Router.get('/:id', AuthenticateToken, GetSprint);
Router.patch('/:id', AuthenticateToken, ValidateRequest(UpdateSprintSchema), UpdateSprint);
Router.delete('/:id', AuthenticateToken, DeleteSprint);
Router.post('/:id/start', AuthenticateToken, ValidateIdParam, RequireRole([ROLES.ADMIN, ROLES.PROJECT_HEAD]), StartSprint);
Router.post('/:id/close', AuthenticateToken, ValidateIdParam, RequireRole([ROLES.ADMIN, ROLES.PROJECT_HEAD]), CloseSprint);

module.exports = Router;