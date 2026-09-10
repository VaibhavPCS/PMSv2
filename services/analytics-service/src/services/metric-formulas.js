// Pure metric formulas, ported from PMS_Analytics/utils/metrics-calculator.js.
// No DB access here — these are deterministic functions over already-aggregated
// counters so every incremental updater computes derived rates identically.

const { TASK_STATUS } = require('@pms/constants');

const HOUR_MS = 1000 * 60 * 60;

// Canonicalize the many historical status spellings to the @pms/constants set.
const NORMALIZE_STATUS = {
  'to-do': TASK_STATUS.PENDING,
  todo: TASK_STATUS.PENDING,
  pending: TASK_STATUS.PENDING,
  'in-progress': TASK_STATUS.IN_PROGRESS,
  inprogress: TASK_STATUS.IN_PROGRESS,
  in_progress: TASK_STATUS.IN_PROGRESS,
  'in-review': TASK_STATUS.IN_REVIEW,
  in_review: TASK_STATUS.IN_REVIEW,
  done: TASK_STATUS.COMPLETED,
  completed: TASK_STATUS.COMPLETED,
  complete: TASK_STATUS.COMPLETED,
  approved: TASK_STATUS.APPROVED,
  rejected: TASK_STATUS.REJECTED,
  'on-hold': TASK_STATUS.ON_HOLD,
  on_hold: TASK_STATUS.ON_HOLD,
  onhold: TASK_STATUS.ON_HOLD,
  overdue: TASK_STATUS.OVERDUE,
  flagged: TASK_STATUS.FLAGGED,
};

const normalizeStatus = (status) => {
  if (!status) return null;
  const key = String(status).trim().toLowerCase();
  return NORMALIZE_STATUS[key] || key;
};

// A "done" task = anything that has reached a completed/approved terminal state.
const isDoneStatus = (status) => {
  const s = normalizeStatus(status);
  return s === TASK_STATUS.COMPLETED || s === TASK_STATUS.APPROVED;
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;
const safeDiv = (a, b) => (b > 0 ? a / b : 0);
const pct = (a, b) => round2(safeDiv(a, b) * 100);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// approvalRate = approved / (approved + rejected) * 100
const approvalRate = (approved, rejected) => pct(approved, approved + rejected);

// firstTimeApprovalRate = approved / totalSubmissions * 100
const firstTimeApprovalRate = (approved, submissions) => pct(approved, submissions);

// onTimeCompletionRate = onTimeCompleted / completed * 100
const onTimeCompletionRate = (onTime, completed) => pct(onTime, completed);

// reworkRate = reassignments / totalTasks * 100
const reworkRate = (reassignments, totalTasks) => pct(reassignments, totalTasks);

// avgRejectionsPerTask = totalRejections / totalTasks
const avgRejectionsPerTask = (totalRejections, totalTasks) => round2(safeDiv(totalRejections, totalTasks));

// productivityScore (0..100), ported verbatim weighting:
//   approvalRate*0.4 + onTimeRate*0.3 + velocity*0.2 + qualityScore*0.1
//   qualityScore = 100 - avgRejectionsPerTask*10
const productivityScore = ({ approvalRate: ar = 0, onTimeCompletionRate: ot = 0, completedCount = 0, avgRejectionsPerTask: arpt = 0 }) => {
  const qualityScore = 100 - arpt * 10;
  const score = ar * 0.4 + ot * 0.3 + completedCount * 0.2 + qualityScore * 0.1;
  return round2(clamp(score, 0, 100));
};

// projectHealthScore (0..100): weighted blend of completion %, approval rate,
// on-time rate, penalized by overdue ratio.
const projectHealthScore = ({ completionPercent = 0, approvalRate: ar = 0, onTimeCompletionRate: ot = 0, overdueCount = 0, totalTasks = 0 }) => {
  const overduePenalty = pct(overdueCount, totalTasks);
  const score = completionPercent * 0.4 + ar * 0.25 + ot * 0.25 - overduePenalty * 0.1;
  return round2(clamp(score, 0, 100));
};

module.exports = {
  HOUR_MS,
  normalizeStatus,
  isDoneStatus,
  round2,
  safeDiv,
  pct,
  clamp,
  approvalRate,
  firstTimeApprovalRate,
  onTimeCompletionRate,
  reworkRate,
  avgRejectionsPerTask,
  productivityScore,
  projectHealthScore,
};
