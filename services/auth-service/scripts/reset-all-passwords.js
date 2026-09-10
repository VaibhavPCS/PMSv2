/**
 * ONE-OFF DEV/TEST UTILITY — sets EVERY user's password to a single shared value
 * so a tester can sign in as any account. Destructive + irreversible. Run only
 * against a local/test SuperTokens+DB, never production.
 *
 *   node scripts/reset-all-passwords.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Compose DATABASE_URL the same way the service's index.js does (DB_BASE + DB_NAME)
// BEFORE the Prisma client is required.
process.env.DB_NAME = process.env.DB_NAME || 'pms_auth';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `${process.env.DB_BASE.trim()}/${process.env.DB_NAME.trim()}?schema=public`;
}

const supertokens = require('supertokens-node');
const EmailPassword = require('supertokens-node/recipe/emailpassword');
const { InitAuth } = require('@pms/auth-middleware');
const prisma = require('../src/config/prisma');

const NEW_PASSWORD = process.env.RESET_ALL_PASSWORD || 'Vaibhav@12345';

InitAuth({
  connectionURI: process.env.SUPERTOKENS_CONNECTION_URI,
  apiKey: process.env.SUPERTOKENS_API_KEY,
  appName: process.env.APP_NAME || 'PMS',
  apiDomain: process.env.API_DOMAIN,
  websiteDomain: process.env.WEBSITE_DOMAIN,
  includeEmailPassword: true,
});

(async () => {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  let ok = 0;
  let failed = 0;
  for (const u of users) {
    try {
      const res = await EmailPassword.updateEmailOrPassword({
        recipeUserId: typeof supertokens.convertToRecipeUserId === 'function'
          ? supertokens.convertToRecipeUserId(u.id)
          : undefined,
        userId: u.id, // older supertokens-node signature
        password: NEW_PASSWORD,
      });
      if (res.status === 'OK') {
        ok += 1;
      } else {
        failed += 1;
        console.log(`SKIP ${u.email}: ${res.status}`);
      }
    } catch (e) {
      failed += 1;
      console.log(`ERR  ${u.email}: ${e.message}`);
    }
  }
  console.log(`\nDone: ${ok} updated, ${failed} skipped/failed of ${users.length} users.`);
  process.exit(failed && !ok ? 1 : 0);
})();
