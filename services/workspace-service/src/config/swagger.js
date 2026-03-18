const SwaggerJsdoc = require('swagger-jsdoc');
const path         = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title:       'PMS — Workspace Service',
    version:     '1.0.0',
    description: 'Manages workspaces, members, and invites. Owns `pms_workspace` database.\n\nUser references are plain UUID strings — never cross-queries `pms_auth`.',
  },
  servers: [
    { url: 'http://localhost:4002', description: 'Local development' },
  ],
  tags: [
    { name: 'Workspaces', description: 'Create, read, update, delete workspaces' },
    { name: 'Members',    description: 'Manage workspace membership and roles' },
    { name: 'Invites',    description: 'Send, accept, and revoke workspace invites' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type:        'apiKey',
        in:          'cookie',
        name:        'sAccessToken',
        description: 'SuperTokens session cookie — obtained from auth-service login',
      },
    },
    schemas: {
      Workspace: {
        type: 'object',
        properties: {
          id:          { type: 'string', example: 'ws-uuid-here' },
          name:        { type: 'string', example: 'Acme Corp' },
          description: { type: 'string', nullable: true, example: 'Our main workspace' },
          color:       { type: 'string', example: '#6366f1' },
          ownerId:     { type: 'string', example: 'user-uuid-here' },
          isActive:    { type: 'boolean', example: true },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },
      WorkspaceMember: {
        type: 'object',
        properties: {
          id:          { type: 'string', example: 'member-uuid' },
          workspaceId: { type: 'string', example: 'ws-uuid-here' },
          userId:      { type: 'string', example: 'user-uuid-here' },
          role:        { type: 'string', enum: ['owner', 'admin', 'project_head', 'team_lead', 'member'] },
          isActive:    { type: 'boolean', example: true },
          joinedAt:    { type: 'string', format: 'date-time' },
        },
      },
      WorkspaceInvite: {
        type: 'object',
        properties: {
          id:          { type: 'string', example: 'invite-uuid' },
          workspaceId: { type: 'string', example: 'ws-uuid-here' },
          email:       { type: 'string', format: 'email', example: 'newmember@example.com' },
          role:        { type: 'string', enum: ['admin', 'project_head', 'team_lead', 'member'] },
          expiresAt:   { type: 'string', format: 'date-time' },
          acceptedAt:  { type: 'string', format: 'date-time', nullable: true },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status:  { type: 'string', example: 'fail' },
          message: { type: 'string', example: 'Something went wrong.' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Session missing or expired',
        content: {
          'application/json': {
            schema:  { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Session invalid. Please log in again.' },
          },
        },
      },
      Forbidden: {
        description: 'Authenticated but insufficient role for this workspace',
        content: {
          'application/json': {
            schema:  { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Only owners and admins can perform this action.' },
          },
        },
      },
      NotFound: {
        description: 'Workspace or member not found',
        content: {
          'application/json': {
            schema:  { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Workspace not found.' },
          },
        },
      },
      ValidationError: {
        description: 'Request body failed Zod validation',
        content: {
          'application/json': {
            schema:  { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Validation failed. name: String must contain at least 1 character(s).' },
          },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '../routes/*.js')],
});
