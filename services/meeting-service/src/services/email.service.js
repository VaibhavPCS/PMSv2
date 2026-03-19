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
  } catch (err) {
    console.error('[email-service] Failed to send meeting reminder:', err.message);
  }
};

// userId is the participant's user ID. In production, resolve to an email address
// via the user-service (internal HTTP call or shared cache) before calling _send.
const SendMeetingReminder = async (userId, meeting) => {
  console.info(`[email-service] Reminder queued — user: ${userId}, meeting: "${meeting.title}", starts: ${meeting.startTime}`);
};

module.exports = { SendMeetingReminder };
