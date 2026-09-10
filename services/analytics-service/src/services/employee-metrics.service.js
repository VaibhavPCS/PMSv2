const prisma = require('../config/prisma');
const { TASK_STATUS } = require('@pms/constants');
const F = require('./metric-formulas');

// ============================================================================
// EMPLOYEE METRICS SERVICE — incrementally maintains the EmployeeMetric
// current-state row for the (assignee, workspace) pair affected by a task event.
//
// Strategy: the lifecycle service hands us { prev, next } slim task states.
// We translate the state change into +/- deltas on the stored counters, then
// recompute the derived rates (approvalRate, onTime%, productivity) from the
// new counters using the shared formulas. O(1) per event — no scans.
//
// Schema note: EmployeeMetric stores headline counters + derived rates only
// (no hidden accumulators). Cumulative quality figures (totalSubmissions,
// totalRejections, totalReassignments, onTimeCompleted) are reconstructed from
// the current counters and rates each apply; the daily cron snapshot job is the
// exact-correction backstop for any drift.
// ============================================================================

// Map a normalized status to the count-bucket field it belongs to.
const bucketForStatus = (status) => {
  const s = F.normalizeStatus(status);
  if (s === TASK_STATUS.COMPLETED || s === TASK_STATUS.APPROVED) return 'completedCount';
  if (s === TASK_STATUS.IN_PROGRESS || s === TASK_STATUS.IN_REVIEW) return 'inProgressCount';
  if (s === TASK_STATUS.OVERDUE) return 'overdueCount';
  if (s === TASK_STATUS.PENDING) return 'todoCount';
  return null; // on_hold, rejected, flagged: not in the headline buckets
};

const emptyDelta = () => ({
  totalTasks: 0,
  completedCount: 0,
  todoCount: 0,
  inProgressCount: 0,
  overdueCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  pendingApprovalCount: 0,
  submissions: 0,
  rejections: 0,
  onTime: 0,
  reassignments: 0,
});

// Derive the counter deltas for one assignee from a prev→next transition.
const deltaForTransition = (prev, next) => {
  const d = emptyDelta();
  const hadTask = !!prev;
  const hasTask = !!next;

  if (!hadTask && hasTask) d.totalTasks += 1; // created
  if (hadTask && !hasTask) d.totalTasks -= 1; // deleted

  // Headline status buckets: remove prev bucket, add next bucket.
  if (hadTask) {
    const b = bucketForStatus(prev.status);
    if (b) d[b] -= 1;
  }
  if (hasTask) {
    const b = bucketForStatus(next.status);
    if (b) d[b] += 1;
  }

  const prevS = prev ? F.normalizeStatus(prev.status) : null;
  const nextS = next ? F.normalizeStatus(next.status) : null;

  if (nextS === TASK_STATUS.APPROVED && prevS !== TASK_STATUS.APPROVED) d.approvedCount += 1;
  if (prevS === TASK_STATUS.APPROVED && nextS !== TASK_STATUS.APPROVED) d.approvedCount -= 1;
  if (nextS === TASK_STATUS.REJECTED && prevS !== TASK_STATUS.REJECTED) d.rejectedCount += 1;
  if (prevS === TASK_STATUS.REJECTED && nextS !== TASK_STATUS.REJECTED) d.rejectedCount -= 1;
  if (nextS === TASK_STATUS.IN_REVIEW && prevS !== TASK_STATUS.IN_REVIEW) d.pendingApprovalCount += 1;
  if (prevS === TASK_STATUS.IN_REVIEW && nextS !== TASK_STATUS.IN_REVIEW) d.pendingApprovalCount -= 1;

  if (next && (next.approvalAttempts || 0) > (prev?.approvalAttempts || 0)) {
    d.submissions += (next.approvalAttempts || 0) - (prev?.approvalAttempts || 0);
  }
  if (next && (next.rejectionCount || 0) > (prev?.rejectionCount || 0)) {
    d.rejections += (next.rejectionCount || 0) - (prev?.rejectionCount || 0);
  }
  if (next && (next.reassignments || 0) > (prev?.reassignments || 0)) {
    d.reassignments += (next.reassignments || 0) - (prev?.reassignments || 0);
  }
  if (next && next.isDone && !(prev && prev.isDone) && next.onTime) d.onTime += 1;

  return d;
};

