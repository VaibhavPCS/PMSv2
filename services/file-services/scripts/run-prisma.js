const path = require('path');
const { spawnSync } = require('child_process');

// Loads the UNIFIED root .env (DB_BASE) and composes DATABASE_URL for Prisma CLI.
// DB_NAME is a fixed per-service constant (the app sets it in index.js; the Prisma
// CLI doesn't load index.js, so we default it here too).
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

process.env.DB_NAME = process.env.DB_NAME || 'pms_files';

if (!process.env.DATABASE_URL) {
  const dbBase = process.env.DB_BASE?.trim();
  const dbName = process.env.DB_NAME?.trim();
  if (!dbBase || !dbName) {
    console.error('Missing DB_BASE (root .env) or DB_NAME for Prisma commands.');
    process.exit(1);
  }
  const normalizedBase = dbBase.replace(/\/+$/, '');
  process.env.DATABASE_URL = `${normalizedBase}/${dbName}?schema=public`;
}

const prismaBin = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(prismaBin, process.argv.slice(2), { env: process.env, stdio: 'inherit', shell: false });
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 0);
