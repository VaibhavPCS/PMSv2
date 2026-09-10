const { CatchAsync, APIError } = require('@pms/error-handler');
const ProjectService   = require('../services/project.service');

const CreateProject = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const project = await ProjectService.CreateProject(userId, req.body, req.body.workspaceId);
    res.status(201).json(project);
});

const GetProjects = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const { page, limit } = req.query;
    // The frontend sends the active workspace in the 'workspace-id' header; the
    // ?workspaceId= query param is an explicit override.
    const workspaceId = req.query.workspaceId || req.headers['workspace-id'];
    const projects = await ProjectService.GetProjects(workspaceId, userId, { page, limit });
    res.status(200).json(projects);
});

const GetRecentProjects = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    // workspaceId comes from the 'workspace-id' header (injected by the frontend
    // api client); the ?workspaceId= query param is an explicit override/fallback.
    // ValidateQuery has already replaced req.query with parsed data, so the header
    // must be read straight off req.headers here.
    const workspaceId = req.query.workspaceId || req.headers['workspace-id'];
    if (!workspaceId) throw new APIError(400, 'workspace-id is required');

    const { page, limit, sortBy } = req.query;
    const projects = await ProjectService.GetRecentProjects(workspaceId, userId, { page, limit, sortBy });
    res.status(200).json({ projects });
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
    GetRecentProjects,
    GetProject,
    UpdateProject,
    DeleteProject,
    ExtendProjectDeadline,
};