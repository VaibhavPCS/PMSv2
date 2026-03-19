const { CatchAsync } = require('@pms/error-handler');
const MeetingService = require('../services/meeting.service');

const CreateMeeting = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const meeting = await MeetingService.CreateMeeting(userId, req.body);
    res.status(201).json({ status: 'success', data: meeting });
});

const GetMeetings = CatchAsync(async (req, res) => {
    const { workspaceId, from, to } = req.query;
    const meetings = await MeetingService.GetMeetings(workspaceId, from, to);
    res.status(200).json({ status: 'success', data: meetings });
});

const GetMeetingById = CatchAsync(async (req, res) => {
    const meeting = await MeetingService.GetMeetingById(req.params.id);
    res.status(200).json({ status: 'success', data: meeting });
});

const UpdateMeeting = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const meeting = await MeetingService.UpdateMeeting(req.params.id, userId, req.body);
    res.status(200).json({ status: 'success', data: meeting });
});

const CancelMeeting = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MeetingService.CancelMeeting(req.params.id, userId);
    res.status(200).json({ status: 'success', data: null });
});

const UpdateRSVP = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MeetingService.UpdateRSVP(req.params.id, userId, req.body.rsvp);
    res.status(200).json({ status: 'success', data: null });
});

const AddParticipant = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MeetingService.AddParticipant(req.params.id, userId, req.body.userId);
    res.status(200).json({ status: 'success', data: null });
});

const RemoveParticipant = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    await MeetingService.RemoveParticipant(req.params.id, userId, req.params.userId);
    res.status(200).json({ status: 'success', data: null });
});

module.exports = {
    CreateMeeting, GetMeetings, GetMeetingById, UpdateMeeting,
    CancelMeeting, UpdateRSVP, AddParticipant, RemoveParticipant,
};