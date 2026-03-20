const Router  = require('express').Router();
const { z }   = require('zod');

const { AuthenticateToken, RequireRole }              = require('@pms/auth-middleware');
const { ValidateRequest, ValidateQuery, PaginationSchema, CreateWorkspaceSchema,
        UpdateWorkspaceSchema, InviteMemberSchema,
        AcceptInviteSchema }                         = require('@pms/validators');

const { CreateWorkspace, GetMyWorkspaces, GetWorkspace,
        UpdateWorkspace, DeleteWorkspace,
        TransferOwnership }                          = require('../controllers/workspace.controller');

const { GetMembers, RemoveMember, ChangeMemberRole,
        InviteMember, AcceptInvite,
        RevokeInvite }                               = require('../controllers/member.controller');

// ─── Local schemas ────────────────────────────────────────────────────────────

const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
}).strict();

const ChangeRoleBodySchema = z.object({
  role: z.enum(['admin', 'project_head', 'team_lead', 'member']),
}).strict();

const RevokeInviteSchema = z.object({
  email: z.string().email('Invalid email'),
}).strict();

// ─── Static routes FIRST (must appear before /:id to avoid param capture) ────

/**
 * @openapi
 * /api/v1/workspaces/accept-invite:
 *   post:
 *     tags: [Invites]
 *     summary: Accept a workspace invite using a token
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "uuid-invite-token"
 *     responses:
 *       200:
 *         description: Invite accepted — caller is now a workspace member
 *         content:
 *           application/json:
 *             example: { status: success, message: Invite accepted. }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Token not found
 *       410:
 *         description: Token already used or expired
 */
Router.post('/accept-invite', AuthenticateToken, ValidateRequest(AcceptInviteSchema), AcceptInvite);

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/workspaces:
 *   post:
 *     tags: [Workspaces]
 *     summary: Create a new workspace
 *     description: Caller is automatically added as owner.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, color]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corp
 *               description:
 *                 type: string
 *                 example: Our main workspace
 *               color:
 *                 type: string
 *                 example: "#6366f1"
 *     responses:
 *       201:
 *         description: Workspace created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/Workspace' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.post('/', AuthenticateToken, RequireRole('super_admin', 'admin'), ValidateRequest(CreateWorkspaceSchema), CreateWorkspace);

/**
 * @openapi
 * /api/v1/workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get all workspaces the caller belongs to
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Workspace' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
Router.get('/', AuthenticateToken, ValidateQuery(PaginationSchema), GetMyWorkspaces);

/**
 * @openapi
 * /api/v1/workspaces/{id}:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get a single workspace by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: ws-uuid-here
 *     responses:
 *       200:
 *         description: Workspace details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/Workspace' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
Router.get('/:id', AuthenticateToken, GetWorkspace);

/**
 * @openapi
 * /api/v1/workspaces/{id}:
 *   patch:
 *     tags: [Workspaces]
 *     summary: Update workspace name, description, or color
 *     description: Requires owner or admin role.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string, example: New Name }
 *               description: { type: string, example: Updated description }
 *               color:       { type: string, example: "#ec4899" }
 *     responses:
 *       200:
 *         description: Updated workspace
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/Workspace' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
Router.patch('/:id', AuthenticateToken, ValidateRequest(UpdateWorkspaceSchema), UpdateWorkspace);

/**
 * @openapi
 * /api/v1/workspaces/{id}:
 *   delete:
 *     tags: [Workspaces]
 *     summary: Delete a workspace (owner only — permanent)
 *     description: Hard delete. Cascades to all members and invites.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Workspace deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
Router.delete('/:id', AuthenticateToken, DeleteWorkspace);

/**
 * @openapi
 * /api/v1/workspaces/{id}/transfer:
 *   post:
 *     tags: [Workspaces]
 *     summary: Transfer workspace ownership to another member
 *     description: Current owner becomes admin. New owner must already be an active member.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newOwnerId]
 *             properties:
 *               newOwnerId:
 *                 type: string
 *                 format: uuid
 *                 example: user-uuid-here
 *     responses:
 *       200:
 *         description: Ownership transferred
 *       400:
 *         description: New owner not a member, or same as current owner
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
Router.post('/:id/transfer', AuthenticateToken, ValidateRequest(TransferOwnershipSchema), TransferOwnership);

// ─── Members ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/workspaces/{id}/members:
 *   get:
 *     tags: [Members]
 *     summary: List all active members of a workspace
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/WorkspaceMember' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
Router.get('/:id/members', AuthenticateToken, GetMembers);

/**
 * @openapi
 * /api/v1/workspaces/{id}/members/{userId}:
 *   delete:
 *     tags: [Members]
 *     summary: Remove a member from the workspace
 *     description: Owner cannot be removed. Members can remove themselves (self-leave). Admin or owner required to remove others.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Member removed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
Router.delete('/:id/members/:userId', AuthenticateToken, RemoveMember);

/**
 * @openapi
 * /api/v1/workspaces/{id}/members/{userId}/role:
 *   patch:
 *     tags: [Members]
 *     summary: Change a member's role
 *     description: Requires owner or admin. Cannot change the owner's role — use transfer ownership instead.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
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
 *                 enum: [admin, project_head, team_lead, member]
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/WorkspaceMember' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
Router.patch('/:id/members/:userId/role', AuthenticateToken, ValidateRequest(ChangeRoleBodySchema), ChangeMemberRole);

// ─── Invites ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/workspaces/{id}/invite:
 *   post:
 *     tags: [Invites]
 *     summary: Send a workspace invite email
 *     description: Requires owner or admin. Cannot invite as owner.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newmember@example.com
 *               role:
 *                 type: string
 *                 enum: [admin, project_head, team_lead, member]
 *     responses:
 *       201:
 *         description: Invite created and email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/WorkspaceInvite' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Active invite already exists for this email
 */
Router.post('/:id/invite', AuthenticateToken, ValidateRequest(InviteMemberSchema), InviteMember);

/**
 * @openapi
 * /api/v1/workspaces/{id}/invite:
 *   delete:
 *     tags: [Invites]
 *     summary: Revoke a pending invite
 *     description: Requires owner or admin. Only works on invites that have not been accepted.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newmember@example.com
 *     responses:
 *       204:
 *         description: Invite revoked
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No active invite found for this email
 */
Router.delete('/:id/invite', AuthenticateToken, ValidateRequest(RevokeInviteSchema), RevokeInvite);

module.exports = Router;
