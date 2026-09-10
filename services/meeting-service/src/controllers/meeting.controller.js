const { CatchAsync } = require('@pms/error-handler');
const MeetingService = require('../services/meeting.service');

const CreateMeeting = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const meeting = await MeetingService.CreateMeeting(userId, req.body);
    res.status(201).json({ status: 'success', data: meeting });
});

const GetMeetings = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const { from, to, page, limit } = req.query;
    // The frontend sends the active workspace via the 'workspace-id' header and
    // the meetings list page sends no time window — default to ±1 year.
    const workspaceId = req.query.workspaceId || req.headers['workspace-id'];
    const now = Date.now();
    const fromDate = from || new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
    const toDate   = to   || new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
    const meetings = await MeetingService.GetMeetings(workspaceId, userId, fromDate, toDate, { page, limit });
    res.status(200).json({ status: 'success', data: meetings });
});

const GetMeetingById = CatchAsync(async (req, res) => {
    const userId = req.session.getUserId();
    const meeting = await MeetingService.GetMeetingById(req.params.id, userId);
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