const Router = require('express').Router();

const { APIError } = require('@pms/error-handler');
const { GetUserEmailInternal, ListUsersInternal } = require('../controllers/auth.controller');

// Service-to-service guard. Requires x-internal-api-key === INTERNAL_API_KEY.
// When INTERNAL_API_KEY is unset we allow the call ONLY outside production,
// so local dev and tests work without extra config but prod stays locked down.
const RequireInternalKey = (req, _res, next) => {
  const expected = process.env.INTERNAL_API_KEY;

  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return next(new APIError(403, 'Internal API is not configured.'));
    }
    return next();
  }

  if (req.get('x-internal-api-key') !== expected) {
    return next(new APIError(403, 'Invalid internal API key.'));
  }
  return next();
};

Router.get('/users',           RequireInternalKey, ListUsersInternal);
Router.get('/users/:id/email', RequireInternalKey, GetUserEmailInternal);

module.exports = Router;
