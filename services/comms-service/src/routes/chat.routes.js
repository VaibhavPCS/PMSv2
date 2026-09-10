const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const {
    CreateChat, GetMyChats, GetOrganizationChats, GetOrganizationUsers, GetChatById,
    AddParticipant, RemoveParticipant, ArchiveChat, GetUnreadCount,
} = require('../controllers/chat.controller');

const CreateChatSchema = z.object({
    workspaceId:    z.string().uuid(),
    name:           z.string().trim().min(1).max(100, 'Chat name must be at most 100 characters').optional(),
    type:           z.enum(['direct', 'group']),
    participantIds: z.array(z.string().uuid()).min(1),
}).strict().refine(
    (d) => d.type !== 'group' || (typeof d.name === 'string' && d.name.trim().length > 0),
    { message: 'Group chat name is required', path: ['name'] }
);

const AddParticipantSchema = z.object({ userId: z.string().uuid() }).strict();

Router.post('/',                          AuthenticateToken, ValidateRequest(CreateChatSchema), CreateChat);
Router.get('/',                           AuthenticateToken, GetMyChats);
Router.get('/unread/count',               AuthenticateToken, GetUnreadCount);
Router.get('/organization',               AuthenticateToken, GetOrganizationChats);
Router.get('/users/organization',         AuthenticateToken, GetOrganizationUsers);
Router.get('/:id',                        AuthenticateToken, GetChatById);
Router.post('/:id/participants',          AuthenticateToken, ValidateRequest(AddParticipantSchema), AddParticipant);
Router.delete('/:id/participants/:userId',AuthenticateToken, RemoveParticipant);
Router.patch('/:id/archive',              AuthenticateToken, ArchiveChat);

module.exports = Router;
