const Router = require('express').Router();
const { AuthenticateToken } = require('@pms/auth-middleware');
const { CreateTemplate, GetTemplates, DeleteTemplate } = require('../controller/recurring.controller');

Router.post('/',     AuthenticateToken, CreateTemplate);
Router.get('/',      AuthenticateToken, GetTemplates);
Router.delete('/:id', AuthenticateToken, DeleteTemplate);

module.exports = Router;