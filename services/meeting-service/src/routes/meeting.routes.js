const Router = require('express').Router();
const { z } = require('zod');

const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest } = require('@pms/validators');
const { CreateMeeting, GetMeetings, GetMeetingById, UpdateMeeting, CancelMeeting, UpdateRSVP, AddParticipant, RemoveParticipant } = require('../controllers/meeting.controller');

const CreateMeetingSchema = z.object({
    workspaceId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    title: z.string().min(2),
    description: z.string().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    meetingLink: z.string().url().optional(),
    participantIds: z.array(z.string().uuid()).min(1),
}).strict();

const RSVPSchema = z.object({ rsvp: z.enum(['accepted', 'declined']) }).strict();

Router.post('/', AuthenticateToken, ValidateRequest(CreateMeetingSchema), CreateMeeting);
Router.get('/', AuthenticateToken, GetMeetings);
Router.get('/:id', AuthenticateToken, GetMeetingById);
Router.patch('/:id', AuthenticateToken, UpdateMeeting);
Router.delete('/:id', AuthenticateToken, CancelMeeting);
Router.patch('/:id/rsvp', AuthenticateToken, ValidateRequest(RSVPSchema), UpdateRSVP);
Router.post('/:id/participants', AuthenticateToken, AddParticipant);
Router.delete('/:id/participants/:userId', AuthenticateToken, RemoveParticipant);

module.exports = Router;