const Router   = require('express').Router();
const { z }    = require('zod');

const { AuthenticateToken }    = require('@pms/auth-middleware');
const { ValidateRequest }      = require('@pms/validators');
const { GetMe, UpdateProfile } = require('../controllers/auth.controller');

const UpdateProfileSchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters').optional(),
  profilePicture: z.url().optional(),
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

module.exports = Router;
