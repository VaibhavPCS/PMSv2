const Router = require('express').Router();
const { HandleGithubWebhook } = require('../controllers/github.controller');

Router.post('/github', HandleGithubWebhook);

module.exports = Router;