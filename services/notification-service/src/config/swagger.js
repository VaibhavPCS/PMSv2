const SwaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Notification Service',
    version: '1.0.0',
    description: 'Delivers in-app notifications to users. Notifications are created by consuming Kafka events from other services — no write API is exposed.\n\nClients poll or use WebSocket to receive new notifications.',
  },
  servers: [{ url: 'http://localhost:4005', description: 'Local development' }],
  tags: [
    { name: 'Notifications', description: 'Read and mark notifications' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken', description: 'SuperTokens session cookie' },
    },
    schemas: {
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          type: { type: 'string', example: 'TASK_ASSIGNED' },
          title: { type: 'string', example: 'New task assigned to you' },
          body: { type: 'string', example: 'You have been assigned to "Implement login page"' },
          entityType: { type: 'string', nullable: true, example: 'task' },
          entityId: { type: 'string', nullable: true },
          isRead: { type: 'boolean', example: false },
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
      NotFound: { description: 'Notification not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  paths: {
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get paginated notifications for the current user',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'unreadOnly', schema: { type: 'boolean', default: false }, description: 'Return only unread notifications' },
        ],
        responses: {
          200: { description: 'Paginated notification list', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } }, total: { type: 'integer' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get count of unread notifications',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Unread count', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, data: { type: 'object', properties: { count: { type: 'integer', example: 5 } } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'All notifications marked as read' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a single notification as read',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Notification marked as read' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({ definition, apis: [] });
