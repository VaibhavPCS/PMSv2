const Nodemailer = require('nodemailer');

const EMAIL_RESOLVE_TIMEOUT_MS = Number(process.env.EMAIL_RESOLVE_TIMEOUT_MS || 5000);

const _escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const _sanitizeMeetingLink = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const _sanitizeEmailHeader = (value, maxLength = 160) => String(value ?? '')
  .replace(/[\r\n]+/g, ' ')
  .trim()
  .slice(0, maxLength);

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
  await _getTransporter().sendMail({
    from: `"PMS" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

const _resolveEmail = async (userId) => {
  const uri = process.env.SUPERTOKENS_CONNECTION_URI;
  const apiKey = process.env.SUPERTOKENS_API_KEY;
  const url = `${uri}/recipe/user?userId=${encodeURIComponent(userId)}`;

  let timeoutId = null;
  const controller = new AbortController();

  try {
    if (!uri) {
      console.error(`[email-service] Missing SUPERTOKENS_CONNECTION_URI while resolving email for userId=${userId}`);
      return null;
    }

    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      const timeoutSignal = AbortSignal.timeout(EMAIL_RESOLVE_TIMEOUT_MS);
      timeoutSignal.addEventListener('abort', () => controller.abort(timeoutSignal.reason), { once: true });
    } else {
      timeoutId = setTimeout(() => controller.abort(new Error('email lookup timed out')), EMAIL_RESOLVE_TIMEOUT_MS);
    }

    const res = await fetch(url, {
      headers: { 'api-key': apiKey || '' },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    return data?.user?.email ?? data?.user?.emails?.[0] ?? null;
  } catch (err) {
    const timeoutReason = controller.signal.aborted ? ` abortReason=${String(controller.signal.reason || 'timeout')}` : '';
    console.error(`[email-service] Failed to resolve email userId=${userId} url=${url}${timeoutReason}:`, err);
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const SendMeetingReminder = async (userId, meeting) => {
  const email = meeting.participantEmail || await _resolveEmail(userId);
  const safeMeetingLink = _sanitizeMeetingLink(meeting.meetingLink);

  if (!email) {
    console.warn(`[email-service] Could not resolve email for userId=${userId} — skipping reminder for "${meeting.title}"`);
    return;
  }

  const startFormatted = new Date(meeting.startTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await _send({
    to:      email,
    subject: `Reminder: "${_sanitizeEmailHeader(meeting.title)}" starts in 15 minutes`,
    html: `
      <p>Hi,</p>
      <p>This is a reminder that <strong>${_escapeHtml(meeting.title)}</strong> is starting soon.</p>
      <p><strong>Time:</strong> ${startFormatted}</p>
      ${meeting.description ? `<p>${_escapeHtml(meeting.description)}</p>` : ''}
      ${safeMeetingLink
        ? `<p><a href="${_escapeHtml(safeMeetingLink)}" style="color:#6366f1">Join the meeting →</a></p>`
        : ''}
      <p style="color:#888;font-size:12px">— PMS</p>
    `,
  });
};

module.exports = { SendMeetingReminder };