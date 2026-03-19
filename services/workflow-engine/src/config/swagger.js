const SwaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'PMS — Workflow Engine API',
      version:     '1.0.0',
      description: 'Workflow definition management and instance stage transitions.',
    },
    servers: [{ url: process.env.API_DOMAIN || 'http://localhost:4006' }],
    components: {
      securitySchemes: {
        SuperTokensSession: {
          type: 'apiKey',
          in:   'cookie',
          name: 'sAccessToken',
        },
      },
    },
    security: [{ SuperTokensSession: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = SwaggerJsdoc(options);
