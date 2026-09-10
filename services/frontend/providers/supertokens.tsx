import SuperTokens from 'supertokens-web-js';
import EmailPassword from 'supertokens-web-js/recipe/emailpassword';
import Session from 'supertokens-web-js/recipe/session';

SuperTokens.init({
  appInfo: {
    apiDomain: 'http://localhost:4001',
    apiBasePath: '/auth',
    appName: 'PMS',
  },
  recipeList: [EmailPassword.init(), Session.init()],
});