const Nodemailer = require('nodemailer');

let _transporter = null;
const _getTransporter = () => {
  if (!_transporter) {
    _transporter = Nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return _transporter;
};

const _send = async ({ to, subject, html }) => {
  try {
    await _getTransporter().sendMail({
      from: `"PMS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[email-service] Failed to send meeting reminder:', err.message);
    return false;
  }
};

const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sanitizeSubjectText = (str) => String(str)
  .replace(/[\r\n]+/g, ' ')
  .replace(/[\x00-\x1F\x7F]/g, '')
  .trim();

const SendMeetingReminder = async (userId, meeting) => {
  const redactedUser = typeof userId === 'string' ? `${userId.slice(0, 4)}...` : 'unknown';

  if (!meeting) {
    throw new Error(`Cannot send meeting reminder: meeting is null or undefined. user=${redactedUser}`);
  }

  const to = meeting.participantEmail;

  if (!to) {
    throw new Error(`Cannot send meeting reminder: participant email missing for meeting ${meeting.id}. user=${redactedUser}`);
  }

  const safeTitle = escapeHtml(meeting.title);
  const subjectTitle = sanitizeSubjectText(meeting.title || 'Untitled meeting');
  const sent = await _send({
    to,
    subject: `[PMS] Reminder: ${subjectTitle}`,
    html: `<p>Reminder: meeting <strong>${safeTitle}</strong> starts at ${new Date(meeting.startTime).toISOString()}.</p>`,
  });

  if (!sent) {
    throw new Error(`Failed to send meeting reminder for meeting ${meeting.id}.`);
  }
};

module.exports = { SendMeetingReminder };
