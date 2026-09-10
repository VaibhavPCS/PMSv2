const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

// unified-env defaults: per-service PORT + DB_NAME are fixed architectural
// constants, so they live in code — the single root .env holds only shared config.
process.env.PORT = process.env.PORT || '4009';
process.env.DB_NAME = process.env.DB_NAME || 'pms_meeting';
if (!process.env.DATABASE_URL) {
  const dbBase = process.env.DB_BASE?.trim();
  const dbName = process.env.DB_NAME?.trim();

  if (!dbBase || !dbName) {
    throw new Error('Missing DB_BASE or DB_NAME environment variables in meeting-service.');
  }

  process.env.DATABASE_URL = `${dbBase}/${dbName}?schema=public`;
}

require('./src/server');
