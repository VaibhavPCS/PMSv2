const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const {
    SendMessage, GetMessages, EditMessage, DeleteMessage,
    AddReaction, RemoveReaction, MarkAsRead, MarkChatAsRead, GetUnreadCount,
} = require('../controllers/message.controller');

const SendMessageSchema  = z.object({
    content:         z.string().trim().min(1, 'Message content cannot be empty').max(5000, 'Message is too long. Maximum 5000 characters allowed.'),
    parentMessageId: z.string().uuid().optional(),
}).strict();

const EditMessageSchema  = z.object({ content: z.string().trim().min(1, 'Message content cannot be empty').max(5000, 'Message is too long. Maximum 5000 characters allowed.') }).strict();
const ReactionSchema     = z.object({ emoji: z.string().min(1), chatId: z.string().uuid().optional() }).strict();

Router.get('/unread-count',         AuthenticateToken, GetUnreadCount);
Router.post('/chats/:chatId',        AuthenticateToken, ValidateRequest(SendMessageSchema), SendMessage);
Router.get('/chats/:chatId',         AuthenticateToken, GetMessages);
Router.post('/chats/:chatId/read',   AuthenticateToken, MarkChatAsRead);
Router.patch('/:id',                 AuthenticateToken, ValidateRequest(EditMessageSchema), EditMessage);
Router.delete('/:id',                AuthenticateToken, DeleteMessage);
Router.post('/:id/reactions',        AuthenticateToken, ValidateRequest(ReactionSchema), AddReaction);
Router.delete('/:id/reactions',      AuthenticateToken, ValidateRequest(ReactionSchema), RemoveReaction);
Router.post('/:id/read',             AuthenticateToken, MarkAsRead);

module.exports = Router;
