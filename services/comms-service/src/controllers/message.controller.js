const { CatchAsync } = require('@pms/error-handler');
const MessageService = require('../services/message.service');

const _emit = (req, event, chatId, data) => {
    const io = req.app.get('io');
    if (io) io.to(`chat:${chatId}`).emit(event, data);
};

const SendMessage = CatchAsync(async (req, res) => {
    const userId  = req.session.getUserId();
    const message = await MessageService.SendMessage(
        req.params.chatId, userId, req.body.content, req.body.parentMessageId
    );
    _emit(req, 'new-message', req.params.chatId, message);
    res.status(201).json({ status: 'success', data: message });
});

const GetMessages = CatchAsync(async (req, res) => {
    const userId   = req.session.getUserId();
    const page     = Math.max(1, Number(req.query.page)  || 1);
    const limit    = Math.min(50, Number(req.query.limit) || 20);
    const messages = await MessageService.GetMessages(req.params.chatId, userId, page, limit);
    res.status(200).json({ status: 'success', data: messages });
});

const EditMessage = CatchAsync(async (req, res) => {
    const userId  = req.session.getUserId();
    const message = await MessageService.EditMessage(req.params.id, userId, req.body.content);
    _emit(req, 'message-edited', message.chatId, { id: message.id, content: message.content, isEdited: true });
    res.status(200).json({ status: 'success', data: message });
});

const DeleteMessage = CatchAsync(async (req, res) => {
    const userId  = req.session.getUserId();
    const result  = await MessageService.DeleteMessage(req.params.id, userId);
    _emit(req, 'message-deleted', result.chatId, { id: result.id });
    res.status(200).json({ status: 'success', data: null });
});

const AddReaction = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MessageService.AddReaction(req.params.id, userId, req.body.emoji);
    if (req.body.chatId) {
        _emit(req, 'reaction-updated', req.body.chatId, { messageId: req.params.id, userId, emoji: req.body.emoji, action: 'add' });
    }
    res.status(200).json({ status: 'success', data: null });
});

const RemoveReaction = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MessageService.RemoveReaction(req.params.id, userId, req.body.emoji);
    if (req.body.chatId) {
        _emit(req, 'reaction-updated', req.body.chatId, { messageId: req.params.id, userId, emoji: req.body.emoji, action: 'remove' });
    }
    res.status(200).json({ status: 'success', data: null });
});

const MarkAsRead = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MessageService.MarkAsRead(req.params.id, userId);
    res.status(200).json({ status: 'success', data: null });
});

const GetUnreadCount = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const count  = await MessageService.GetUnreadCount(userId);
    res.status(200).json({ status: 'success', data: { count } });
});

module.exports = {
    SendMessage, GetMessages, EditMessage, DeleteMessage,
    AddReaction, RemoveReaction, MarkAsRead, GetUnreadCount,
};
