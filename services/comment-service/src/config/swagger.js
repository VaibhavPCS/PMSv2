const SwaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Comment Service',
    version: '1.0.0',
    description: 'Threaded comments on any entity (task, project, sprint). Owns `pms_comment` database.\n\nComment bodies are encrypted at rest (AES-256-GCM). Replies are one level deep. Supports @mentions (`@[<uuid>]` tokens), emoji reactions, and file attachments (referencing the file-service).',
  },
  servers: [{ url: 'http://localhost:4010', description: 'Local development' }],
  tags: [{ name: 'Comments', description: 'Create, read, edit, delete comments and manage reactions' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken' },
    },
    schemas: {
      Comment: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          workspaceId: { type: 'string', format: 'uuid' },
          entityType:  { type: 'string', example: 'task' },
          entityId:    { type: 'string', format: 'uuid' },
          authorId:    { type: 'string' },
          content:     { type: 'string', description: 'Decrypted comment body' },
          parentId:    { type: 'string', nullable: true },
          mentions:    { type: 'array', items: { type: 'string' } },
          attachments: { type: 'array', items: { type: 'string' } },
          isEdited:    { type: 'boolean' },
          isDeleted:   { type: 'boolean' },
          createdAt:   { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status:  { type: 'string', example: 'fail' },
          message: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: { description: 'Session missing or expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Forbidden:    { description: 'Not the comment author', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound:     { description: 'Comment not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Request failed validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  paths: {
    '/api/v1/comments': {
      post: {
        tags: ['Comments'],
        summary: 'Create a comment (or reply via parentId)',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspaceId', 'entityType', 'entityId', 'content'],
                properties: {
                  workspaceId: { type: 'string', format: 'uuid' },
                  entityType:  { type: 'string', example: 'task' },
                  entityId:    { type: 'string', format: 'uuid' },
                  content:     { type: 'string', minLength: 1, maxLength: 10000 },
                  parentId:    { type: 'string', format: 'uuid' },
                  attachments: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Comment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } } },
          400: { description: 'Invalid parent comment' },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Comments'],
        summary: 'List top-level comments for an entity (with one level of replies)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'entityType', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'entityId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Array of comments' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/comments/count': {
      get: {
        tags: ['Comments'],
        summary: 'Count comments on an entity',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'entityType', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'entityId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Comment count' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/comments/{id}/replies': {
      get: {
        tags: ['Comments'],
        summary: 'List replies to a comment',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Array of replies' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/comments/{id}': {
      patch: {
        tags: ['Comments'],
        summary: 'Edit a comment (author only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string', minLength: 1 } } } } },
        },
        responses: {
          200: { description: 'Comment edited' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Soft-delete a comment (author only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Comment deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/comments/{id}/reactions': {
      post: {
        tags: ['Comments'],
        summary: 'Add an emoji reaction',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['emoji'], properties: { emoji: { type: 'string', example: '👍' } } } } },
        },
        responses: {
          200: { description: 'Reaction added' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Remove an emoji reaction',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['emoji'], properties: { emoji: { type: 'string', example: '👍' } } } } },
        },
        responses: {
          200: { description: 'Reaction removed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({ definition, apis: [] });
