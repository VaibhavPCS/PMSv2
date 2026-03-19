const SwaggerJsdoc = require('swagger-jsdoc');
const path         = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title:       'PMS — Project Service',
    version:     '1.0.0',
    description: [
      'Manages projects, project members, and deadline history. Owns `pms_project` database.',
      '',
      'Workspace references are plain UUID strings — no cross-DB queries to `pms_workspace`.',
      'Workspace admin/owner permissions are enforced via a local `WorkspaceRoleCache` table,',
      'kept in sync by consuming `MEMBER_ADDED` / `MEMBER_ROLE_CHANGED` Kafka events.',
      '',
      '**Deadline extension** is admin/owner-only and is fully audited via `ProjectDateHistory`.',
    ].join('\n'),
  },
  servers: [
    { url: 'http://localhost:4003', description: 'Local development' },
  ],
  tags: [
    { name: 'Projects', description: 'Create, read, update, delete projects and extend deadlines' },
    { name: 'Members',  description: 'Add, remove, and change roles of project members' },
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
      Project: {
        type: 'object',
        properties: {
          id:            { type: 'string', example: 'proj-uuid' },
          workspaceId:   { type: 'string', example: 'ws-uuid' },
          name:          { type: 'string', example: 'PMS Rewrite' },
          description:   { type: 'string', nullable: true },
          state:         { type: 'string', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
          projectStatus: { type: 'string', enum: ['on_track', 'at_risk', 'off_track', 'completed'] },
          startDate:     { type: 'string', format: 'date-time' },
          endDate:       { type: 'string', format: 'date-time' },
          tags:          { type: 'array', items: { type: 'string' } },
          createdBy:     { type: 'string', example: 'user-uuid' },
          isActive:      { type: 'boolean', example: true },
          createdAt:     { type: 'string', format: 'date-time' },
          updatedAt:     { type: 'string', format: 'date-time' },
          members:       { type: 'array', items: { $ref: '#/components/schemas/ProjectMember' } },
          dateHistory:   { type: 'array', items: { $ref: '#/components/schemas/DateHistory' } },
        },
      },
      ProjectMember: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          projectId:   { type: 'string' },
          userId:      { type: 'string' },
          role:        { type: 'string', enum: ['project_head', 'tl', 'trainee', 'member'] },
          isActive:    { type: 'boolean' },
          joinedAt:    { type: 'string', format: 'date-time' },
        },
      },
      DateHistory: {
        type: 'object',
        properties: {
          id:         { type: 'string' },
          projectId:  { type: 'string' },
          oldEndDate: { type: 'string', format: 'date-time' },
          newEndDate: { type: 'string', format: 'date-time' },
          reason:     { type: 'string' },
          extendedBy: { type: 'string', description: 'User UUID who performed the extension' },
          createdAt:  { type: 'string', format: 'date-time' },
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
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Authenticated but not allowed — must be workspace admin/owner',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Project not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      ValidationError: {
        description: 'Request body failed validation (Zod)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/api/v1/projects': {
      post: {
        tags:        ['Projects'],
        summary:     'Create a project',
        description: 'Creates a project and automatically adds the creator as project_head.',
        security:    [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['name', 'workspaceId', 'startDate', 'endDate'],
                properties: {
                  name:        { type: 'string', example: 'PMS Rewrite' },
                  workspaceId: { type: 'string', example: 'ws-uuid' },
                  description: { type: 'string' },
                  startDate:   { type: 'string', format: 'date-time' },
                  endDate:     { type: 'string', format: 'date-time' },
                  tags:        { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Project created' },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags:        ['Projects'],
        summary:     'Get all projects in a workspace',
        security:    [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'workspaceId', required: true, schema: { type: 'string' }, description: 'Filter by workspace' },
        ],
        responses: {
          200: { description: 'List of projects the user is a member of' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/v1/projects/{id}': {
      get: {
        tags:     ['Projects'],
        summary:  'Get a project by ID (includes members + deadline history)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Project object with members and dateHistory' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags:     ['Projects'],
        summary:  'Update project (name, description, state, tags)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:          { type: 'string' },
                  description:   { type: 'string' },
                  state:         { type: 'string', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
                  projectStatus: { type: 'string', enum: ['on_track', 'at_risk', 'off_track', 'completed'] },
                  tags:          { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Project updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags:     ['Projects'],
        summary:  'Soft-delete a project (sets isActive: false)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Project deactivated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/{id}/extend-deadline': {
      patch: {
        tags:        ['Projects'],
        summary:     'Extend project end date — workspace admin/owner only',
        description: 'The old end date and reason are recorded in `ProjectDateHistory`. The new date must be after the current end date.',
        security:    [{ cookieAuth: [] }],
        parameters:  [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['newEndDate', 'reason'],
                properties: {
                  newEndDate: { type: 'string', format: 'date-time', example: '2026-06-30T00:00:00.000Z' },
                  reason:     { type: 'string', minLength: 10, example: 'Client requested scope extension for module 3' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'End date extended — event published to task-service to unfreeze flagged tasks' },
          400: { description: 'newEndDate is not after the current endDate' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/{id}/members': {
      get: {
        tags:     ['Members'],
        summary:  'List all active project members',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Array of ProjectMember objects' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags:     ['Members'],
        summary:  'Add a member to the project',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['userId', 'role'],
                properties: {
                  userId: { type: 'string', example: 'user-uuid' },
                  role:   { type: 'string', enum: ['project_head', 'tl', 'trainee', 'member'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Member added' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/v1/projects/{id}/members/{userId}': {
      delete: {
        tags:     ['Members'],
        summary:  'Remove a member from the project',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'path', name: 'id',     required: true, schema: { type: 'string' } },
          { in: 'path', name: 'userId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          204: { description: 'Member removed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/v1/projects/{id}/members/{userId}/role': {
      patch: {
        tags:     ['Members'],
        summary:  'Change a member\'s role',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'path', name: 'id',     required: true, schema: { type: 'string' } },
          { in: 'path', name: 'userId', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['project_head', 'tl', 'trainee', 'member'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/v1/projects/{id}/project-head': {
      patch: {
        tags:        ['Members'],
        summary:     'Transfer project head role to another member',
        description: 'Demotes the current project head to `member` and promotes the target user to `project_head`.',
        security:    [{ cookieAuth: [] }],
        parameters:  [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['newProjectHeadId'],
                properties: {
                  newProjectHeadId: { type: 'string', example: 'user-uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Project head transferred' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '../routes/*.js')],
});
