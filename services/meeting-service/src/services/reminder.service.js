const prisma = require('../config/prisma');
const Email = require('./email.service');

async function CheckReminders() {
  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);
  const in16 = new Date(now.getTime() + 16 * 60 * 1000);

  const meetings = await prisma.meeting.findMany({
    where: {
      isActive: true,
      startTime: { gte: in15, lt: in16 },
    },
    include: { participants: true },
  });

  for (const meeting of meetings) {
    const acceptedParticipants = meeting.participants.filter(p => p.rsvp !== 'declined');
    for (const participant of acceptedParticipants) {
      await Email.SendMeetingReminder(participant.userId, meeting);
    }
  }
}

function StartReminderChecker() {
  CheckReminders(); 
  setInterval(CheckReminders, 60 * 1000);
}

module.exports = { StartReminderChecker };