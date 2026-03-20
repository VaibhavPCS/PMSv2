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
    { name: 'Recurring Tasks', description: 'Recurring task templates' },
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
  paths: {
    '/api/v1/tasks': {
      post: {
        tags: ['Tasks'],
        summary: 'Create a new task',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'priority', 'dueDate', 'projectId', 'workspaceId', 'assignees'],
                properties: {
                  title: { type: 'string', example: 'Implement login page' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'in_review', 'approved', 'rejected', 'on_hold'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  dueDate: { type: 'string', format: 'date-time' },
                  projectId: { type: 'string', format: 'uuid' },
                  workspaceId: { type: 'string', format: 'uuid' },
                  sprintId: { type: 'string', format: 'uuid' },
                  parentTask: { type: 'string', format: 'uuid' },
                  assignees: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Array of user IDs' },
                  projectHeadId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Task created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Tasks'],
        summary: 'Get tasks with optional filters',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'projectId', required: true, schema: { type: 'string' }, description: 'Filter by project ID' },
          { in: 'query', name: 'workspaceId', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'priority', schema: { type: 'string' } },
          { in: 'query', name: 'sprintId', schema: { type: 'string' } },
          { in: 'query', name: 'assigneeId', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated list of tasks', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, data: { type: 'array', items: { $ref: '#/components/schemas/Task' } }, total: { type: 'integer' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/tasks/{id}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get a task by ID',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Task object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task (soft delete)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'Task deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/tasks/{id}/status': {
      patch: {
        tags: ['Tasks'],
        summary: 'Update task status',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'in_review', 'approved', 'rejected', 'on_hold'] },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
          423: { $ref: '#/components/responses/Frozen' },
        },
      },
    },
    '/api/v1/tasks/{id}/approve': {
      post: {
        tags: ['Tasks'],
        summary: 'Approve a task (project head only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task approved' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/tasks/{id}/reject': {
      post: {
        tags: ['Tasks'],
        summary: 'Reject a task',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task rejected' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/tasks/{id}/handover': {
      post: {
        tags: ['Tasks'],
        summary: 'Hand over task to another assignee',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['toUserId'],
                properties: {
                  toUserId: { type: 'string', format: 'uuid' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task handed over' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/sprints': {
      post: {
        tags: ['Sprints'],
        summary: 'Create a new sprint',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'name', 'startDate', 'endDate'],
                properties: {
                  projectId: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Sprint 1' },
                  goal: { type: 'string' },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Sprint created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sprint' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Sprints'],
        summary: 'List sprints for a project',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'projectId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Array of sprints' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/sprints/{id}': {
      get: {
        tags: ['Sprints'],
        summary: 'Get a sprint by ID',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Sprint object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sprint' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Sprints'],
        summary: 'Update sprint name, goal, or dates',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  goal: { type: 'string' },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Sprint updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Sprints'],
        summary: 'Delete a sprint',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'Sprint deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/sprints/{id}/start': {
      post: {
        tags: ['Sprints'],
        summary: 'Start a sprint (admin/project_head only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Sprint started' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/sprints/{id}/close': {
      post: {
        tags: ['Sprints'],
        summary: 'Close a sprint (admin/project_head only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Sprint closed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/recurring': {
      post: {
        tags: ['Recurring Tasks'],
        summary: 'Create a recurring task template',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'workspaceId', 'title', 'priority', 'assignees', 'intervalDays', 'nextDueDate'],
                properties: {
                  projectId: { type: 'string', format: 'uuid' },
                  workspaceId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', example: 'Weekly status report' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  assignees: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  intervalDays: { type: 'integer', example: 7, description: 'Recurrence interval in days' },
                  nextDueDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' },
                  projectHeadId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Recurring template created' },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Recurring Tasks'],
        summary: 'List recurring task templates for a project',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'projectId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of recurring task templates' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/recurring/{id}': {
      delete: {
        tags: ['Recurring Tasks'],
        summary: 'Delete a recurring task template',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'Recurring template deleted' },
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
  apis: [],
});