// Reconstruct a cumulative accumulator from a stored rate (%) and its base count.
const fromRate = (ratePct, base) => Math.round(((ratePct || 0) / 100) * (base || 0));

// Apply a delta to (and recompute) the EmployeeMetric row.
const applyToEmployee = async (userId, workspaceId, d) => {
  if (!userId || !workspaceId) return null;

  const existing = await prisma.employeeMetric.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  const cur = existing || emptyDelta();

  const totalTasks = Math.max(0, (cur.totalTasks || 0) + d.totalTasks);
  const completedCount = Math.max(0, (cur.completedCount || 0) + d.completedCount);
  const todoCount = Math.max(0, (cur.todoCount || 0) + d.todoCount);
  const inProgressCount = Math.max(0, (cur.inProgressCount || 0) + d.inProgressCount);
  const overdueCount = Math.max(0, (cur.overdueCount || 0) + d.overdueCount);
  const approvedCount = Math.max(0, (cur.approvedCount || 0) + d.approvedCount);
  const rejectedCount = Math.max(0, (cur.rejectedCount || 0) + d.rejectedCount);
  const pendingApprovalCount = Math.max(0, (cur.pendingApprovalCount || 0) + d.pendingApprovalCount);

  // Reconstruct cumulative accumulators from prior rates, then apply deltas.
  const prevCompleted = existing?.completedCount || 0;
  const prevTotal = existing?.totalTasks || 0;
  const onTimeAcc = Math.max(0, fromRate(existing?.onTimeCompletionRate, prevCompleted) + d.onTime);
  const submissionsAcc = Math.max(approvedCount, fromRate(100, approvedCount) === 0
    ? d.submissions
    : Math.round(existing?.firstTimeApprovalRate ? approvedCount / (existing.firstTimeApprovalRate / 100) : 0) + d.submissions);
  const rejectionsAcc = Math.max(0, Math.round((existing?.avgRejectionsPerTask || 0) * prevTotal) + d.rejections);
  const reassignAcc = Math.max(0, fromRate(existing?.reworkRate, prevTotal) + d.reassignments);

  const approvalRate = F.approvalRate(approvedCount, rejectedCount);
  const firstTimeApprovalRate = F.firstTimeApprovalRate(approvedCount, submissionsAcc);
  const onTimeCompletionRate = F.onTimeCompletionRate(onTimeAcc, completedCount);
  const avgRejectionsPerTask = F.avgRejectionsPerTask(rejectionsAcc, totalTasks);
  const reworkRate = F.reworkRate(reassignAcc, totalTasks);
  const productivityScore = F.productivityScore({
    approvalRate, onTimeCompletionRate, completedCount, avgRejectionsPerTask,
  });

  const data = {
    userId,
    workspaceId,
    totalTasks,
    completedCount,
    todoCount,
    inProgressCount,
    overdueCount,
    approvedCount,
    rejectedCount,
    pendingApprovalCount,
    approvalRate,
    firstTimeApprovalRate,
    onTimeCompletionRate,
    avgRejectionsPerTask,
    reworkRate,
    productivityScore,
  };

  await prisma.employeeMetric.upsert({
    where: { userId_workspaceId: { userId, workspaceId } },
    create: data,
    update: data,
  });
  return data;
};

// Public entry: update the relevant employee row(s) for a lifecycle transition.
// Handles assignee changes by moving the task's contribution between rows.
const applyTransition = async ({ prev, next }) => {
  const prevAssignee = prev?.assigneeId || null;
  const nextAssignee = next?.assigneeId || null;
  const workspaceId = next?.workspaceId || prev?.workspaceId;

  if (prevAssignee && nextAssignee && prevAssignee === nextAssignee) {
    return applyToEmployee(nextAssignee, workspaceId, deltaForTransition(prev, next));
  }
  if (prevAssignee) {
    await applyToEmployee(prevAssignee, prev.workspaceId, deltaForTransition(prev, null));
  }
  if (nextAssignee) {
    await applyToEmployee(nextAssignee, workspaceId, deltaForTransition(null, next));
  }
  return null;
};

module.exports = { applyTransition, applyToEmployee, deltaForTransition, bucketForStatus };
