const { CatchAsync }    = require('@pms/error-handler');
const { APIError }      = require('@pms/error-handler');
const RecurringService  = require('../services/recurring.service');

const _UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CreateTemplate = CatchAsync(async (req, res) => {
  const userId   = req.session.getUserId();
  const template = await RecurringService.CreateTemplate(userId, req.body);
  res.status(201).json(template);
});

const GetTemplates = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  const projectId = String(req.query.projectId || '');
  if (!_UUID_REGEX.test(projectId)) {
    throw new APIError(400, 'projectId query parameter must be a valid UUID.');
  }

  const templates = await RecurringService.GetTemplates(projectId, userId);
  res.status(200).json(templates);
});

const DeleteTemplate = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  await RecurringService.DeleteTemplate(req.params.id, userId);
  res.status(204).send();
});

module.exports = { CreateTemplate, GetTemplates, DeleteTemplate };