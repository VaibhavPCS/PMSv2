const Router   = require('express').Router();
const { z }    = require('zod');

const { AuthenticateToken, RequireRole } = require('@pms/auth-middleware');
const { ValidateRequest, PasswordSchema } = require('@pms/validators');
const { GetMe, UpdateProfile,
        UpdateUserRole,
        ForgotPassword, VerifyResetOtp,
        ResetPassword }                  = require('../controllers/auth.controller');

const UpdateProfileSchema = z.object({
  name:           z.string().trim().min(3, 'Name must be at least 3 characters').optional(),
  profilePicture: z.url().optional(),
}).strict();

const UpdateRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'project_head', 'team_lead', 'member']),
}).strict();

const ForgotPasswordSchema = z.object({
  email: z.email('A valid email is required'),
}).strict();

const VerifyResetOtpSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  otp:    z.string().trim().min(4, 'A valid OTP is required'),
}).strict();

const ResetPasswordSchema = z.object({
  userId:      z.string().trim().min(1, 'userId is required'),
  resetToken:  z.string().trim().min(1, 'resetToken is required'),
  newPassword: PasswordSchema,
}).strict();

// Password-reset flow — PUBLIC (the user is signed out here) and STATIC, so
// these are registered before the param route (/users/:userId/role) to ensure
// their fixed segments are never captured as an :id.

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Password Reset]
 *     summary: Start a password reset (emails an OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset OTP sent — returns the userId for the next step
 *       404:
 *         description: No account for that email
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.post('/forgot-password', ValidateRequest(ForgotPasswordSchema), ForgotPassword);

/**
 * @openapi
 * /api/v1/auth/verify-reset-otp:
 *   post:
 *     tags: [Password Reset]
 *     summary: Verify the emailed reset OTP and obtain a reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, otp]
 *             properties:
 *               userId: { type: string }
 *               otp:    { type: string }
 *     responses:
 *       200:
 *         description: OTP verified — returns { verified, resetToken }
 *       400:
 *         description: Invalid or expired OTP
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.post('/verify-reset-otp', ValidateRequest(VerifyResetOtpSchema), VerifyResetOtp);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Password Reset]
 *     summary: Set a new password using the reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, resetToken, newPassword]
 *             properties:
 *               userId:      { type: string }
 *               resetToken:  { type: string }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.post('/reset-password', ValidateRequest(ResetPasswordSchema), ResetPassword);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [User Profile]
 *     summary: Get current user profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: User profile row not found in database
 */
Router.get('/me', AuthenticateToken, GetMe);

/**
 * @openapi
 * /api/v1/auth/me:
 *   patch:
 *     tags: [User Profile]
 *     summary: Update current user profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Vaibhav Sharma
 *               profilePicture:
 *                 type: string
 *                 format: uri
 *                 example: https://cdn.example.com/avatar.png
 *     responses:
 *       200:
 *         description: Updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.patch('/me', AuthenticateToken, ValidateRequest(UpdateProfileSchema), UpdateProfile);

/**
 * @openapi
 * /api/v1/auth/users/{userId}/role:
 *   patch:
 *     tags: [User Profile]
 *     summary: Update a user's system role
 *     description: Restricted to super_admin. Revokes all active sessions for the target user — they must sign in again to receive the updated role in their token.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: f6683185-51cd-4ecf-b8b8-e9a4395bbfd9
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin, project_head, team_lead, member]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Role updated — user sessions revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: User not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.patch('/users/:userId/role', AuthenticateToken, RequireRole('super_admin'), ValidateRequest(UpdateRoleSchema), UpdateUserRole);

module.exports = Router;
