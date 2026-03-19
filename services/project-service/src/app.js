const Express = require('express');
const Cors = require('cors');
const Helmet = require('helmet');
const RateLimit = require('express-rate-limit');
const SuperTokens = require('supertokens-node');
const { middleware, errorHandler } = require('supertokens-node/framework/express');
const { InitAuth } = require('@pms/auth-middleware');
const { ErrorHandler, NotFoundHandler } = require('@pms/error-handler');
const ProjectRoutes = require('./routes/project.routes');

const App = Express();

App.use(Helmet());
App.use(Cors({ origin: process.env.WEBSITE_DOMAIN, credentials: true, allowedHeaders: [...SuperTokens.getAllCORSHeaders()] }));
App.use(Express.json());
App.use(middleware());

const ApiLimiter = RateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
App.use('/api/v1/projects', ApiLimiter, ProjectRoutes);

if (process.env.NODE_ENV !== 'production') {
    App.use('/api/v1/auth', InitAuth());
}

App.use(errorHandler());
App.use(NotFoundHandler);
App.use(ErrorHandler);

module.exports = App;