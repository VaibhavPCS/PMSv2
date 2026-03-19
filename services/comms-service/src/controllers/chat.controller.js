const { CatchAsync } = require('@pms/error-handler');
const ChatService = require('../services/chat.service');

const CreateChat = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const chat = await ChatService.CreateChat(userId, req.body.workspaceId, req.body);
    res.status(201).json({ status: 'success', data: chat });
});

const GetMyChats = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const chats = await ChatService.GetMyChats(userId, req.query.workspaceId);
    res.status(200).json({ status: 'success', data: chats });
});

const GetChatById = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const chat = await ChatService.GetChatById(req.params.id, userId);
    res.status(200).json({ status: 'success', data: chat });
});

const AddParticipant = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await ChatService.AddParticipant(req.params.id, userId, req.body.userId);
    res.status(200).json({ status: 'success', data: null });
});

const RemoveParticipant = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await ChatService.RemoveParticipant(req.params.id, userId, req.params.userId);
    res.status(200).json({ status: 'success', data: null });
});

const ArchiveChat = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await ChatService.ArchiveChat(req.params.id, userId);
    res.status(200).json({ status: 'success', data: null });
});

module.exports = { CreateChat, GetMyChats, GetChatById, AddParticipant, RemoveParticipant, ArchiveChat };
