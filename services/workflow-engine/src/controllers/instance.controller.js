const { CatchAsync } = require('@pms/error-handler');
const InstanceService = require('../services/instance.service');

const CreateInstance = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const instance = await InstanceService.CreateInstance(req.body.taskId, req.body.workflowDefinitionId, userId);
    res.status(201).json({ status: 'success', data: instance });
});

const GetInstance = CatchAsync(async (req, res) => {
    const instance = await InstanceService.GetInstance(req.params.taskId);
    res.status(200).json({ status: 'success', data: instance });
});

const TransitionStage = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const userRole = req.memberRole;
    const instance = await InstanceService.TransitionStage(req.params.taskId, req.body, userId, userRole);
    res.status(200).json({ status: 'success', data: instance });
});

const GetAvailableTransitions = CatchAsync(async (req, res) => {
    const userRole = req.memberRole;
    const transitions = await InstanceService.GetAvailableTransitions(req.params.taskId, userRole);
    res.status(200).json({ status: 'success', data: transitions });
});

module.exports = { CreateInstance, GetInstance, TransitionStage, GetAvailableTransitions };