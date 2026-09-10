const { PrismaClient } = require('../../generated/prisma-client');
const { CreateLogger } = require('@pms/logger');

// READ-ONLY connection to the pms_task database.
//
// The analytics Prisma schema models only the analytics DB (pms_analytics), so
// the cron scheduler needs a separate client pointed at pms_task to read live
// Sprint/Task rows for burndown & velocity points. We reuse the generated
// PrismaClient with a datasource URL override and only ever issue $queryRaw
// SELECTs against it (never writes).
//
// URL resolution order:
//   1. TASK_DATABASE_URL (explicit override)
//   2. composed from DB_BASE + TASK_DB_NAME (default 'pms_task')
// If neither is resolvable, GetTaskSource() returns null and the agile-point
// snapshot steps no-op gracefully.

const Logger = CreateLogger('analytics-service:task-source');

let _client = null;
let _resolved = false;

const resolveUrl = () => {
  if (process.env.TASK_DATABASE_URL) return process.env.TASK_DATABASE_URL;

  const dbBase = process.env.DB_BASE?.trim();
  const dbName = (process.env.TASK_DB_NAME || 'pms_task').trim();
  if (!dbBase || !dbName) return null;

  return `${dbBase}/${dbName}?schema=public`;
};

const GetTaskSource = () => {
  if (_resolved) return _client;
  _resolved = true;

  const url = resolveUrl();
  if (!url) {
    Logger.warn('pms_task source DB not configured (set TASK_DATABASE_URL or DB_BASE); agile snapshots will be skipped');
    _client = null;
    return _client;
  }

  _client = global.__analyticsTaskSource || new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__analyticsTaskSource = _client;
  }

  return _client;
};

const DisconnectTaskSource = async () => {
  if (_client) {
    try {
      await _client.$disconnect();
    } catch (err) {
      Logger.error({ err: err.message }, 'failed to disconnect pms_task source');
    }
  }
};

module.exports = { GetTaskSource, DisconnectTaskSource };
