const prisma = require('../config/prisma');
const { TASK_STATUS } = require('@pms/constants');
const { normalizeStatus, isDoneStatus, round2 } = require('./metric-formulas');

// ============================================================================
// TASK LIFECYCLE SERVICE — owns the per-task TaskLifecycleStat row, which is
// the SOURCE OF TRUTH for analytics. Domain events are thin (id + a few fields),
// so we keep a denormalized per-task snapshot here and mutate it incrementally.
//
// Every mutating method returns { prev, next } task-state snapshots. The rollup
// aggregators (employee/project/workspace/leaderboard) diff prev→next to apply
// counter deltas WITHOUT re-reading source DBs. This keeps runtime fully
// event-driven and O(1) per event.
//
// Schema note: only columns present in prisma/schema.prisma TaskLifecycleStat
// are written here. Review duration is accumulated using the row's updatedAt as
// the implicit "submitted" marker (no dedicated submit-timestamp column exists).
// On-time completion is derived from the event's dueDate at completion time and
// carried out via the returned state (not persisted, since there is no dueAt
// column) so the employee/project rollups can count it.
// ============================================================================

// Slim, comparable view of a stored lifecycle row used by the diffing rollups.
// `onTime` is set transiently by completion handlers; it is not read from a column.
const toState = (row, extra = {}) => {
  if (!row) return null;
  const status = row.status || null;
  return {
    taskId: row.taskId,
    projectId: row.projectId,
    workspaceId: row.workspaceId,
    assigneeId: row.assigneeId || null,
    status,
    priority: row.priority || null,
    rejectionCount: row.rejectionCount || 0,
    reassignments: row.reassignments || 0,
    approvalAttempts: row.approvalAttempts || 0,
    isFirstTimeRight: !!row.isFirstTimeRight,
    cycleTimeMs: row.cycleTimeMs || 0,
    leadTimeMs: row.leadTimeMs || 0,
    isDone: isDoneStatus(status),
    isOverdue: status ? normalizeStatus(status) === TASK_STATUS.OVERDUE : false,
    onTime: false,
    ...extra,
  };
};

const findByTaskId = (taskId) => prisma.taskLifecycleStat.findUnique({ where: { taskId } });

// ─── TASK_CREATED ─────────────────────────────────────────────────────────────
// Seed the lifecycle row. assignees is an array; we track the first/primary one
// for per-employee rollups (mirrors the reference single-assignee model).
const onTaskCreated = async (evt) => {
  const { taskId, projectId, workspaceId, assignees, status, priority, createdAt } = evt;
  if (!taskId) return { prev: null, next: null };

  const prev = await findByTaskId(taskId);
  const assigneeId = Array.isArray(assignees) ? assignees[0] || null : assignees || null;
  const createdSrc = createdAt ? new Date(createdAt) : new Date(evt.timestamp || Date.now());

  const create = {
    taskId,
    projectId: projectId || prev?.projectId || 'unknown',
    workspaceId: workspaceId || prev?.workspaceId || 'unknown',
    assigneeId,
    status: normalizeStatus(status) || TASK_STATUS.PENDING,
    priority: priority || null,
    createdAtSrc: createdSrc,
  };

  const next = await prisma.taskLifecycleStat.upsert({
    where: { taskId },
    create,
    update: {
      assigneeId,
      projectId: create.projectId,
      workspaceId: create.workspaceId,
      priority: create.priority,
    },
  });
  return { prev: toState(prev), next: toState(next) };
};

