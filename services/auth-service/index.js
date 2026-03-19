const path = require('path');
// 1. Root .env — sets DB_BASE, KAFKA_BROKER, SUPERTOKENS_CONNECTION_URI, APP_NAME, WEBSITE_DOMAIN
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// 2. Service .env — sets PORT, DB_NAME, API_DOMAIN, and service-specific vars
require('dotenv').config();
// 3. Compose DATABASE_URL (skipped if already set by the deployment environment)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `${process.env.DB_BASE}/${process.env.DB_NAME}?schema=public`;
}

require('./src/server');
