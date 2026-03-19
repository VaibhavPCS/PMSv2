const Router = require('express').Router();
const { z } = require('zod');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const {
    CreateChat, GetMyChats, GetChatById,
    AddParticipant, RemoveParticipant, ArchiveChat,
} = require('../controllers/chat.controller');

const CreateChatSchema = z.object({
    workspaceId:    z.string().uuid(),
    name:           z.string().min(1).optional(),
    type:           z.enum(['direct', 'group']),
    participantIds: z.array(z.string().uuid()).min(1),
}).strict();

const AddParticipantSchema = z.object({ userId: z.string().uuid() }).strict();

Router.post('/',                          AuthenticateToken, ValidateRequest(CreateChatSchema), CreateChat);
Router.get('/',                           AuthenticateToken, GetMyChats);
Router.get('/:id',                        AuthenticateToken, GetChatById);
Router.post('/:id/participants',          AuthenticateToken, ValidateRequest(AddParticipantSchema), AddParticipant);
Router.delete('/:id/participants/:userId',AuthenticateToken, RemoveParticipant);
Router.patch('/:id/archive',              AuthenticateToken, ArchiveChat);

module.exports = Router;
