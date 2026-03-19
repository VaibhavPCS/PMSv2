const { CatchAsync }   = require('@pms/error-handler');
const ProjectService   = require('../services/project.service');

const CreateProject = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const project = await ProjectService.CreateProject(userId, req.body, req.body.workspaceId);
    res.status(201).json(project);
});

const GetProjects = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const projects = await ProjectService.GetProjects(req.query.workspaceId, userId);
    res.status(200).json(projects);
});

const GetProject = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const project = await ProjectService.GetProjectById(req.params.id, userId);
    res.status(200).json(project);
});

const UpdateProject = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const project = await ProjectService.UpdateProject(req.params.id, userId, req.body);
    res.status(200).json(project);
});

const DeleteProject = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await ProjectService.DeleteProject(req.params.id, userId);
    res.status(204).send();
});

const ExtendProjectDeadline = CatchAsync(async (req, res) => {
    const userId  = req.session.getUserId();
    const project = await ProjectService.ExtendProjectDeadline(req.params.id, userId, req.body);
    res.status(200).json({ status: 'success', data: project });
});

module.exports = {
    CreateProject,
    GetProjects,
    GetProject,
    UpdateProject,
    DeleteProject,
    ExtendProjectDeadline,
};