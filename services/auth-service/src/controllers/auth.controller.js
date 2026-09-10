const { CatchAsync }  = require('@pms/error-handler');
const Session         = require('supertokens-node/recipe/session');
const AuthService     = require('../services/auth.service');

const GetMe = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  const user   = await AuthService.GetUserById(userId);
  res.status(200).json({ status: 'success', data: user });
});

const UpdateProfile = CatchAsync(async (req, res) => {
  const userId = req.session.getUserId();
  const { name, profilePicture } = req.body;

  const user = await AuthService.UpdateUser(userId, { name, profilePicture });
  res.status(200).json({ status: 'success', data: user });
});

// Step 1 — POST /api/v1/auth/forgot-password { email }
const ForgotPassword = CatchAsync(async (req, res) => {
  const { email } = req.body;
  const data = await AuthService.StartPasswordReset(email);
  res.status(200).json({ status: 'success', data });
});

// Step 2 — POST /api/v1/auth/verify-reset-otp { userId, otp }
const VerifyResetOtp = CatchAsync(async (req, res) => {
  const { userId, otp } = req.body;
  const data = await AuthService.VerifyResetOtp(userId, otp);
  res.status(200).json({ status: 'success', data });
});

// Step 3 — POST /api/v1/auth/reset-password { userId, resetToken, newPassword }
const ResetPassword = CatchAsync(async (req, res) => {
  const { userId, resetToken, newPassword } = req.body;
  const data = await AuthService.ResetPassword(userId, resetToken, newPassword);
  res.status(200).json({ status: 'success', data });
});

const UpdateUserRole = CatchAsync(async (req, res) => {
  const { userId } = req.params;
  const { role }   = req.body;

  const user = await AuthService.UpdateUserRole(userId, role);
  await Session.revokeAllSessionsForUser(userId);
  res.status(200).json({ status: 'success', data: user });
});

// Internal service-to-service: resolve a userId to its email. Guarded upstream
// by the x-internal-api-key check in internal.routes.js.
const GetUserEmailInternal = CatchAsync(async (req, res) => {
  const { id } = req.params;
  const email  = await AuthService.GetUserEmailById(id);
  res.status(200).json({ status: 'success', data: { email } });
});

// Internal service-to-service: org-wide user list. Guarded upstream by the
// x-internal-api-key check in internal.routes.js. Maps `id` → `_id` to match
// the frontend's OrganizationUser shape that consuming services pass through.
const ListUsersInternal = CatchAsync(async (_req, res) => {
  const users = (await AuthService.ListUsers()).map((u) => ({
    _id: u.id,
    name: u.name,
    email: u.email,
    profilePicture: u.profilePicture,
  }));
  res.status(200).json({ status: 'success', users, data: users });
});

module.exports = { GetMe, UpdateProfile, UpdateUserRole, GetUserEmailInternal, ListUsersInternal, ForgotPassword, VerifyResetOtp, ResetPassword };
