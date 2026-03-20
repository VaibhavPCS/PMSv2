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
    include: { participants: { where: { reminderSentAt: null } } },
  });

  for (const meeting of meetings) {
    const acceptedParticipants = meeting.participants.filter((p) => p.rsvp !== 'declined');
    for (const participant of acceptedParticipants) {
      let claimAt = null;
      let claimed = { count: 0 };
      try {
        // Atomic claim: only send if this instance is the first to update the row
        claimAt = new Date();
        claimed = await prisma.meetingParticipant.updateMany({
          where: { meetingId: meeting.id, userId: participant.userId, reminderSentAt: null },
          data: { reminderSentAt: claimAt },
        });

        if (claimed.count === 0) continue;

        await Email.SendMeetingReminder(participant.userId, {
          ...meeting,
          participantEmail: participant.email,
        });
      } catch (err) {
        if (claimed.count === 1 && claimAt) {
          await prisma.meetingParticipant.updateMany({
            where: { meetingId: meeting.id, userId: participant.userId, reminderSentAt: claimAt },
            data: { reminderSentAt: null },
          }).catch((rollbackErr) => {
            console.error('[meeting-reminder] Failed to rollback reminder claim', {
              meetingId: meeting.id,
              userId: participant.userId,
              error: rollbackErr.message,
            });
          });
        }

        console.error('[meeting-reminder] Failed to send reminder', {
          meetingId: meeting.id,
          userId: participant.userId,
          error: err.message,
        });
      }
    }
  }
}

function StartReminderChecker() {
  const delayMs = 60 * 1000;

  const run = async () => {
    try {
      await CheckReminders();
    } catch (err) {
      console.error('[meeting-reminder] Checker failed:', err.message);
    } finally {
      setTimeout(run, delayMs);
    }
  };

  return run();
}

module.exports = { CheckReminders, StartReminderChecker };