const Express = require('express');
const Cors = require('cors');
const Helmet = require('helmet');
const RateLimit = require('express-rate-limit');
const SuperTokens = require('supertokens-node');
const { middleware, errorHandler } = require('supertokens-node/framework/express');
const { InitAuth } = require('@pms/auth-middleware');
const { ErrorHandler, NotFoundHandler } = require('@pms/error-handler');
const ChatRoutes = require('./routes/chat.routes');
const MessageRoutes = require('./routes/message.routes');

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
App.use(Express.json());
App.use(middleware());

const ApiLimiter = RateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
App.use('/api/v1/chats',    ApiLimiter, ChatRoutes);
App.use('/api/v1/messages', ApiLimiter, MessageRoutes);

App.use(errorHandler());
App.use(NotFoundHandler);
App.use(ErrorHandler);

module.exports = App;
