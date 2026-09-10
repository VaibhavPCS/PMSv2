const { CatchAsync, APIError } = require('@pms/error-handler');
const TaskService    = require('../services/task.service');

// Workspace scoping helper: prefer explicit ?workspaceId= query, fall back to the
// 'workspace-id' request header (auto-injected by the frontend api client).
const _resolveWorkspaceId = (req) => {
    const workspaceId = req.query.workspaceId || req.headers['workspace-id'];
    if (!workspaceId) throw new APIError(400, 'workspace-id is required');
    return workspaceId;
};

const CreateTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.CreateTask(userId, req.body);
    res.status(201).json(task);
});

const GetTasks = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const tasks = await TaskService.GetTasks(req.query, userId);
    res.status(200).json(tasks);
});

const GetAllWorkspaceTasks = CatchAsync(async (req, res) => {
    const workspaceId = _resolveWorkspaceId(req);
    const tasks = await TaskService.GetAllWorkspaceTasks(workspaceId, req.query);
    res.status(200).json({ tasks });
});

const GetApprovalStats = CatchAsync(async (req, res) => {
    const workspaceId = _resolveWorkspaceId(req);
    const stats = await TaskService.GetApprovalStats(workspaceId);
    res.status(200).json(stats);
});

const GetApprovalTasks = CatchAsync(async (req, res) => {
    const workspaceId = _resolveWorkspaceId(req);
    const tasks = await TaskService.GetApprovalTasks(workspaceId);
    res.status(200).json({ tasks });
});

const GetTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.GetTaskById(req.params.id, userId);
    res.status(200).json(task);
});

const UpdateTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.UpdateTask(req.params.id, req.body, userId);
    res.status(200).json({ status: 'success', data: task });
});

const HoldTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.HoldTask(req.params.id, req.body, userId);
    res.status(200).json({ status: 'success', data: task });
});

const ResumeTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.ResumeTask(req.params.id, req.body, userId);
    res.status(200).json({ status: 'success', data: task });
});

// The project-detail frontend reads response.tasks, so these list endpoints
// return the array under a top-level `tasks` key (matching GetAllWorkspaceTasks).
const GetProjectTasks = CatchAsync(async (req, res) => {
    const tasks = await TaskService.GetProjectTasks(req.params.projectId);
    res.status(200).json({ tasks });
});

const GetUserProjectTasks = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const tasks = await TaskService.GetUserProjectTasks(req.params.projectId, userId);
    res.status(200).json({ tasks });
});

// The frontend reads response.members for assignable members.
const GetProjectMembers = CatchAsync(async (req, res) => {
    const members = await TaskService.GetProjectMembers(req.params.projectId);
    res.status(200).json({ members });
});

const UpdateStatus = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.UpdateStatus(req.params.id, req.body, userId);
    res.status(200).json(task);
});

const ApproveTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.ApproveTask(req.params.id, req.body, userId);
    res.status(200).json(task);
});

const RejectTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.RejectTask(req.params.id, req.body, userId);
    res.status(200).json(task);
});

const HandoverTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.HandoverTask(req.params.id, req.body, userId);
    res.status(200).json(task);
});

const ReassignTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.ReassignTask(req.params.id, req.body, userId);
    res.status(200).json(task);
});

const DeleteTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await TaskService.DeleteTask(req.params.id, userId);
    res.status(204).send();
});

module.exports = {
    CreateTask,
    GetTasks,
    GetAllWorkspaceTasks,
    GetApprovalStats,
    GetApprovalTasks,
    GetTask,
    UpdateTask,
    HoldTask,
    ResumeTask,
    GetProjectTasks,
    GetUserProjectTasks,
    GetProjectMembers,
    UpdateStatus,
    ApproveTask,
    RejectTask,
    HandoverTask,
    ReassignTask,
    DeleteTask
};