const Express     = require('express');
const Cors        = require('cors');
const Helmet      = require('helmet');
const RateLimit   = require('express-rate-limit');
const SuperTokens = require('supertokens-node');

const { InitAuth }                       = require('@pms/auth-middleware');
const { ErrorHandler, NotFoundHandler }  = require('@pms/error-handler');

const WorkspaceRoutes = require('./routes/workspace.routes');

// ─── SuperTokens Init ─────────────────────────────────────────────────────────

InitAuth({
  connectionURI:        process.env.SUPERTOKENS_CONNECTION_URI,
  apiKey:               process.env.SUPERTOKENS_API_KEY,
  appName:              process.env.APP_NAME || 'PMS',
  apiDomain:            process.env.API_DOMAIN,
  websiteDomain:        process.env.WEBSITE_DOMAIN,
  includeEmailPassword: false,  // session verification only
});

// ─── App Setup ────────────────────────────────────────────────────────────────

const App = Express();

App.use(Helmet());
App.use(Cors({
  origin:         process.env.WEBSITE_DOMAIN,
  credentials:    true,
  allowedHeaders: ['content-type', ...SuperTokens.getAllCORSHeaders()],
}));
App.use(Express.json());
App.use(SuperTokens.middleware());

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const ApiLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { status: 'fail', message: 'Too many requests. Please slow down.' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

App.use('/api/v1/workspaces', ApiLimiter, WorkspaceRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────

App.use(SuperTokens.errorHandler());
App.use(NotFoundHandler);
App.use(ErrorHandler);

module.exports = App;
