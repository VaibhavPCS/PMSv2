const prisma = require('../config/prisma');
const { CreateLogger } = require('@pms/logger');
const { TASK_STATUS } = require('@pms/constants');
const { PublishTaskOverdue } = require('../events/publishers');

const logger = CreateLogger('task-service:overdue-scanner');
const INTERVAL_MS = Number(process.env.OVERDUE_SCAN_INTERVAL_MS) || 60 * 60 * 1000; // 1h default
const BATCH_SIZE = 500;
const SYSTEM_USER = 'system';

// Statuses that should NOT be flipped to overdue:
// - terminal states (completed/approved/rejected) — work is done or closed
// - overdue — already flagged
// - in_review — submitted, waiting on a reviewer; not the assignee's fault
const TERMINAL_STATUSES = [
  TASK_STATUS.COMPLETED,
  TASK_STATUS.APPROVED,
  TASK_STATUS.REJECTED,
  TASK_STATUS.OVERDUE,
  TASK_STATUS.IN_REVIEW,
];

const ScanOnce = async (now = new Date()) => {
  const candidates = await prisma.task.findMany({
    where: {
      isActive: true,
      isFlagged: false, // frozen (sprint-expired) tasks are handled by the flag flow, not overdue
      dueDate: { lt: now },
      status: { notIn: TERMINAL_STATUSES },
    },
    take: BATCH_SIZE,
    include: { assignees: true },
  });

  let flipped = 0;

  for (const task of candidates) {
    // Guard the flip on the status we read, so concurrent replicas can't
    // double-process the same task.
    const result = await prisma.task.updateMany({
      where: { id: task.id, status: task.status },
      data: { status: TASK_STATUS.OVERDUE },
    });
    if (result.count !== 1) continue;

    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        userId: SYSTEM_USER,
        action: 'overdue',
        fromValue: task.status,
        toValue: TASK_STATUS.OVERDUE,
        note: 'Auto-flagged overdue: dueDate passed',
      },
    });

    const assignees = task.assignees.map((a) => a.userId);
    try {
      await PublishTaskOverdue(task.id, task.projectId, task.workspaceId, assignees, task.dueDate.toISOString());
    } catch (err) {
      logger.error(`[OVERDUE_PUBLISH_FAILED] taskId=${task.id} error=${err.message}`);
    }
    flipped += 1;
  }

  return flipped;
};

const StartOverdueScanner = () => {
  let timeoutId = null;
  let stopped = false;

  const run = async () => {
    if (stopped) return;
    try {
      const count = await ScanOnce();
      if (count > 0) {
        logger.info(`[OVERDUE_SCANNER] Marked ${count} task(s) overdue`);
      }
    } catch (err) {
      logger.error('[OVERDUE_SCANNER] Error during run', { error: err?.message || String(err) });
    } finally {
      if (!stopped) {
        timeoutId = setTimeout(run, INTERVAL_MS);
      }
    }
  };

  run();
  logger.info(`Overdue scanner started — interval: ${INTERVAL_MS / 60_000} min`);

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
};

module.exports = { StartOverdueScanner, ScanOnce };
