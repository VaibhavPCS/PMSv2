const cron = require('node-cron');
const { CreateLogger } = require('@pms/logger');
const { runDailySnapshots } = require('../services/snapshot.service');

// ============================================================================
// SNAPSHOT SCHEDULER (node-cron).
//
// On a daily schedule, appends append-only TIME-SERIES rows (BurndownPoint,
// VelocityPoint, CfdPoint, ThroughputPoint, MetricSnapshot) computed from the
// current-state metric tables (owned by Kafka consumers) and read-only pms_task
// data. This is the ONLY component that writes snapshot tables on a timer.
//
// HARD RULES honoured here:
//   - Async only: aggregation runs inside the cron tick, never on an HTTP path.
//   - All math lives in ../services/snapshot.service.js; this file is wiring.
//   - Schedule via env CRON_SCHEDULE (default '0 2 * * *' = daily 02:00).
// ============================================================================

const Logger = CreateLogger('analytics-service:scheduler');

const DEFAULT_CRON = '0 2 * * *';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || DEFAULT_CRON;
const CRON_TIMEZONE = process.env.CRON_TIMEZONE || undefined;

let _running = false;
let _task = null;

// Guarded runner: prevents overlapping executions if a prior run is still in
// flight (e.g. a slow source DB and a tight schedule).
const runSnapshotJob = async (trigger = 'cron') => {
  if (_running) {
    Logger.warn({ trigger }, 'snapshot job already running; skipping this tick');
    return null;
  }

  _running = true;
  const startedAt = Date.now();
  try {
    Logger.info({ trigger }, 'snapshot job started');
    const summary = await runDailySnapshots(new Date());
    Logger.info({ trigger, durationMs: Date.now() - startedAt, ...summary }, 'snapshot job finished');
    return summary;
  } catch (err) {
    Logger.error({ trigger, err: err.message, durationMs: Date.now() - startedAt }, 'snapshot job failed');
    return null;
  } finally {
    _running = false;
  }
};

const StartSnapshotScheduler = () => {
  if (_task) {
    Logger.warn('snapshot scheduler already started');
    return _task;
  }

  if (!cron.validate(CRON_SCHEDULE)) {
    Logger.error({ schedule: CRON_SCHEDULE }, 'invalid CRON_SCHEDULE; snapshot scheduler not started');
    return null;
  }

  _task = cron.schedule(
    CRON_SCHEDULE,
    () => { runSnapshotJob('cron'); },
    CRON_TIMEZONE ? { timezone: CRON_TIMEZONE } : undefined,
  );

  Logger.info({ schedule: CRON_SCHEDULE, timezone: CRON_TIMEZONE || 'server-local' }, 'snapshot scheduler started');
  return _task;
};

const StopSnapshotScheduler = () => {
  if (_task) {
    _task.stop();
    _task = null;
    Logger.info('snapshot scheduler stopped');
  }
};

module.exports = {
  StartSnapshotScheduler,
  StopSnapshotScheduler,
  runSnapshotJob,
  CRON_SCHEDULE,
};
