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

const GetOrganizationChats = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const chats = await ChatService.GetOrganizationChats(userId);
    // Frontend reads `response.chats` (falls back to `data`); expose both.
    res.status(200).json({ status: 'success', chats, data: chats });
});

const GetOrganizationUsers = CatchAsync(async (_req, res) => {
    const users = await ChatService.GetOrganizationUsers();
    // Frontend reads `response.users` (falls back to `data`); expose both.
    res.status(200).json({ status: 'success', users, data: users });
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

const GetUnreadCount = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const count = await ChatService.GetUnreadCount(userId);
    // Top-level `count` is what the frontend BadgeProvider reads
    // (messagesResponse.count); `data.count` keeps the service convention.
    res.status(200).json({ status: 'success', count, data: { count } });
});

module.exports = { CreateChat, GetMyChats, GetOrganizationChats, GetOrganizationUsers, GetChatById, AddParticipant, RemoveParticipant, ArchiveChat, GetUnreadCount };
