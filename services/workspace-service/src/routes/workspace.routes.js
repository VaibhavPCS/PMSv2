const Router  = require('express').Router();
const { z }   = require('zod');

const { AuthenticateToken }                          = require('@pms/auth-middleware');
const { ValidateRequest, CreateWorkspaceSchema,
        UpdateWorkspaceSchema, InviteMemberSchema,
        AcceptInviteSchema }                         = require('@pms/validators');

const { CreateWorkspace, GetMyWorkspaces, GetWorkspace,
        UpdateWorkspace, DeleteWorkspace,
        TransferOwnership }                          = require('../controllers/workspace.controller');

const { GetMembers, RemoveMember, ChangeMemberRole,
        InviteMember, AcceptInvite,
        RevokeInvite }                               = require('../controllers/member.controller');

// ─── Local schemas (single-service use, no reason to put in @pms/validators) ──

const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
}).strict();

// ChangeMemberRole: userId is a URL param, body only carries role
const ChangeRoleBodySchema = z.object({
  role: z.enum(['admin', 'project_head', 'team_lead', 'member']),
}).strict();

const RevokeInviteSchema = z.object({
  email: z.string().email('Invalid email'),
}).strict();

// ─── Static routes FIRST (must appear before /:id to avoid param capture) ────

Router.post('/accept-invite', AuthenticateToken, ValidateRequest(AcceptInviteSchema),        AcceptInvite);

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

Router.post('/',     AuthenticateToken, ValidateRequest(CreateWorkspaceSchema), CreateWorkspace);
Router.get('/',      AuthenticateToken, GetMyWorkspaces);
Router.get('/:id',   AuthenticateToken, GetWorkspace);
Router.patch('/:id', AuthenticateToken, ValidateRequest(UpdateWorkspaceSchema), UpdateWorkspace);
Router.delete('/:id',AuthenticateToken, DeleteWorkspace);   // owner-only enforced in service

Router.post('/:id/transfer',
  AuthenticateToken, ValidateRequest(TransferOwnershipSchema), TransferOwnership);

// ─── Members ──────────────────────────────────────────────────────────────────

Router.get('/:id/members',
  AuthenticateToken, GetMembers);

Router.delete('/:id/members/:userId',
  AuthenticateToken, RemoveMember);

Router.patch('/:id/members/:userId/role',
  AuthenticateToken, ValidateRequest(ChangeRoleBodySchema), ChangeMemberRole);

// ─── Invites ──────────────────────────────────────────────────────────────────

Router.post('/:id/invite',
  AuthenticateToken, ValidateRequest(InviteMemberSchema), InviteMember);

Router.delete('/:id/invite',
  AuthenticateToken, ValidateRequest(RevokeInviteSchema), RevokeInvite);

module.exports = Router;
