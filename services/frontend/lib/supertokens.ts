import SuperTokens from 'supertokens-web-js';
import EmailPassword from 'supertokens-web-js/recipe/emailpassword';
import Session from 'supertokens-web-js/recipe/session';

export function initSuperTokens() {
  if (typeof window === 'undefined') return;

  SuperTokens.init({
    appInfo: {
      apiDomain: process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:4001',
      apiBasePath: '/auth',
      appName: 'PMS',
    },
    recipeList: [EmailPassword.init(), Session.init()],
  });
}
