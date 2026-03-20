const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { parsePagination } = require('@pms/validators');
const { PublishMeetingCreated } = require('../events/publishers');

const CreateMeeting = async (createdBy, { workspaceId, projectId, title, description, startTime, endTime, meetingLink, participantIds }) => {
  const safeParticipantIds = Array.isArray(participantIds) ? participantIds : [];
  const meeting = await prisma.meeting.create({
    data: {
      workspaceId,
      projectId,
      title,
      description,
      startTime,
      endTime,
      meetingLink,
      createdBy,
      participants: {
        create: safeParticipantIds.map((userId) => ({ userId })),
      },
    },
    include: { participants: true },
  });

  PublishMeetingCreated(meeting).catch((err) =>
    console.error('[meeting-service] CreateMeeting — failed to publish event:', err.message)
  );

  return meeting;
};

const GetMeetings = async (workspaceId, userId, from, to, { page, limit } = {}) => {
  // Filter meetings to only those the calling user is a participant of,
  // preventing enumeration of all workspace meetings.
  const { safePage, safeLimit } = parsePagination({ page, limit });

  if (!from || !to) {
    throw new APIError(400, 'from and to are required query parameters.');
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.valueOf()) || Number.isNaN(toDate.valueOf())) {
    throw new APIError(400, 'from and to must be valid ISO date values.');
  }

  const where = {
    workspaceId,
    isActive: true,
    startTime: { gte: fromDate, lte: toDate },
    participants: { some: { userId } },
  };

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: { participants: true },
      orderBy: { startTime: 'asc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.meeting.count({ where }),
  ]);

  return { data: meetings, total, page: safePage, limit: safeLimit };
};

const GetMeetingById = async (meetingId, userId) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { participants: true },
  });

  if (!meeting) {
    throw new APIError(404, 'Meeting not found.');
  }

  const isParticipant = meeting.participants.some((p) => p.userId === userId);
  if (!isParticipant && meeting.createdBy !== userId) {
    throw new APIError(403, 'Access denied.');
  }

  return meeting;
};

const UpdateMeeting = async (meetingId, userId, updates) => {
  const meeting = await GetMeetingById(meetingId, userId);
  if (meeting.createdBy !== userId) {
    throw new APIError(403, 'Only the creator can update the meeting.');
  }

  const validFields = ['title', 'description', 'startTime', 'endTime', 'meetingLink'];
  const data = {};
  for (const field of validFields) {
    if (updates[field] !== undefined) {
      data[field] = updates[field];
    }
  }

  return prisma.meeting.update({
    where: { id: meetingId },
    data,
  });
};

const CancelMeeting = async (meetingId, userId) => {
  const meeting = await GetMeetingById(meetingId, userId);
  if (meeting.createdBy !== userId) {
    throw new APIError(403, 'Only the creator can cancel the meeting.');
  }

  return prisma.meeting.update({
    where: { id: meetingId },
    data: { isActive: false },
  });
};

const UpdateRSVP = async (meetingId, userId, rsvp) => {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new APIError(404, 'Meeting not found');
  if (!meeting.isActive) throw new APIError(400, 'Meeting is not active');

  const result = await prisma.meetingParticipant.updateMany({
    where: { meetingId, userId },
    data: { rsvp },
  });

  if (result.count === 0) {
    throw new APIError(404, 'Not a participant.');
  }
};

const AddParticipant = async (meetingId, requesterId, userId) => {
  const meeting = await GetMeetingById(meetingId, requesterId);
  if (meeting.createdBy !== requesterId) {
    throw new APIError(403, 'Only the creator can add participants.');
  }

  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId, userId } },
    update: {},
    create: { meetingId, userId },
  });
};

const RemoveParticipant = async (meetingId, requesterId, userId) => {
  const meeting = await GetMeetingById(meetingId, requesterId);
  if (meeting.createdBy !== requesterId) {
    throw new APIError(403, 'Only the creator can remove participants.');
  }

  await prisma.meetingParticipant.deleteMany({ where: { meetingId, userId } });
};

module.exports = {
  CreateMeeting,
  GetMeetings,
  GetMeetingById,
  UpdateMeeting,
  CancelMeeting,
  UpdateRSVP,
  AddParticipant,
  RemoveParticipant,
};