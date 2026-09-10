const prisma = require('../config/prisma');

// ============================================================================
// QUERY SERVICE — read-only data access for the analytics dashboard API.
//
// HARD RULE: this layer NEVER aggregates. Every function is a straight read of
// a pre-aggregated table that Kafka consumers (current-state) or the cron
// scheduler (time-series) already populated. No counts, no group-bys over raw
// domain rows, no inline math beyond trivial ordering/slicing of stored rows.
// ============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Clamp a user-supplied limit into a safe range.
const clampLimit = (raw, fallback = DEFAULT_LIMIT) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(n)));
};

// Build a { gte, lte } capturedAt filter from optional ISO date strings.
const dateRange = (from, to) => {
  const range = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return Object.keys(range).length ? range : undefined;
};

// ─── Current-state single-entity reads ───────────────────────────────────────

const GetEmployeeMetric = (userId, workspaceId) =>
  prisma.employeeMetric.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

const GetProjectMetric = (projectId, workspaceId) =>
  prisma.projectMetric.findFirst({ where: { projectId, workspaceId } });

const GetWorkspaceMetric = (workspaceId) =>
  prisma.workspaceMetric.findUnique({ where: { workspaceId } });

// ─── Leaderboard (pre-ranked) ────────────────────────────────────────────────

const GetLeaderboard = (workspaceId, limit) =>
  prisma.leaderboardEntry.findMany({
    where: { workspaceId },
    orderBy: { rank: 'asc' },
    take: clampLimit(limit),
  });

// ─── Workload — current-state per-employee rows for a workspace ───────────────
// Returns the slim fields a workload heatmap needs; ordered by open work.
const GetWorkload = (workspaceId, limit) =>
  prisma.employeeMetric.findMany({
    where: { workspaceId },
    orderBy: [{ inProgressCount: 'desc' }, { todoCount: 'desc' }],
    take: clampLimit(limit, MAX_LIMIT),
    select: {
      userId: true,
      workspaceId: true,
      totalTasks: true,
      todoCount: true,
      inProgressCount: true,
      completedCount: true,
      overdueCount: true,
      productivityScore: true,
      updatedAt: true,
    },
  });

// ─── Cycle/lead time — per-task lifecycle facts, workspace-scoped ─────────────
// Optionally narrowed to a project or assignee. Read straight from the
// pre-computed lifecycle table; durations were calculated by the consumer.
const GetCycleTime = ({ workspaceId, projectId, assigneeId, limit }) =>
  prisma.taskLifecycleStat.findMany({
    where: {
      workspaceId,
      ...(projectId ? { projectId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: clampLimit(limit, MAX_LIMIT),
    select: {
      taskId: true,
      projectId: true,
      assigneeId: true,
      cycleTimeMs: true,
      leadTimeMs: true,
      reviewDurationMs: true,
      rejectionCount: true,
      isFirstTimeRight: true,
      status: true,
      priority: true,
      completedAtSrc: true,
    },
  });

// ─── Time-series reads (append-only snapshot tables) ──────────────────────────

const GetBurndown = ({ workspaceId, sprintId, from, to }) =>
  prisma.burndownPoint.findMany({
    where: {
      workspaceId,
      ...(sprintId ? { sprintId } : {}),
      ...(dateRange(from, to) ? { capturedAt: dateRange(from, to) } : {}),
    },
    orderBy: { capturedAt: 'asc' },
  });

const GetVelocity = ({ workspaceId, projectId, from, to }) =>
  prisma.velocityPoint.findMany({
    where: {
      workspaceId,
      ...(projectId ? { projectId } : {}),
      ...(dateRange(from, to) ? { capturedAt: dateRange(from, to) } : {}),
    },
    orderBy: { capturedAt: 'asc' },
  });

const GetCfd = ({ workspaceId, projectId, from, to }) =>
  prisma.cfdPoint.findMany({
    where: {
      workspaceId,
      ...(projectId ? { projectId } : {}),
      ...(dateRange(from, to) ? { capturedAt: dateRange(from, to) } : {}),
    },
    orderBy: { capturedAt: 'asc' },
  });

const GetThroughput = ({ workspaceId, projectId, period, from, to }) =>
  prisma.throughputPoint.findMany({
    where: {
      workspaceId,
      ...(projectId ? { projectId } : {}),
      ...(period ? { period } : {}),
      ...(dateRange(from, to) ? { capturedAt: dateRange(from, to) } : {}),
    },
    orderBy: { capturedAt: 'asc' },
  });

// ─── Overview — fan-out of independent pre-aggregated reads for one workspace ─
// Each branch is its own findUnique/findMany; the controller assembles the
// payload. No aggregation is performed — we only read stored rows in parallel.
const GetOverview = async (workspaceId, leaderboardLimit) => {
  const [workspace, leaderboard, topWorkload] = await Promise.all([
    prisma.workspaceMetric.findUnique({ where: { workspaceId } }),
    prisma.leaderboardEntry.findMany({
      where: { workspaceId },
      orderBy: { rank: 'asc' },
      take: clampLimit(leaderboardLimit, 5),
    }),
    prisma.employeeMetric.findMany({
      where: { workspaceId },
      orderBy: [{ overdueCount: 'desc' }, { inProgressCount: 'desc' }],
      take: 5,
      select: {
        userId: true,
        inProgressCount: true,
        overdueCount: true,
        productivityScore: true,
      },
    }),
  ]);

  return { workspace, leaderboard, topWorkload };
};

module.exports = {
  GetEmployeeMetric,
  GetProjectMetric,
  GetWorkspaceMetric,
  GetLeaderboard,
  GetWorkload,
  GetCycleTime,
  GetBurndown,
  GetVelocity,
  GetCfd,
  GetThroughput,
  GetOverview,
};
