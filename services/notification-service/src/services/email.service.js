const Nodemailer = require('nodemailer');

let _transporter = null;

const _escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const _getTransporter = () => {
    if (!_transporter) {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const allowInvalidTls = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false';

        if (!host || !process.env.SMTP_PORT || !user || !pass) {
            throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are required.');
        }

        if (!Number.isFinite(port)) {
            throw new Error('SMTP_PORT must be a valid number.');
        }

        _transporter = Nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            tls: { rejectUnauthorized: !allowInvalidTls },
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
        console.error('[email-service] Failed to send email:', err.message);
        return false;
    }
};

const SendTaskAssigned = async ({ recipientEmail, taskTitle, projectName }) => {
    const safeTaskTitle = _escapeHtml(taskTitle);
    const safeProjectName = _escapeHtml(projectName);
    const plainTaskTitle = String(taskTitle ?? 'Task');

    return _send({
        to: recipientEmail,
        subject: `[PMS] Task assigned: ${plainTaskTitle}`,
        html: `<p>You have been assigned task <strong>${safeTaskTitle}</strong> in project <strong>${safeProjectName}</strong>.</p>`,
    });
};

const SendTaskApproved = async ({ recipientEmail, taskTitle }) => {
    const safeTaskTitle = _escapeHtml(taskTitle);
    const plainTaskTitle = String(taskTitle ?? 'Task');

    return _send({
        to: recipientEmail,
        subject: `[PMS] Task approved: ${plainTaskTitle}`,
        html: `<p>Your task <strong>${safeTaskTitle}</strong> has been approved.</p>`,
    });
};

const SendTaskRejected = async ({ recipientEmail, taskTitle, reason }) => {
    const safeTaskTitle = _escapeHtml(taskTitle);
    const safeReason = _escapeHtml(reason);
    const plainTaskTitle = String(taskTitle ?? 'Task');

    return _send({
        to: recipientEmail,
        subject: `[PMS] Task needs rework: ${plainTaskTitle}`,
        html: `<p>Task <strong>${safeTaskTitle}</strong> was sent back. Reason: ${safeReason}</p>`,
    });
};

module.exports = { SendTaskAssigned, SendTaskApproved, SendTaskRejected };