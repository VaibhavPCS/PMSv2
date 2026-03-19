const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const {
    SendMessage, GetMessages, EditMessage, DeleteMessage,
    AddReaction, RemoveReaction, MarkAsRead, GetUnreadCount,
} = require('../controllers/message.controller');

const SendMessageSchema  = z.object({
    content:         z.string().min(1),
    parentMessageId: z.string().uuid().optional(),
}).strict();

const EditMessageSchema  = z.object({ content: z.string().min(1) }).strict();
const ReactionSchema     = z.object({ emoji: z.string().min(1), chatId: z.string().uuid().optional() }).strict();

Router.get('/unread-count',         AuthenticateToken, GetUnreadCount);
Router.post('/chats/:chatId',        AuthenticateToken, ValidateRequest(SendMessageSchema), SendMessage);
Router.get('/chats/:chatId',         AuthenticateToken, GetMessages);
Router.patch('/:id',                 AuthenticateToken, ValidateRequest(EditMessageSchema), EditMessage);
Router.delete('/:id',                AuthenticateToken, DeleteMessage);
Router.post('/:id/reactions',        AuthenticateToken, ValidateRequest(ReactionSchema), AddReaction);
Router.delete('/:id/reactions',      AuthenticateToken, ValidateRequest(ReactionSchema), RemoveReaction);
Router.post('/:id/read',             AuthenticateToken, MarkAsRead);

module.exports = Router;
