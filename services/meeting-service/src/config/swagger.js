const SwaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Meeting Service',
    version: '1.0.0',
    description: 'Manages meetings, participants, and RSVP status. Owns `pms_meeting` database.\n\nA reminder scheduler runs automatically and sends notifications before meetings start.',
  },
  servers: [{ url: 'http://localhost:4009', description: 'Local development' }],
  tags: [
    { name: 'Meetings', description: 'Create and manage meetings' },
    { name: 'Participants', description: 'Add/remove participants and manage RSVP' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken' },
    },
    schemas: {
      Meeting: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          projectId: { type: 'string', nullable: true },
          title: { type: 'string', example: 'Sprint Planning' },
          description: { type: 'string', nullable: true },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          meetingLink: { type: 'string', nullable: true, format: 'uri' },
          createdBy: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      MeetingParticipant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          meetingId: { type: 'string' },
          userId: { type: 'string' },
          rsvp: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
          joinedAt: { type: 'string', format: 'date-time', nullable: true },
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
      Forbidden: { description: 'Not the meeting creator or admin', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Meeting not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Request body failed validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  paths: {
    '/api/v1/meetings': {
      post: {
        tags: ['Meetings'],
        summary: 'Create a meeting',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspaceId', 'title', 'startTime', 'endTime', 'participantIds'],
                properties: {
                  workspaceId: { type: 'string', format: 'uuid' },
                  projectId: { type: 'string', format: 'uuid' },
                  title: { type: 'string', minLength: 2, example: 'Sprint Planning' },
                  description: { type: 'string' },
                  startTime: { type: 'string', format: 'date-time', example: '2026-04-01T10:00:00.000Z' },
                  endTime: { type: 'string', format: 'date-time', example: '2026-04-01T11:00:00.000Z' },
                  meetingLink: { type: 'string', format: 'uri', example: 'https://meet.google.com/abc-xyz' },
                  participantIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Meeting created — notifications sent to all participants', content: { 'application/json': { schema: { $ref: '#/components/schemas/Meeting' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Meetings'],
        summary: 'List meetings for a workspace',
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: 'query', name: 'workspaceId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'projectId', schema: { type: 'string' } },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: { description: 'Array of meetings' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/meetings/{id}': {
      get: {
        tags: ['Meetings'],
        summary: 'Get meeting details with participants',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Meeting with participants array' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Meetings'],
        summary: 'Update meeting details (creator only)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  startTime: { type: 'string', format: 'date-time' },
                  endTime: { type: 'string', format: 'date-time' },
                  meetingLink: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Meeting updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Meetings'],
        summary: 'Cancel a meeting (creator only — soft delete)',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: 'Meeting cancelled' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/meetings/{id}/rsvp': {
      patch: {
        tags: ['Participants'],
        summary: 'Update your RSVP for a meeting',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['rsvp'], properties: { rsvp: { type: 'string', enum: ['accepted', 'declined'] } } } } },
        },
        responses: {
          200: { description: 'RSVP updated' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { description: 'You are not a participant of this meeting' },
        },
      },
    },
    '/api/v1/meetings/{id}/participants': {
      post: {
        tags: ['Participants'],
        summary: 'Add a participant to a meeting',
        security: [{ cookieAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string', format: 'uuid' } } } } },
        },
        responses: {
          201: { description: 'Participant added' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { description: 'User is already a participant' },
        },
      },
    },
    '/api/v1/meetings/{id}/participants/{userId}': {
      delete: {
        tags: ['Participants'],
        summary: 'Remove a participant from a meeting',
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
  },
};

module.exports = SwaggerJsdoc({ definition, apis: [] });
