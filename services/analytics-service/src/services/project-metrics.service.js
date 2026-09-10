const prisma = require('../config/prisma');
const { TASK_STATUS } = require('@pms/constants');
const F = require('./metric-formulas');

// ============================================================================
// PROJECT METRICS SERVICE — incrementally maintains the ProjectMetric
// current-state row for the project affected by a task lifecycle transition,
// plus the PROJECT_* domain events (create/delete) for row lifecycle.
//
// Maintains JSON status/priority distributions and rolling cycle/lead-time
// averages via a running-mean update from per-task durations. O(1) per event.
// ============================================================================

const bumpDist = (dist, key, by) => {
  if (!key) return dist;
  const out = { ...(dist || {}) };
  out[key] = Math.max(0, (out[key] || 0) + by);
  return out;
};

// Running mean update: fold a single new sample into a mean over n prior samples.
const runningMean = (oldMean, n, newValue) => {
  if (newValue == null) return oldMean;
  return (oldMean * n + newValue) / (n + 1);
};

const ensureRow = async (projectId, workspaceId) => {
  const existing = await prisma.projectMetric.findUnique({ where: { projectId } });
  if (existing) return existing;
  return prisma.projectMetric.create({
    data: { projectId, workspaceId: workspaceId || 'unknown' },
  });
};

// ─── PROJECT_CREATED / PROJECT_DELETED ────────────────────────────────────────
const onProjectCreated = async (evt) => {
  const { projectId, workspaceId } = evt;
  if (!projectId) return;
  await prisma.projectMetric.upsert({
    where: { projectId },
    create: { projectId, workspaceId: workspaceId || 'unknown' },
    update: { workspaceId: workspaceId || undefined },
  });
};

const onProjectDeleted = async (evt) => {
  const { projectId } = evt;
  if (!projectId) return;
  await prisma.projectMetric.deleteMany({ where: { projectId } });
};

// ─── Task lifecycle transition rollup ─────────────────────────────────────────
const applyTransition = async ({ prev, next }) => {
  const projectId = next?.projectId || prev?.projectId;
  const workspaceId = next?.workspaceId || prev?.workspaceId;
  if (!projectId || projectId === 'unknown') return null;

  const row = await ensureRow(projectId, workspaceId);

  const prevS = prev ? F.normalizeStatus(prev.status) : null;
  const nextS = next ? F.normalizeStatus(next.status) : null;

  let totalTasks = row.totalTasks;
  if (!prev && next) totalTasks += 1;
  if (prev && !next) totalTasks = Math.max(0, totalTasks - 1);

  let statusDistribution = row.statusDistribution || {};
  if (prevS) statusDistribution = bumpDist(statusDistribution, prevS, -1);
  if (nextS) statusDistribution = bumpDist(statusDistribution, nextS, +1);

  let priorityDistribution = row.priorityDistribution || {};
  if (prev?.priority) priorityDistribution = bumpDist(priorityDistribution, prev.priority, -1);
  if (next?.priority) priorityDistribution = bumpDist(priorityDistribution, next.priority, +1);

  // Headline buckets are derived from the distribution to stay self-consistent.
  const completedCount = (statusDistribution[TASK_STATUS.COMPLETED] || 0) + (statusDistribution[TASK_STATUS.APPROVED] || 0);
  const inProgressCount = (statusDistribution[TASK_STATUS.IN_PROGRESS] || 0) + (statusDistribution[TASK_STATUS.IN_REVIEW] || 0);
  const todoCount = statusDistribution[TASK_STATUS.PENDING] || 0;
  const overdueCount = statusDistribution[TASK_STATUS.OVERDUE] || 0;
  const rejectedCount = statusDistribution[TASK_STATUS.REJECTED] || 0;
  const pendingApprovalCount = statusDistribution[TASK_STATUS.IN_REVIEW] || 0;

  // Cycle/lead averages: fold this task's durations in when it just completed.
  let avgCycleTimeMs = row.avgCycleTimeMs;
  let avgLeadTimeMs = row.avgLeadTimeMs;
  const becameDone = next && next.isDone && !(prev && prev.isDone);
  if (becameDone) {
    const nDone = Math.max(0, completedCount - 1);
    if (next.cycleTimeMs > 0) avgCycleTimeMs = F.round2(runningMean(row.avgCycleTimeMs, nDone, next.cycleTimeMs));
    if (next.leadTimeMs > 0) avgLeadTimeMs = F.round2(runningMean(row.avgLeadTimeMs, nDone, next.leadTimeMs));
  }

  const approvedTotal = statusDistribution[TASK_STATUS.APPROVED] || 0;
  const approvalRate = F.approvalRate(approvedTotal, rejectedCount);
  const completionPercent = F.pct(completedCount, totalTasks);

  let onTimeCompletionRate = row.onTimeCompletionRate;
  if (becameDone) {
    const prevOnTimeAcc = F.round2((row.onTimeCompletionRate / 100) * Math.max(0, completedCount - 1));
    const newOnTimeAcc = prevOnTimeAcc + (next.onTime ? 1 : 0);
    onTimeCompletionRate = F.onTimeCompletionRate(newOnTimeAcc, completedCount);
  }

  const healthScore = F.projectHealthScore({
    completionPercent, approvalRate, onTimeCompletionRate, overdueCount, totalTasks,
  });

  const data = {
    totalTasks,
    completedCount,
    inProgressCount,
    todoCount,
    overdueCount,
    rejectedCount,
    pendingApprovalCount,
    statusDistribution,
    priorityDistribution,
    approvalRate,
    onTimeCompletionRate,
    avgCycleTimeMs,
    avgLeadTimeMs,
    completionPercent,
    healthScore,
    workspaceId: workspaceId || row.workspaceId,
  };

  await prisma.projectMetric.update({ where: { projectId }, data });
  return data;
};

module.exports = { applyTransition, onProjectCreated, onProjectDeleted };
