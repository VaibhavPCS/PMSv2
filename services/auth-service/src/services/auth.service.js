const Nodemailer = require('nodemailer');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const { OTP_EXPIRY_MS, OTP_LENGTH } = require('@pms/constants');

const prisma = require('../config/prisma');
const { APIError } = require('@pms/error-handler');
const { PublishUserRegistered, PublishUserUpdated } = require('../events/publishers');

// ---------------------------------------------------------------------------
// Password-reset OTP store.
// The new Prisma `users` table has NO otp / otpExpiresAt / resetToken columns
// (see prisma/schema.prisma), and the password itself lives in SuperTokens, not
// Prisma. We therefore keep the OLD monolith's "OTP-by-email then reset" UX by:
//   1. minting a real SuperTokens reset token (createResetPasswordToken), and
//   2. pairing it with a short numeric OTP held in this in-process map keyed by
//      userId, so the user types the OTP they received by email.
// The actual password change is done by SuperTokens (resetPasswordUsingToken) —
// we never hash or store passwords ourselves. The map is best-effort, single
// instance; entries auto-expire and are deleted on success.
// ---------------------------------------------------------------------------
const _resetStore = new Map(); // userId -> { otp, resetToken, expiresAt }

const _generateOtp = () => {
  const len = OTP_LENGTH || 6;
  let otp = '';
  for (let i = 0; i < len; i += 1) otp += Math.floor(Math.random() * 10);
  return otp;
};

let _transporter = null;
const _getTransporter = () => {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !process.env.SMTP_PORT || !user || !pass) return null; // not configured
  _transporter = Nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false'
      ? { tls: { rejectUnauthorized: false } }
      : {}),
  });
  return _transporter;
};

const _sendResetEmail = async (to, otp, name) => {
  const transporter = _getTransporter();
  if (!transporter) {
    // No SMTP configured (local/dev/test) — log so the flow stays testable
    // instead of failing the request. Mirrors the OLD monolith's dev bypass.
    console.log(`[auth-service] password-reset OTP for ${to}: ${otp} (SMTP not configured — email skipped)`);
    return false;
  }
  const from = process.env.SMTP_FROM || `"PMS Team" <${process.env.SMTP_USER}>`;
  await transporter.sendMail({
    from,
    to,
    subject: 'Your PMS password reset code',
    html: `<p>Hi ${name || 'there'},</p>
<p>Your password reset code is:</p>
<h2 style="letter-spacing:4px">${otp}</h2>
<p>This code expires in ${Math.round((OTP_EXPIRY_MS || 300000) / 60000)} minutes. If you didn't request this, ignore this email.</p>`,
  });
  return true;
};

const CreateUser = async (id, name, email) => {
  const trimmedName = typeof name === 'string' ? name.trim() : name;
  const user = await prisma.user.create({ data: { id, name: trimmedName, email } });
  await PublishUserRegistered(id, trimmedName, email);
  return user;
};

const GetUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError(404, 'User not found.');
  return user;
};

// Internal-only lookup: returns just the email for a userId. Used by other
// services (via the guarded /internal route) to bind actions to a user's email.
const GetUserEmailById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!user) throw new APIError(404, 'User not found.');
  return user.email;
};

// Internal-only: org-wide list of active users. Used by other services (via the
// guarded /internal route) — e.g. comms-service's chat user picker.
const ListUsers = async () => {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, profilePicture: true },
    orderBy: { name: 'asc' },
  });
};

const UpdateUser = async (id, { name, profilePicture } = {}) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (profilePicture !== undefined) data.profilePicture = profilePicture;

  const user = await prisma.user.update({ where: { id }, data });
  await PublishUserUpdated(id, data);
  return user;
};

const SetLastLogin = async (id) => {
  return prisma.user.update({
    where: { id },
    data: { lastLogin: new Date() },
  });
};

const SetActiveWorkspace = async (id, workspaceId) => {
  return prisma.user.update({
    where: { id },
    data: { activeWorkspace: workspaceId },
  });
};

// Role is validated upstream via UpdateRoleSchema (z.enum) in auth.routes.js before this is called.
const UpdateUserRole = async (id, role) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new APIError(404, 'User not found.');
  const updated = await prisma.user.update({ where: { id }, data: { role } });
  await PublishUserUpdated(id, { role });
  return updated;
};

// --- Password reset (SuperTokens-backed, OLD OTP-by-email UX) ---------------

// Step 1: forgot-password. Look the user up by email (SuperTokens is the source
// of truth for credentials), mint a real reset token, pair it with a short OTP,
// email the OTP, and return the userId the next two screens need.
const StartPasswordReset = async (email) => {
  const stUser = await EmailPassword.getUserByEmail(email);
  if (!stUser) throw new APIError(404, "Account doesn't exist");

  const tokenResult = await EmailPassword.createResetPasswordToken(stUser.id);
  if (tokenResult.status !== 'OK') throw new APIError(404, "Account doesn't exist");

  const otp = _generateOtp();
  _resetStore.set(stUser.id, {
    otp,
    resetToken: tokenResult.token,
    expiresAt: Date.now() + (OTP_EXPIRY_MS || 300000),
  });

  // Best-effort name for the email greeting; never block reset on a profile miss.
  let name;
  try {
    const profile = await prisma.user.findUnique({ where: { id: stUser.id }, select: { name: true } });
    name = profile?.name;
  } catch (_e) { /* ignore */ }

  await _sendResetEmail(email, otp, name);
  return { userId: stUser.id };
};

// Step 2: verify-reset-otp. Validate the emailed OTP and hand back the
// SuperTokens reset token the final step submits.
const VerifyResetOtp = async (userId, otp) => {
  const entry = _resetStore.get(userId);
  if (!entry) throw new APIError(400, 'No active reset request. Please request a new code.');
  if (Date.now() > entry.expiresAt) {
    _resetStore.delete(userId);
    throw new APIError(400, 'OTP has expired. Please request a new one.');
  }
  if (String(otp) !== String(entry.otp)) throw new APIError(400, 'Invalid OTP');

  return { verified: true, userId, resetToken: entry.resetToken };
};

// Step 3: reset-password. Accept either the OTP (resetToken === stored otp) or
// the SuperTokens token directly, then let SuperTokens change the password.
const ResetPassword = async (userId, resetToken, newPassword) => {
  const entry = _resetStore.get(userId);
  if (!entry) throw new APIError(400, 'Invalid or expired reset request. Please start again.');
  if (Date.now() > entry.expiresAt) {
    _resetStore.delete(userId);
    throw new APIError(400, 'Reset token has expired. Please request a new one.');
  }

  // The frontend echoes back whatever verify-reset-otp returned (the SuperTokens
  // token); also accept the raw OTP for robustness.
  const validToken =
    String(resetToken) === String(entry.resetToken) || String(resetToken) === String(entry.otp);
  if (!validToken) throw new APIError(400, 'Invalid reset token');

  const result = await EmailPassword.resetPasswordUsingToken(entry.resetToken, newPassword);
  if (result.status !== 'OK') {
    _resetStore.delete(userId);
    throw new APIError(400, 'Reset token is invalid or has expired. Please request a new one.');
  }

  _resetStore.delete(userId);
  return { reset: true };
};

module.exports = {
  CreateUser,
  GetUserById,
  GetUserEmailById,
  ListUsers,
  UpdateUser,
  SetLastLogin,
  SetActiveWorkspace,
  UpdateUserRole,
  StartPasswordReset,
  VerifyResetOtp,
  ResetPassword,
};
