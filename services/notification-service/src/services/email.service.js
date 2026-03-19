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
        console.error('[email-service] Failed to send email:', err.message);
    }
};

const SendTaskAssigned = async ({ recipientEmail, taskTitle, projectName }) => {
    await _send({
        to: recipientEmail,
        subject: `[PMS] Task assigned: ${taskTitle}`,
        html: `<p>You have been assigned task <strong>${taskTitle}</strong> in project <strong>${projectName}</strong>.</p>`,
    });
};

const SendTaskApproved = async ({ recipientEmail, taskTitle }) => {
    await _send({
        to: recipientEmail,
        subject: `[PMS] Task approved: ${taskTitle}`,
        html: `<p>Your task <strong>${taskTitle}</strong> has been approved.</p>`,
    });
};

const SendTaskRejected = async ({ recipientEmail, taskTitle, reason }) => {
    await _send({
        to: recipientEmail,
        subject: `[PMS] Task needs rework: ${taskTitle}`,
        html: `<p>Task <strong>${taskTitle}</strong> was sent back. Reason: ${reason}</p>`,
    });
};

module.exports = { SendTaskAssigned, SendTaskApproved, SendTaskRejected };