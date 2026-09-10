const prisma = require('../config/prisma');
const { TASK_STATUS } = require('@pms/constants');
const F = require('./metric-formulas');

// ============================================================================
// WORKSPACE METRICS SERVICE — incrementally maintains the WorkspaceMetric
// current-state row. Driven by:
//   • task lifecycle transitions (task counts, status distribution, cycle time)
//   • WORKSPACE_EVENTS  MEMBER_ADDED / MEMBER_REMOVED   -> totalMembers
//   • PROJECT_EVENTS    PROJECT_CREATED / PROJECT_DELETED -> totalProjects
//   • SPRINT_EVENTS     SPRINT_CREATED / SPRINT_DELETED   -> activeSprints
// O(1) per event; no scans.
// ============================================================================

const bumpDist = (dist, key, by) => {
  if (!key) return dist;
  const out = { ...(dist || {}) };
  out[key] = Math.max(0, (out[key] || 0) + by);
  return out;
};

const runningMean = (oldMean, n, newValue) => {
  if (newValue == null) return oldMean;
  return (oldMean * n + newValue) / (n + 1);
};

const ensureRow = async (workspaceId) => {
  const existing = await prisma.workspaceMetric.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return prisma.workspaceMetric.create({ data: { workspaceId } });
};

// Generic counter nudge for a workspace (members / projects / sprints).
const bumpCounter = async (workspaceId, field, by) => {
  if (!workspaceId || workspaceId === 'unknown') return;
  const row = await ensureRow(workspaceId);
  const value = Math.max(0, (row[field] || 0) + by);
  await prisma.workspaceMetric.update({ where: { workspaceId }, data: { [field]: value } });
};

const onMemberAdded = (evt) => bumpCounter(evt.workspaceId, 'totalMembers', +1);
const onMemberRemoved = (evt) => bumpCounter(evt.workspaceId, 'totalMembers', -1);
const onProjectCreated = (evt) => bumpCounter(evt.workspaceId, 'totalProjects', +1);

const onProjectDeleted = async (evt) => {
  // PROJECT_DELETED events carry no workspaceId; resolve via the project metric row.
  if (evt.workspaceId) return bumpCounter(evt.workspaceId, 'totalProjects', -1);
  const pm = await prisma.projectMetric.findUnique({ where: { projectId: evt.projectId } }).catch(() => null);
  if (pm?.workspaceId) return bumpCounter(pm.workspaceId, 'totalProjects', -1);
  return undefined;
};

const onSprintCreated = (evt) => bumpCounter(evt.workspaceId, 'activeSprints', +1);
const onSprintDeleted = (evt) => bumpCounter(evt.workspaceId, 'activeSprints', -1);

// ─── Task lifecycle transition rollup ─────────────────────────────────────────
const applyTransition = async ({ prev, next }) => {
  const workspaceId = next?.workspaceId || prev?.workspaceId;
  if (!workspaceId || workspaceId === 'unknown') return null;

  const row = await ensureRow(workspaceId);
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

  const completedCount = (statusDistribution[TASK_STATUS.COMPLETED] || 0) + (statusDistribution[TASK_STATUS.APPROVED] || 0);
  const overdueCount = statusDistribution[TASK_STATUS.OVERDUE] || 0;
  const approvedTotal = statusDistribution[TASK_STATUS.APPROVED] || 0;
  const rejectedTotal = statusDistribution[TASK_STATUS.REJECTED] || 0;
  const approvalRate = F.approvalRate(approvedTotal, rejectedTotal);

  let avgCycleTimeMs = row.avgCycleTimeMs;
  let throughputLast7Days = row.throughputLast7Days;
  let onTimeCompletionRate = row.onTimeCompletionRate;
  const becameDone = next && next.isDone && !(prev && prev.isDone);
  if (becameDone) {
    const nDone = Math.max(0, completedCount - 1);
    if (next.cycleTimeMs > 0) avgCycleTimeMs = F.round2(runningMean(row.avgCycleTimeMs, nDone, next.cycleTimeMs));
    throughputLast7Days += 1; // cron snapshot job rolls this back over the window
    const prevOnTimeAcc = F.round2((row.onTimeCompletionRate / 100) * nDone);
    onTimeCompletionRate = F.onTimeCompletionRate(prevOnTimeAcc + (next.onTime ? 1 : 0), completedCount);
  }

  const data = {
    totalTasks,
    completedCount,
    overdueCount,
    statusDistribution,
    priorityDistribution,
    approvalRate,
    onTimeCompletionRate,
    avgCycleTimeMs,
    throughputLast7Days,
  };

  await prisma.workspaceMetric.update({ where: { workspaceId }, data });
  return data;
};

module.exports = {
  applyTransition,
  onMemberAdded,
  onMemberRemoved,
  onProjectCreated,
  onProjectDeleted,
  onSprintCreated,
  onSprintDeleted,
};
