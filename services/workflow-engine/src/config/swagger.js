const SwaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Workflow Engine',
    version: '1.0.0',
    description: 'Manages workflow definitions and task stage transitions. Owns `pms_workflow` database.\n\nA **WorkflowDefinition** is a JSON blueprint of stages and transitions. A **WorkflowInstance** is created per-task when a workflow is started, and advances through stages via the transition endpoint.',
  },
  servers: [{ url: 'http://localhost:4006', description: 'Local development' }],
  tags: [
    { name: 'Workflow Definitions', description: 'Create and manage reusable workflow blueprints' },
    { name: 'Workflow Instances', description: 'Per-task workflow instances and stage transitions' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken', description: 'SuperTokens session cookie' },
    },
    schemas: {
      WorkflowDefinition: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string', example: 'Bug Fix Workflow' },
          description: { type: 'string', nullable: true },
          definition: { type: 'object', description: 'JSON stages/transitions blueprint' },
          isBuiltIn: { type: 'boolean' },
          isActive: { type: 'boolean' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkflowInstance: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workflowDefinitionId: { type: 'string' },
          taskId: { type: 'string' },
          currentStage: { type: 'string', example: 'in_review' },
          currentAssigneeId: { type: 'string', nullable: true },
          isTerminal: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'fail' },
          message: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: { description: 'Session missing or expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Forbidden: { description: 'Insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Request body failed validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  paths: {
    '/api/v1/workflows': {
      post: {
        tags: ['Workflow Definitions'],
        summary: 'Create a workflow definition (admin/owner only)',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspaceId', 'name', 'definition'],
                properties: {
                  workspaceId: { type: 'string', format: 'uuid' },
                  name: { type: 'string', minLength: 2, example: 'Bug Fix Flow' },
                  description: { type: 'string' },
                  definition: { type: 'object', example: { stages: ['open', 'in_review', 'closed'], transitions: [{ from: 'open', to: 'in_review', label: 'Start Review' }] } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Workflow created', content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkflowDefinition' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Workflow Definitions'],
        summary: 'List workflow definitions for a workspace',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'query', name: 'workspaceId', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Array of workflow definitions' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/workflows/{id}': {
      get: {
        tags: ['Workflow Definitions'],
        summary: 'Get a workflow definition by ID',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Workflow definition object' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Workflow Definitions'],
        summary: 'Update a workflow definition (admin/owner only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  definition: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated workflow definition' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Workflow Definitions'],
        summary: 'Delete a workflow definition (admin/owner only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'Deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/workflow-instances': {
      post: {
        tags: ['Workflow Instances'],
        summary: 'Create a workflow instance for a task',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['taskId', 'workflowDefinitionId'],
                properties: {
                  taskId: { type: 'string', format: 'uuid' },
                  workflowDefinitionId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Instance created at the first stage of the workflow' },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { description: 'Instance already exists for this task' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/v1/workflow-instances/{taskId}': {
      get: {
        tags: ['Workflow Instances'],
        summary: 'Get workflow instance for a task',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'taskId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Workflow instance with full transition history' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/workflow-instances/{taskId}/transition': {
      post: {
        tags: ['Workflow Instances'],
        summary: 'Transition the workflow instance to the next stage',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'taskId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['toStage'],
                properties: {
                  toStage: { type: 'string', example: 'in_review' },
                  note: { type: 'string' },
                  attachmentUrl: { type: 'string', format: 'uri' },
                  referenceLink: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Stage transitioned — SLA tracking updated' },
          400: { description: 'Transition not allowed from current stage' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/workflow-instances/{taskId}/transitions': {
      get: {
        tags: ['Workflow Instances'],
        summary: 'Get available transitions from the current stage',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'taskId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Array of available transition options' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({ definition, apis: [] });
