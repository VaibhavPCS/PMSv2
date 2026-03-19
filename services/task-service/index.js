const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
if (!process.env.DATABASE_URL) {
  const dbBase = process.env.DB_BASE?.trim();
  const dbName = process.env.DB_NAME?.trim();

  if (!dbBase || !dbName) {
    console.error('Missing DB_BASE or DB_NAME environment variables in task-service.');
    process.exit(1);
  }

  process.env.DATABASE_URL = `${dbBase}/${dbName}?schema=public`;
}

require('./src/server');
