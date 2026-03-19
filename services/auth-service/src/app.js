const Express = require('express');
const Cors = require('cors');
const Helmet = require('helmet');
const RateLimit = require('express-rate-limit');
const SuperTokens = require('supertokens-node');
const { middleware, errorHandler } = require('supertokens-node/framework/express');

const { InitAuth } = require('@pms/auth-middleware');
const { ErrorHandler, NotFoundHandler } = require('@pms/error-handler');

const AuthService = require('./services/auth.service');
const AuthRoutes = require('./routes/auth.routes');

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
          const nameField = input.formFields.find((f) => f.id === 'name');
          const name = nameField?.value ?? '';
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
  connectionURI: process.env.SUPERTOKENS_CONNECTION_URI,
  apiKey: process.env.SUPERTOKENS_API_KEY,
  appName: process.env.APP_NAME || 'PMS',
  apiDomain: process.env.API_DOMAIN,
  websiteDomain: process.env.WEBSITE_DOMAIN,
  includeEmailPassword: true,
  emailPasswordConfig: EmailPasswordConfig,
});

const App = Express();

App.use(Helmet());
App.use(Cors({
  origin: process.env.WEBSITE_DOMAIN,
  credentials: true,
  allowedHeaders: ['content-type', ...SuperTokens.getAllCORSHeaders()],
}));
App.use(Express.json());
App.use(middleware());

const AuthLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'fail', message: 'Too many requests. Please slow down.' },
});

App.use('/api/v1/auth', AuthLimiter, AuthRoutes);

if (process.env.NODE_ENV !== 'production') {
  const SwaggerUi = require('swagger-ui-express');
  const SwaggerSpec = require('./config/swagger');

  App.use(
    '/api/v1/auth/docs',
    (_req, res, next) => {
      res.setHeader('Content-Security-Policy', '');
      next();
    },
    SwaggerUi.serve,
    SwaggerUi.setup(SwaggerSpec, {
      customSiteTitle: 'PMS — Auth Service API',
    }),
  );

  // Dev Portal - unified API index
  App.get('/dev', (_req, res) => {
    res.setHeader('Content-Security-Policy', '');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PMS - API Documentation Index</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f6f8;
      color: #111827;
      min-height: 100vh;
      padding: 36px 20px;
    }
    .container {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
    }
    .header {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 1.45rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #4b5563;
      line-height: 1.5;
    }
    .status {
      margin-top: 12px;
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 999px;
      padding: 4px 10px;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .panel-head {
      display: grid;
      grid-template-columns: 1.2fr 0.65fr 2fr 1.1fr;
      gap: 12px;
      padding: 14px 18px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .row {
      display: grid;
      grid-template-columns: 1.2fr 0.65fr 2fr 1.1fr;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid #f1f5f9;
      align-items: center;
    }
    .row:last-child {
      border-bottom: none;
    }
    .service {
      font-size: 0.96rem;
      font-weight: 600;
      color: #111827;
    }
    .port {
      font-size: 0.86rem;
      color: #374151;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .desc {
      font-size: 0.86rem;
      color: #4b5563;
      line-height: 1.45;
    }
    .meta {
      font-size: 0.8rem;
      color: #6b7280;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .link {
      font-size: 0.86rem;
      font-weight: 600;
      color: #1d4ed8;
      text-decoration: none;
    }
    .link:hover {
      text-decoration: underline;
    }
    .footer {
      margin-top: 14px;
      font-size: 0.78rem;
      color: #6b7280;
      text-align: right;
    }
    @media (max-width: 900px) {
      .panel-head {
        display: none;
      }
      .row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .service {
        margin-bottom: 2px;
      }
      .footer {
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <main class="container">
    <section class="header">
      <h1 class="title">PMS API Documentation Index</h1>
      <p class="subtitle">Single entry point for interactive Swagger docs across all PMS services used by frontend and backend teams.</p>
      <span class="status">Environment: Local Development</span>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>Service</div>
        <div>Host</div>
        <div>Description</div>
        <div>Swagger</div>
      </div>

      <div class="row">
        <div class="service">Auth Service</div>
        <div class="port">localhost:4001</div>
        <div class="desc">Identity APIs: signup, signin, session lifecycle, password reset, email verification, and profile endpoints.</div>
        <div class="meta">pms_auth | <a class="link" href="http://localhost:4001/api/v1/auth/docs" target="_blank" rel="noopener noreferrer">Open Docs</a></div>
      </div>

      <div class="row">
        <div class="service">Workspace Service</div>
        <div class="port">localhost:4002</div>
        <div class="desc">Workspace and membership APIs including invites, role changes, ownership transfer, and member management.</div>
        <div class="meta">pms_workspace | <a class="link" href="http://localhost:4002/api/v1/workspaces/docs" target="_blank" rel="noopener noreferrer">Open Docs</a></div>
      </div>

      <div class="row">
        <div class="service">Project Service</div>
        <div class="port">localhost:4003</div>
        <div class="desc">Project lifecycle APIs with project-head assignment, membership updates, and deadline extension tracking.</div>
        <div class="meta">pms_project | <a class="link" href="http://localhost:4003/api/v1/projects/docs" target="_blank" rel="noopener noreferrer">Open Docs</a></div>
      </div>

      <div class="row">
        <div class="service">Task Service</div>
        <div class="port">localhost:4004</div>
        <div class="desc">Task and sprint APIs for planning, status progression, approval flow, and sprint-based tracking.</div>
        <div class="meta">pms_task | <a class="link" href="http://localhost:4004/api/v1/tasks/docs" target="_blank" rel="noopener noreferrer">Open Docs</a></div>
      </div>
    </section>

    <div class="footer">
      PMS monorepo on PostgreSQL using Prisma
    </div>
  </main>

  <script>
    window.addEventListener('load', () => {
      document.title = 'PMS - API Documentation Index';
    });
  </script>
</body>
</html>`);
  });
}

App.use(errorHandler());
App.use(NotFoundHandler);
App.use(ErrorHandler);

module.exports = App;
