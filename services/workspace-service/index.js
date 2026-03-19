const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `${process.env.DB_BASE}/${process.env.DB_NAME}?schema=public`;
}

require('./src/server');
