const Router = require('express').Router();
const { z } = require('zod');

const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, ValidateQuery, GetMeetingsQuerySchema } = require('@pms/validators');
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
}).strict().refine((obj) => new Date(obj.endTime) > new Date(obj.startTime), {
    message: 'endTime must be after startTime',
    path: ['endTime'],
});

const IdParamSchema = z.object({ id: z.string().uuid() }).strict();
const IdAndUserParamSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() }).strict();
const AddParticipantSchema = z.object({ userId: z.string().uuid() }).strict();
const UpdateMeetingSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    meetingLink: z.string().url().optional(),
}).strict().refine((obj) => {
    if (!obj.startTime || !obj.endTime) return true;
    return new Date(obj.endTime) > new Date(obj.startTime);
}, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
});

const RSVPSchema = z.object({ rsvp: z.enum(['accepted', 'declined']) }).strict();

Router.post('/', AuthenticateToken, ValidateRequest(CreateMeetingSchema), CreateMeeting);
Router.get('/', AuthenticateToken, ValidateQuery(GetMeetingsQuerySchema), GetMeetings);
Router.get('/:id', AuthenticateToken, ValidateRequest(IdParamSchema), GetMeetingById);
Router.patch('/:id', AuthenticateToken, ValidateRequest(IdParamSchema), ValidateRequest(UpdateMeetingSchema), UpdateMeeting);
Router.delete('/:id', AuthenticateToken, ValidateRequest(IdParamSchema), CancelMeeting);
Router.patch('/:id/rsvp', AuthenticateToken, ValidateRequest(RSVPSchema), UpdateRSVP);
Router.post('/:id/participants', AuthenticateToken, ValidateRequest(IdParamSchema), ValidateRequest(AddParticipantSchema), AddParticipant);
Router.delete('/:id/participants/:userId', AuthenticateToken, ValidateRequest(IdAndUserParamSchema), RemoveParticipant);

module.exports = Router;