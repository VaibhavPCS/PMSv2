const Express      = require('express');
const Cors         = require('cors');
const Helmet       = require('helmet');
const RateLimit    = require('express-rate-limit');
const SuperTokens  = require('supertokens-node');
const { middleware, errorHandler } = require('supertokens-node/framework/express');
const { InitAuth } = require('@pms/auth-middleware');
const { ErrorHandler, NotFoundHandler } = require('@pms/error-handler');
const WorkflowRoutes = require('./routes/workflow.routes');
const InstanceRoutes = require('./routes/instance.routes');
const GithubWebhookRoute = require('./routes/github.routes');

InitAuth({
  connectionURI:        process.env.SUPERTOKENS_CONNECTION_URI,
  apiKey:               process.env.SUPERTOKENS_API_KEY,
  appName:              process.env.APP_NAME || 'PMS',
  apiDomain:            process.env.API_DOMAIN,
  websiteDomain:        process.env.WEBSITE_DOMAIN,
  includeEmailPassword: false,
});

const App = Express();

App.use(Helmet());
App.use(Cors({
  origin:         process.env.WEBSITE_DOMAIN,
  credentials:    true,
  allowedHeaders: ['content-type', ...SuperTokens.getAllCORSHeaders()],
}));

App.use('/webhooks', Express.raw({ type: 'application/json' }), GithubWebhookRoute);

App.use(Express.json());
App.use(middleware());

if (process.env.NODE_ENV !== 'production') {
  const SwaggerUi   = require('swagger-ui-express');
  const SwaggerSpec = require('./config/swagger');
  App.use(
    '/api/v1/workflows/docs',
    (_req, res, next) => { res.setHeader('Content-Security-Policy', ''); next(); },
    SwaggerUi.serve,
    SwaggerUi.setup(SwaggerSpec, { customSiteTitle: 'PMS — Workflow Engine API' }),
  );
}

const ApiLimiter = RateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
App.use('/api/v1/workflows',          ApiLimiter, WorkflowRoutes);
App.use('/api/v1/workflow-instances', ApiLimiter, InstanceRoutes);

App.use(errorHandler());
App.use(NotFoundHandler);
App.use(ErrorHandler);

module.exports = App;