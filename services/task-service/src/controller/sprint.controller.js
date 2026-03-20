const { CatchAsync } = require('@pms/error-handler');
const SprintService = require('../services/sprint.service');

const CreateSprint = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const sprint = await SprintService.CreateSprint(userId, req.body);
    res.status(201).json(sprint);
});

const GetSprints = CatchAsync(async (req, res) => {
    const sprints = await SprintService.GetSprints(req.query.projectId);
    res.status(200).json(sprints);
});

const GetSprint = CatchAsync(async (req, res) => {
    const sprint = await SprintService.GetSprintById(req.params.id);
    res.status(200).json(sprint);
});

const UpdateSprint = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const sprint = await SprintService.UpdateSprint(req.params.id, req.body, userId);
    res.status(200).json(sprint);
});

const DeleteSprint = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await SprintService.DeleteSprint(req.params.id, userId);
    res.status(204).send();
});

const StartSprint = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const sprint = await SprintService.StartSprint(req.params.id, userId);
    res.status(200).json(sprint);
});

const CloseSprint = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const sprint = await SprintService.CloseSprint(req.params.id, userId, req.body);
    res.status(200).json(sprint);
});

module.exports = {
    CreateSprint,
    GetSprints,
    GetSprint,
    UpdateSprint,
    DeleteSprint,
    StartSprint,
    CloseSprint,
};
