const SuperTokens = require('supertokens-node');
const Session = require('supertokens-node/recipe/session');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const { verifySession } = require('supertokens-node/recipe/session/framework/express');
const { APIError } = require('@pms/error-handler');
const { ROLES } = require('@pms/constants');

const InitAuth = ({ connectionURI, apiKey, appName, apiDomain, websiteDomain, includeEmailPassword = false, emailPasswordConfig = {} }) => {
    const recipes = [Session.init()];

    if (includeEmailPassword) {
        recipes.push(EmailPassword.init(emailPasswordConfig));
    }

    SuperTokens.init({
        framework: 'express',
        supertokens: { connectionURI, apiKey },
        appInfo: { appName, apiDomain, websiteDomain },
        recipeList: recipes,
    });
};

const AuthenticateToken = verifySession();

const RequireRole = (...allowedRoles) => {
    const passedArray = allowedRoles.length === 1 && Array.isArray(allowedRoles[0]);
    if (passedArray) {
        console.warn('[auth-middleware] RequireRole received an array argument. Prefer variadic roles for compatibility.');
    }
    const roles = passedArray ? allowedRoles[0] : allowedRoles;
    return async (req, res, next) => {
        try {
            const userRole = req.session.getAccessTokenPayload().role;
            if (!roles.includes(userRole)) {
                return next(new APIError(403, 'You do not have permission to perform this action.'));
            }
            next();
        } catch (err) {
            next(new APIError(401, 'Session invalid. Please log in again.'));
        }
    };
};

const OptionalAuth = verifySession({ sessionRequired: false });

module.exports = {
    InitAuth,
    AuthenticateToken,
    RequireRole,
    OptionalAuth,
};