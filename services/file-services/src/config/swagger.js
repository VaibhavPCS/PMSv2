const SwaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — File Service',
    version: '1.0.0',
    description: 'File upload and retrieval via MinIO object storage. Owns `pms_files` database.\n\nFiles are stored in MinIO. The API returns pre-signed URLs for direct download. Max file size: 50 MB. Allowed types: images, PDF, DOCX, XLSX, XLS, TXT, CSV.',
  },
  servers: [{ url: 'http://localhost:4008', description: 'Local development' }],
  tags: [{ name: 'Files', description: 'Upload, list, download, and delete files' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken' },
    },
    schemas: {
      File: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          uploadedBy: { type: 'string' },
          entityType: { type: 'string', example: 'task', description: 'e.g. task, project, message' },
          entityId: { type: 'string' },
          filename: { type: 'string', example: 'design-spec.pdf' },
          mimeType: { type: 'string', example: 'application/pdf' },
          sizeBytes: { type: 'integer', example: 204800 },
          isDeleted: { type: 'boolean' },
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
      NotFound: { description: 'File not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Request body or file validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  paths: {
    '/api/v1/files': {
      post: {
        tags: ['Files'],
        summary: 'Upload a file (multipart/form-data)',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'workspaceId', 'entityType', 'entityId'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  workspaceId: { type: 'string', format: 'uuid' },
                  entityType: { type: 'string', example: 'task' },
                  entityId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'File uploaded — metadata returned', content: { 'application/json': { schema: { $ref: '#/components/schemas/File' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          413: { description: 'File exceeds 50 MB limit' },
          415: { description: 'File type not allowed' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Files'],
        summary: 'List files attached to an entity',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'entityType', required: true, schema: { type: 'string' }, example: 'task' },
          { in: 'query', name: 'entityId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Array of file metadata objects' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/files/{id}/url': {
      get: {
        tags: ['Files'],
        summary: 'Get a pre-signed download URL for a file',
        description: `URL expires after ${3600} seconds (1 hour). Call this endpoint each time before downloading.`,
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Pre-signed URL', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, data: { type: 'object', properties: { url: { type: 'string', format: 'uri' }, expiresIn: { type: 'integer', example: 3600 } } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/files/{id}': {
      delete: {
        tags: ['Files'],
        summary: 'Soft-delete a file (uploader or admin only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'File deleted from storage and marked as deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { description: 'Not the uploader or admin' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({ definition, apis: [] });
