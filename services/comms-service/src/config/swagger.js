const SwaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Comms Service',
    version: '1.0.0',
    description: 'Real-time chat and messaging. Owns `pms_chat` database.\n\nMessages are end-to-end encrypted at rest (AES-256-GCM). Direct chats are between 2 users; group chats support unlimited participants.\n\nReal-time delivery is handled via Socket.IO — REST endpoints are for history and management.',
  },
  servers: [{ url: 'http://localhost:4007', description: 'Local development' }],
  tags: [
    { name: 'Chats', description: 'Create and manage chat rooms' },
    { name: 'Messages', description: 'Send, edit, delete messages and manage reactions' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken' },
    },
    schemas: {
      Chat: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['direct', 'group'] },
          isArchived: { type: 'boolean' },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          chatId: { type: 'string' },
          senderId: { type: 'string' },
          content: { type: 'string', description: 'Decrypted message content' },
          isEdited: { type: 'boolean' },
          isDeleted: { type: 'boolean' },
          parentMessageId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
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
      Forbidden: { description: 'Not a participant of this chat', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Chat or message not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Request body failed validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  paths: {
    '/api/v1/chats': {
      post: {
        tags: ['Chats'],
        summary: 'Create a new chat (direct or group)',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspaceId', 'type', 'participantIds'],
                properties: {
                  workspaceId: { type: 'string', format: 'uuid' },
                  name: { type: 'string', description: 'Required for group chats' },
                  type: { type: 'string', enum: ['direct', 'group'] },
                  participantIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Chat created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Chat' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { description: 'Direct chat already exists between these two users' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Chats'],
        summary: 'Get all chats for the current user in a workspace',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'query', name: 'workspaceId', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Array of chats' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/chats/{id}': {
      get: {
        tags: ['Chats'],
        summary: 'Get a single chat with participants',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Chat object with participants' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/chats/{id}/participants': {
      post: {
        tags: ['Chats'],
        summary: 'Add a participant to a group chat',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string', format: 'uuid' } } } } },
        },
        responses: {
          200: { description: 'Participant added' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/chats/{id}/participants/{userId}': {
      delete: {
        tags: ['Chats'],
        summary: 'Remove a participant from a group chat',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Participant removed' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/chats/{id}/archive': {
      patch: {
        tags: ['Chats'],
        summary: 'Archive a chat',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Chat archived' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/messages/unread-count': {
      get: {
        tags: ['Messages'],
        summary: 'Get total unread message count across all chats',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Unread count', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, data: { type: 'object', properties: { count: { type: 'integer' } } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/messages/chats/{chatId}': {
      post: {
        tags: ['Messages'],
        summary: 'Send a message to a chat',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'chatId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', minLength: 1 },
                  parentMessageId: { type: 'string', format: 'uuid', description: 'Set to reply to a message' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Message sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Messages'],
        summary: 'Get paginated message history for a chat',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'path', name: 'chatId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: { description: 'Message list' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/v1/messages/{id}': {
      patch: {
        tags: ['Messages'],
        summary: 'Edit a message (sender only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string', minLength: 1 } } } } },
        },
        responses: {
          200: { description: 'Message edited' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Messages'],
        summary: 'Soft-delete a message (sender only — content replaced)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Message deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/messages/{id}/reactions': {
      post: {
        tags: ['Messages'],
        summary: 'Add an emoji reaction to a message',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['emoji'], properties: { emoji: { type: 'string', example: '👍' }, chatId: { type: 'string', format: 'uuid' } } } } },
        },
        responses: {
          200: { description: 'Reaction added' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Messages'],
        summary: 'Remove an emoji reaction from a message',
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
    '/api/v1/messages/{id}/read': {
      post: {
        tags: ['Messages'],
        summary: 'Mark a message as read',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Message marked as read' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({ definition, apis: [] });
