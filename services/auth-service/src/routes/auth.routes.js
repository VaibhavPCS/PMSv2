const Router   = require('express').Router();
const { z }    = require('zod');

const { AuthenticateToken, RequireRole } = require('@pms/auth-middleware');
const { ValidateRequest }                = require('@pms/validators');
const { GetMe, UpdateProfile,
        UpdateUserRole }                 = require('../controllers/auth.controller');

const UpdateProfileSchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters').optional(),
  profilePicture: z.url().optional(),
}).strict();

const UpdateRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'project_head', 'team_lead', 'member']),
}).strict();

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
