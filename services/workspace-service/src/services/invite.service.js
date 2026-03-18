const Nodemailer        = require('nodemailer');
const prisma            = require('../config/prisma');
const { APIError }      = require('@pms/error-handler');
const { ROLES, DAY_MS } = require('@pms/constants');
const { PublishMemberAdded } = require('../events/publishers');

const _requireAdminOrOwner = async (workspaceId, requesterId) => {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: requesterId, isActive: true },
  });
  if (!member) throw new APIError(404, 'Workspace not found.');
  if (member.role !== ROLES.OWNER && member.role !== ROLES.ADMIN) {
    throw new APIError(403, 'Only owners and admins can manage invites.');
  }
};

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

const CreateInvite = async (workspaceId, email, role, requesterId) => {
  await _requireAdminOrOwner(workspaceId, requesterId);

  if (role === ROLES.OWNER) {
    throw new APIError(400, 'Cannot invite someone as owner. Use transfer ownership.');
  }

  const existing = await prisma.workspaceInvite.findFirst({
    where: { workspaceId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existing) {
    throw new APIError(409, 'An active invite already exists for this email.');
  }

  const invite = await prisma.workspaceInvite.create({
    data: { workspaceId, email, role, expiresAt: new Date(Date.now() + 7 * DAY_MS) },
  });

  const inviteLink = `${process.env.WEBSITE_DOMAIN}/invite/accept?token=${invite.token}`;

  await _getTransporter().sendMail({
    from:    process.env.SMTP_USER,
    to:      email,
    subject: 'You have been invited to join a workspace',
    text:    `Accept your invite here: ${inviteLink}\n\nThis link expires in 7 days.`,
    html:    `<p>You have been invited to join a workspace.</p>
              <p><a href="${inviteLink}">Accept Invite</a></p>
              <p>This link expires in 7 days.</p>`,
  });

  return invite;
};

const ValidateInvite = async (token) => {
  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite)           throw new APIError(404, 'Invite not found.');
  if (invite.acceptedAt) throw new APIError(410, 'Invite has already been used.');
  if (invite.expiresAt < new Date()) throw new APIError(410, 'Invite has expired.');
  return invite;
};

const AcceptInvite = async (token, userId) => {
  const invite = await ValidateInvite(token);

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.upsert({
      where:  { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      update: { isActive: true, role: invite.role },
      create: { workspaceId: invite.workspaceId, userId, role: invite.role },
    });
    await tx.workspaceInvite.update({
      where: { token },
      data:  { acceptedAt: new Date() },
    });
  });

  await PublishMemberAdded(invite.workspaceId, userId, invite.role);
};

const RevokeInvite = async (workspaceId, email, requesterId) => {
  await _requireAdminOrOwner(workspaceId, requesterId);

  const invite = await prisma.workspaceInvite.findFirst({
    where: { workspaceId, email, acceptedAt: null },
  });
  if (!invite) throw new APIError(404, 'No active invite found for this email.');

  await prisma.workspaceInvite.delete({ where: { id: invite.id } });
};

module.exports = {
  CreateInvite,
  ValidateInvite,
  AcceptInvite,
  RevokeInvite,
};
