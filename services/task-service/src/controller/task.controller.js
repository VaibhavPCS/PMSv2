const { CatchAsync } = require('@pms/error-handler');
const TaskService    = require('../services/task.service');

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

const GetTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const task = await TaskService.GetTaskById(req.params.id, userId);
    res.status(200).json(task);
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

const DeleteTask = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await TaskService.DeleteTask(req.params.id, userId);
    res.status(204).send();
});

module.exports = {
    CreateTask,
    GetTasks,
    GetTask,
    UpdateStatus,
    ApproveTask,
    RejectTask,
    HandoverTask,
    DeleteTask
};