// ─── TASK_STATUS_CHANGED ──────────────────────────────────────────────────────
// Recompute durations and quality counters as the task moves through stages.
const onTaskStatusChanged = async (evt) => {
  const { taskId, to, from, dueDate } = evt;
  if (!taskId) return { prev: null, next: null };

  const prev = await findByTaskId(taskId);
  const now = evt.timestamp ? new Date(evt.timestamp) : new Date();
  const nextStatus = normalizeStatus(to);
  const fromStatus = normalizeStatus(from);

  const update = { status: nextStatus };

  // First transition into IN_PROGRESS marks the working-start (for cycle time).
  if (nextStatus === TASK_STATUS.IN_PROGRESS && prev && !prev.startedAtSrc) {
    update.startedAtSrc = now;
  }

  // Submitting for review increments approval attempts.
  if (nextStatus === TASK_STATUS.IN_REVIEW) {
    update.approvalAttempts = (prev?.approvalAttempts || 0) + 1;
  }

  // Rejection: bump rejection count; accrue review time since last update.
  if (nextStatus === TASK_STATUS.REJECTED) {
    update.rejectionCount = (prev?.rejectionCount || 0) + 1;
    if (prev?.status && normalizeStatus(prev.status) === TASK_STATUS.IN_REVIEW && prev.updatedAt) {
      update.reviewDurationMs = (prev.reviewDurationMs || 0) + Math.max(0, now - new Date(prev.updatedAt));
    }
  }

  // Reaching a done/approved terminal state finalizes lead & cycle time.
  let onTime = false;
  if (isDoneStatus(nextStatus)) {
    update.completedAtSrc = now;
    const createdSrc = prev?.createdAtSrc ? new Date(prev.createdAtSrc) : null;
    const startedSrc = prev?.startedAtSrc ? new Date(prev.startedAtSrc) : null;
    update.leadTimeMs = createdSrc ? Math.max(0, now - createdSrc) : prev?.leadTimeMs || 0;
    update.cycleTimeMs = startedSrc ? Math.max(0, now - startedSrc) : prev?.cycleTimeMs || 0;
    update.totalDurationMs = update.leadTimeMs;
    update.workingDurationMs = update.cycleTimeMs;
    if (prev?.status && normalizeStatus(prev.status) === TASK_STATUS.IN_REVIEW && prev.updatedAt) {
      update.reviewDurationMs = (prev.reviewDurationMs || 0) + Math.max(0, now - new Date(prev.updatedAt));
    }
    update.isFirstTimeRight = (prev?.approvalAttempts || 0) <= 1 && (prev?.rejectionCount || 0) === 0;
    if (dueDate) onTime = now <= new Date(dueDate);
  }

  // Coming back from rejection into active work counts as rework.
  if (fromStatus === TASK_STATUS.REJECTED && nextStatus === TASK_STATUS.IN_PROGRESS) {
    update.reassignments = (prev?.reassignments || 0) + 1;
  }

  const next = await prisma.taskLifecycleStat.upsert({
    where: { taskId },
    create: { taskId, projectId: 'unknown', workspaceId: 'unknown', ...update },
    update,
  });
  return { prev: toState(prev), next: toState(next, { onTime }) };
};

// ─── TASK_OVERDUE ─────────────────────────────────────────────────────────────
const onTaskOverdue = async (evt) => {
  const { taskId } = evt;
  if (!taskId) return { prev: null, next: null };
  const prev = await findByTaskId(taskId);
  // Do not clobber a terminal status; overdue only applies to open work.
  if (prev && isDoneStatus(prev.status)) return { prev: toState(prev), next: toState(prev) };

  const next = await prisma.taskLifecycleStat.upsert({
    where: { taskId },
    create: { taskId, projectId: 'unknown', workspaceId: 'unknown', status: TASK_STATUS.OVERDUE },
    update: { status: TASK_STATUS.OVERDUE },
  });
  return { prev: toState(prev), next: toState(next) };
};

// ─── WORKFLOW_STAGE_CHANGED ───────────────────────────────────────────────────
// Workflow transitions are an alternate status driver; a terminal stage maps to
// completion (reuse the status-change machinery), otherwise track the raw stage.
const onWorkflowStageChanged = async (evt) => {
  const { taskId, toStage, isTerminal } = evt;
  if (!taskId) return { prev: null, next: null };
  if (isTerminal) {
    return onTaskStatusChanged({ taskId, to: TASK_STATUS.COMPLETED, timestamp: evt.timestamp });
  }
  const prev = await findByTaskId(taskId);
  const status = normalizeStatus(toStage);
  const next = await prisma.taskLifecycleStat.upsert({
    where: { taskId },
    create: { taskId, projectId: 'unknown', workspaceId: 'unknown', status },
    update: { status },
  });
  return { prev: toState(prev), next: toState(next) };
};

// ─── TASK_DELETED ─────────────────────────────────────────────────────────────
// Return prev state so rollups can decrement, then remove the lifecycle row.
const onTaskDeleted = async (evt) => {
  const { taskId } = evt;
  if (!taskId) return { prev: null, next: null };
  const prev = await findByTaskId(taskId);
  if (prev) await prisma.taskLifecycleStat.delete({ where: { taskId } }).catch(() => {});
  return { prev: toState(prev), next: null };
};

module.exports = {
  toState,
  onTaskCreated,
  onTaskStatusChanged,
  onTaskOverdue,
  onWorkflowStageChanged,
  onTaskDeleted,
  round2,
};
