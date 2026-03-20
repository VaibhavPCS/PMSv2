const { CreateLogger }  = require('@pms/logger');
const { SpawnDueTasks } = require('../services/recurring.service');

const logger      = CreateLogger('task-service:recurring-scheduler');
const INTERVAL_MS = 60 * 60 * 1000; 

const StartRecurringScheduler = () => {
  let timeoutId = null;
  let stopped = false;

  const run = async () => {
    if (stopped) return;

    try {
      const count = await SpawnDueTasks();
      if (count > 0) {
        logger.info(`[RECURRING_SCHEDULER] Spawned ${count} task(s) from due templates`);
      }
    } catch (err) {
      logger.error('[RECURRING_SCHEDULER] Error during run', { error: err?.message || String(err), stack: err?.stack });
    } finally {
      if (!stopped) {
        timeoutId = setTimeout(run, INTERVAL_MS);
      }
    }
  };

  run(); 
  logger.info(`Recurring task scheduler started — interval: ${INTERVAL_MS / 60_000} min`);

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
};

module.exports = { StartRecurringScheduler };