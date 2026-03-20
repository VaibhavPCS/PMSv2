const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  const dbBase = process.env.DB_BASE?.trim();
  const dbName = process.env.DB_NAME?.trim();

  if (!dbBase || !dbName) {
    console.error('Missing DB_BASE or DB_NAME environment variables for Prisma commands.');
    process.exit(1);
  }

  process.env.DATABASE_URL = `${dbBase}/${dbName}?schema=public`;
}

const prismaBin = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const prismaArgs = process.argv.slice(2);

const result = spawnSync(prismaBin, prismaArgs, {
  env: process.env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);