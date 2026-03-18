const SwaggerJsdoc = require('swagger-jsdoc');
const path         = require('path');

const definition = {
  openapi: '3.0.0',
  info: {
    title:       'PMS — Auth Service',
    version:     '1.0.0',
    description: [
      'Handles user registration, login, session management, and profile.',
      '',
      '**Auth flows** (signup / signin / signout / password reset / email verify)',
      'are managed entirely by SuperTokens — no custom code required.',
      '',
      '**Custom routes** live under `/api/v1/auth`.',
    ].join('\n'),
  },
  servers: [
    { url: 'http://localhost:4001', description: 'Local development' },
  ],
  tags: [
    { name: 'Auth — SuperTokens', description: 'Handled by SuperTokens middleware, no custom code' },
    { name: 'User Profile',       description: 'Custom routes — require active session cookie' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type:        'apiKey',
        in:          'cookie',
        name:        'sAccessToken',
        description: 'SuperTokens access token — set automatically on signin/signup',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:              { type: 'string', example: 'a1b2c3d4-e5f6-...' },
          name:            { type: 'string', example: 'Vaibhav Sharma' },
          email:           { type: 'string', format: 'email', example: 'vaibhav@example.com' },
          profilePicture:  { type: 'string', nullable: true, example: 'https://cdn.example.com/avatar.png' },
          activeWorkspace: { type: 'string', nullable: true, example: 'ws-uuid-here' },
          lastLogin:       { type: 'string', format: 'date-time', nullable: true },
          isActive:        { type: 'boolean', example: true },
          createdAt:       { type: 'string', format: 'date-time' },
          updatedAt:       { type: 'string', format: 'date-time' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data:   { type: 'object' },
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
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Session invalid. Please log in again.' },
          },
        },
      },
      ValidationError: {
        description: 'Request body failed validation (Zod)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { status: 'fail', message: 'Validation failed. name: String must contain at least 2 character(s).' },
          },
        },
      },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags:        ['Auth — SuperTokens'],
        summary:     'Register a new user',
        description: 'Creates a SuperTokens user + a `users` row in pms_auth. Starts a session.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['formFields'],
                properties: {
                  formFields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id:    { type: 'string' },
                        value: { type: 'string' },
                      },
                    },
                    example: [
                      { id: 'email',    value: 'user@example.com' },
                      { id: 'password', value: 'SecurePass123!' },
                      { id: 'name',     value: 'Vaibhav Sharma' },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User created — session cookies set in response headers' },
          422: { description: 'Email already exists or password does not meet requirements' },
        },
      },
    },

    '/auth/signin': {
      post: {
        tags:    ['Auth — SuperTokens'],
        summary: 'Sign in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['formFields'],
                properties: {
                  formFields: {
                    type: 'array',
                    example: [
                      { id: 'email',    value: 'user@example.com' },
                      { id: 'password', value: 'SecurePass123!' },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Session started — cookies set' },
          401: { description: 'Wrong email or password' },
        },
      },
    },

    '/auth/signout': {
      post: {
        tags:     ['Auth — SuperTokens'],
        summary:  'Sign out — revokes session',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Session revoked, cookies cleared' },
        },
      },
    },

    '/auth/session/refresh': {
      post: {
        tags:    ['Auth — SuperTokens'],
        summary: 'Refresh access token using refresh cookie',
        responses: {
          200: { description: 'New access token set in cookie' },
          401: { description: 'Refresh token invalid or expired — user must sign in again' },
        },
      },
    },

    '/auth/user/email/verify/token': {
      post: {
        tags:     ['Auth — SuperTokens'],
        summary:  'Send email verification link',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Verification email sent' },
        },
      },
    },

    '/auth/user/email/verify': {
      post: {
        tags:    ['Auth — SuperTokens'],
        summary: 'Verify email using token from the verification email',
        responses: {
          200: { description: 'Email verified' },
          400: { description: 'Token invalid or expired' },
        },
      },
    },

    '/auth/user/password/reset/token': {
      post: {
        tags:    ['Auth — SuperTokens'],
        summary: 'Send password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  formFields: {
                    type: 'array',
                    example: [{ id: 'email', value: 'user@example.com' }],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reset email sent (always 200 — prevents email enumeration)' },
        },
      },
    },

    '/auth/user/password/reset': {
      post: {
        tags:    ['Auth — SuperTokens'],
        summary: 'Reset password using token from email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type:     'object',
                required: ['token', 'formFields'],
                properties: {
                  token:      { type: 'string' },
                  formFields: {
                    type: 'array',
                    example: [{ id: 'password', value: 'NewSecurePass123!' }],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password updated' },
          400: { description: 'Token invalid or expired' },
        },
      },
    },
  },
};

module.exports = SwaggerJsdoc({
  definition,
  apis: [path.join(__dirname, '../routes/*.js')],  
});
