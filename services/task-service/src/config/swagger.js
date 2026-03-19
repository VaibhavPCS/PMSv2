const SwaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Task Service',
    version: '1.0.0',
    description: 'Manages tasks and sprints. Owns `pms_task` database.\n\n' +
      'User and project references are plain UUID strings — no cross-DB queries.\n\n' +
      '**Task state machine:** `pending → in_progress → completed`; `in_progress ↔ on_hold`; `completed → in_review`; `in_review → completed`; `completed|in_review → approved|rejected`; `rejected → in_progress`\n\n' +
      '`isFlagged` (HTTP 423) means the task\'s sprint has expired — extend the sprint or project deadline first.',
  },
  servers: [
    { url: 'http://localhost:4004', description: 'Local development' },
  ],
  tags: [
    { name: 'Tasks', description: 'Create, read, update and manage task lifecycle' },
    { name: 'Sprints', description: 'Create and manage project sprints' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sAccessToken',
        description: 'SuperTokens session cookie — obtained from auth-service login',
      },
    },
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'task-uuid' },
          title: { type: 'string', example: 'Implement login page' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'in_review', 'approved', 'rejected', 'on_hold'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          dueDate: { type: 'string', format: 'date-time' },
          projectId: { type: 'string', example: 'project-uuid' },
          workspaceId: { type: 'string', example: 'workspace-uuid' },
          sprintId: { type: 'string', nullable: true },
          parentTask: { type: 'string', nullable: true },
          createdBy: { type: 'string', example: 'user-uuid' },
          projectHeadId: { type: 'string', nullable: true },
          cycleCount: { type: 'integer', example: 0 },
          isFlagged: { type: 'boolean', example: false },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Sprint: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'sprint-uuid' },
          projectId: { type: 'string', example: 'project-uuid' },
          name: { type: 'string', example: 'Sprint 1' },
          goal: { type: 'string', nullable: true, example: 'Complete auth module' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'fail' },
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
        description: 'Authenticated but not allowed to perform this action',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Task or sprint not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Frozen: {
        description: 'Task is frozen — sprint end date has expired (HTTP 423)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Task is frozen — sprint end date has expired. Extend the sprint first.' },
          },
        },
      },
      ValidationError: {
        description: 'Request body or query failed validation',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
};

module.exports = SwaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '../routes/*.js')],
});
