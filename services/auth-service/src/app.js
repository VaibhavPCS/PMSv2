const Express         = require('express');
const Cors            = require('cors');
const Helmet          = require('helmet');
const RateLimit       = require('express-rate-limit');
const SuperTokens     = require('supertokens-node');

const { InitAuth } = require('@pms/auth-middleware');
const { ErrorHandler, NotFoundHandler } = require('@pms/error-handler');

const AuthService  = require('./services/auth.service');
const AuthRoutes   = require('./routes/auth.routes');

const EmailPasswordConfig = {
  signUpFeature: {
    formFields: [{ id: 'name' }],
  },
  override: {
    apis: (originalImplementation) => ({
      ...originalImplementation,
      signUpPOST: async (input) => {
        const response = await originalImplementation.signUpPOST(input);
        if (response.status === 'OK') {
          const { id, email } = response.user;
          const nameField     = input.formFields.find((f) => f.id === 'name');
          const name          = nameField?.value ?? '';
          try {
            await AuthService.CreateUser(id, name, email);
          } catch (err) {
            console.error('[auth-service] postSignUp — failed to create user row:', err.message);
          }
        }

        return response;
      },
      signInPOST: async (input) => {
        const response = await originalImplementation.signInPOST(input);

        if (response.status === 'OK') {
          AuthService.SetLastLogin(response.user.id).catch((err) =>
            console.error('[auth-service] postSignIn — failed to set lastLogin:', err.message)
          );
        }

        return response;
      },
    }),
  },
};

InitAuth({
  connectionURI:        process.env.SUPERTOKENS_CONNECTION_URI,
  apiKey:               process.env.SUPERTOKENS_API_KEY,
  appName:              process.env.APP_NAME || 'PMS',
  apiDomain:            process.env.API_DOMAIN,
  websiteDomain:        process.env.WEBSITE_DOMAIN,
  includeEmailPassword: true,
  emailPasswordConfig:  EmailPasswordConfig,
});

const App = Express();

App.use(Helmet());
App.use(Cors({
  origin:         process.env.WEBSITE_DOMAIN,
  credentials:    true,
  allowedHeaders: ['content-type', ...SuperTokens.getAllCORSHeaders()],
}));
App.use(Express.json());
App.use(SuperTokens.middleware());

const AuthLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { status: 'fail', message: 'Too many requests. Please slow down.' },
});

App.use('/api/v1/auth', AuthLimiter, AuthRoutes);

App.use(SuperTokens.errorHandler());
App.use(NotFoundHandler);
App.use(ErrorHandler);

module.exports = App;
