const { CreateLogger } = require('@pms/logger');
const prisma = require('../config/prisma');
const { GetTaskSource } = require('../config/task-source');
const { isDoneStatus } = require('./metric-formulas');

// ============================================================================
// SNAPSHOT SERVICE (async aggregation — invoked ONLY by the cron scheduler).
//
// Appends append-only TIME-SERIES rows from data that is ALREADY aggregated:
//   - MetricSnapshot   <- current-state employee/project/workspace tables
//   - CfdPoint         <- current-state project status distribution
//   - ThroughputPoint  <- current-state project/workspace rollups
//   - BurndownPoint    <- live sprint/task counts (read-only from pms_task)
//   - VelocityPoint    <- closed sprints (read-only from pms_task)
//
// NEVER called from an HTTP handler. All heavy lifting stays here, off the
// request path. Current-state tables are owned by the Kafka consumers; this
// module only READS them and APPENDS trend rows. Story points do not exist in
// the source schema, so burndown/velocity are TASK-COUNT based.
// ============================================================================

const Logger = CreateLogger('analytics-service:snapshot');

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ---------------------------------------------------------------------------
// MetricSnapshot: one trend row per current-state entity / key.
// ---------------------------------------------------------------------------

const snapshotEmployeeMetrics = async (capturedAt) => {
  const rows = await prisma.employeeMetric.findMany();
  if (rows.length === 0) return 0;

  const data = rows.map((m) => ({
    workspaceId: m.workspaceId,
    entityId: m.userId,
    entityType: 'employee',
    metricKey: 'productivityScore',
    value: num(m.productivityScore),
    payload: {
      totalTasks: m.totalTasks,
      completedCount: m.completedCount,
      overdueCount: m.overdueCount,
      approvalRate: m.approvalRate,
      onTimeCompletionRate: m.onTimeCompletionRate,
      reworkRate: m.reworkRate,
      productivityScore: m.productivityScore,
    },
    period: 'daily',
    capturedAt,
  }));

  await prisma.metricSnapshot.createMany({ data });
  return data.length;
};

const snapshotProjectMetrics = async (capturedAt) => {
  const rows = await prisma.projectMetric.findMany();
  if (rows.length === 0) return { snapshots: 0, cfd: 0, throughput: 0 };

  const snapshotData = [];
  const cfdData = [];
  const throughputData = [];

  for (const m of rows) {
    snapshotData.push({
      workspaceId: m.workspaceId,
      entityId: m.projectId,
      entityType: 'project',
      metricKey: 'completionPercent',
      value: num(m.completionPercent),
      payload: {
        totalTasks: m.totalTasks,
        completedCount: m.completedCount,
        overdueCount: m.overdueCount,
        healthScore: m.healthScore,
        completionPercent: m.completionPercent,
        avgCycleTimeMs: m.avgCycleTimeMs,
        avgLeadTimeMs: m.avgLeadTimeMs,
      },
      period: 'daily',
      capturedAt,
    });

    const dist = m.statusDistribution || {};
    cfdData.push({
      workspaceId: m.workspaceId,
      projectId: m.projectId,
      entityId: m.projectId,
      todoCount: num(dist.todo ?? dist.pending ?? m.todoCount),
      inProgressCount: num(dist.inProgress ?? dist.in_progress ?? m.inProgressCount),
      inReviewCount: num(dist.inReview ?? dist.in_review ?? m.pendingApprovalCount),
      doneCount: num(dist.done ?? dist.completed ?? m.completedCount),
      onHoldCount: num(dist.onHold ?? dist.on_hold),
      statusCounts: dist,
      capturedAt,
    });

    throughputData.push({
      workspaceId: m.workspaceId,
      projectId: m.projectId,
      entityId: m.projectId,
      createdCount: 0,
      resolvedCount: num(m.completedLast7Days),
      overdueCount: num(m.overdueCount),
      avgCycleTimeMs: num(m.avgCycleTimeMs),
      avgLeadTimeMs: num(m.avgLeadTimeMs),
      period: 'daily',
      capturedAt,
    });
  }

  if (snapshotData.length) await prisma.metricSnapshot.createMany({ data: snapshotData });
  if (cfdData.length) await prisma.cfdPoint.createMany({ data: cfdData });
  if (throughputData.length) await prisma.throughputPoint.createMany({ data: throughputData });

  return { snapshots: snapshotData.length, cfd: cfdData.length, throughput: throughputData.length };
};

const snapshotWorkspaceMetrics = async (capturedAt) => {
  const rows = await prisma.workspaceMetric.findMany();
  if (rows.length === 0) return { snapshots: 0, throughput: 0 };

  const snapshotData = [];
  const throughputData = [];

  for (const m of rows) {
    snapshotData.push({
      workspaceId: m.workspaceId,
      entityId: m.workspaceId,
      entityType: 'workspace',
      metricKey: 'overdueCount',
      value: num(m.overdueCount),
      payload: {
        totalProjects: m.totalProjects,
        totalMembers: m.totalMembers,
        totalTasks: m.totalTasks,
        completedCount: m.completedCount,
        overdueCount: m.overdueCount,
        approvalRate: m.approvalRate,
        onTimeCompletionRate: m.onTimeCompletionRate,
        throughputLast7Days: m.throughputLast7Days,
      },
      period: 'daily',
      capturedAt,
    });

    throughputData.push({
      workspaceId: m.workspaceId,
      projectId: null,
      entityId: m.workspaceId,
      createdCount: 0,
      resolvedCount: num(m.throughputLast7Days),
      overdueCount: num(m.overdueCount),
      avgCycleTimeMs: num(m.avgCycleTimeMs),
      avgLeadTimeMs: 0,
      period: 'daily',
      capturedAt,
    });
  }

  if (snapshotData.length) await prisma.metricSnapshot.createMany({ data: snapshotData });
  if (throughputData.length) await prisma.throughputPoint.createMany({ data: throughputData });

  return { snapshots: snapshotData.length, throughput: throughputData.length };
};

// ---------------------------------------------------------------------------
// Agile points read live counts from pms_task (READ-ONLY). If the source DB is
// not configured, these no-op so the rest of the snapshot run still succeeds.
// ---------------------------------------------------------------------------

const idealRemaining = (sprint, totalCount, capturedAt) => {
  const start = sprint.startDate ? new Date(sprint.startDate).getTime() : null;
  const end = sprint.endDate ? new Date(sprint.endDate).getTime() : null;
  if (!start || !end || end <= start) return totalCount;

  const now = capturedAt.getTime();
  if (now <= start) return totalCount;
  if (now >= end) return 0;

  const fractionElapsed = (now - start) / (end - start);
  return Math.max(0, totalCount * (1 - fractionElapsed));
};

const snapshotBurndown = async (capturedAt) => {
  const taskSource = GetTaskSource();
  if (!taskSource) return 0;

  const sprints = await taskSource.$queryRawUnsafe(
    'SELECT id, "projectId", "startDate", "endDate" FROM "Sprint" WHERE status = $1 AND "isActive" = true',
    'active',
  );
  if (!sprints || sprints.length === 0) return 0;

  const data = [];
  for (const sprint of sprints) {
    const tasks = await taskSource.$queryRawUnsafe(
      'SELECT status, "workspaceId" FROM "Task" WHERE "sprintId" = $1 AND "isActive" = true',
      sprint.id,
    );
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => isDoneStatus(t.status)).length;
    const workspaceId = tasks[0]?.workspaceId || sprint.projectId;

    data.push({
      workspaceId,
      projectId: sprint.projectId,
      sprintId: sprint.id,
      entityId: sprint.id,
      remainingCount: totalCount - completedCount,
      completedCount,
      totalCount,
      idealRemaining: idealRemaining(sprint, totalCount, capturedAt),
      capturedAt,
    });
  }

  if (data.length) await prisma.burndownPoint.createMany({ data });
  return data.length;
};

const snapshotVelocity = async (capturedAt) => {
  const taskSource = GetTaskSource();
  if (!taskSource) return 0;

  // Capture velocity for sprints closed in the last 24h so each closed sprint
  // gets exactly one velocity point (idempotent within the daily run window).
  const since = new Date(capturedAt.getTime() - 24 * 60 * 60 * 1000);
  const sprints = await taskSource.$queryRawUnsafe(
    'SELECT id, "projectId", name FROM "Sprint" WHERE status = $1 AND "closedAt" >= $2',
    'closed',
    since,
  );
  if (!sprints || sprints.length === 0) return 0;

  const data = [];
  for (const sprint of sprints) {
    const tasks = await taskSource.$queryRawUnsafe(
      'SELECT status, "workspaceId" FROM "Task" WHERE "sprintId" = $1',
      sprint.id,
    );
    const committedCount = tasks.length;
    const completedCount = tasks.filter((t) => isDoneStatus(t.status)).length;
    const workspaceId = tasks[0]?.workspaceId || sprint.projectId;

    data.push({
      workspaceId,
      projectId: sprint.projectId,
      sprintId: sprint.id,
      entityId: sprint.id,
      committedCount,
      completedCount,
      velocity: completedCount,
      sprintName: sprint.name || null,
      capturedAt,
    });
  }

  if (data.length) await prisma.velocityPoint.createMany({ data });
  return data.length;
};

// ---------------------------------------------------------------------------
// Orchestrator: runs every snapshot kind, isolating failures so one bad source
// never aborts the whole daily run. Returns a structured summary for logging.
// ---------------------------------------------------------------------------

const runDailySnapshots = async (now = new Date()) => {
  const capturedAt = now;
  const summary = {
    capturedAt: capturedAt.toISOString(),
    employeeSnapshots: 0,
    projectSnapshots: 0,
    workspaceSnapshots: 0,
    cfdPoints: 0,
    throughputPoints: 0,
    burndownPoints: 0,
    velocityPoints: 0,
    errors: [],
  };

  const step = async (name, fn) => {
    try {
      return await fn();
    } catch (err) {
      Logger.error({ step: name, err: err.message }, 'snapshot step failed');
      summary.errors.push({ step: name, error: err.message });
      return null;
    }
  };

  summary.employeeSnapshots = (await step('employee', () => snapshotEmployeeMetrics(capturedAt))) || 0;

  const proj = await step('project', () => snapshotProjectMetrics(capturedAt));
  if (proj) {
    summary.projectSnapshots = proj.snapshots;
    summary.cfdPoints += proj.cfd;
    summary.throughputPoints += proj.throughput;
  }

  const ws = await step('workspace', () => snapshotWorkspaceMetrics(capturedAt));
  if (ws) {
    summary.workspaceSnapshots = ws.snapshots;
    summary.throughputPoints += ws.throughput;
  }

  summary.burndownPoints = (await step('burndown', () => snapshotBurndown(capturedAt))) || 0;
  summary.velocityPoints = (await step('velocity', () => snapshotVelocity(capturedAt))) || 0;

  Logger.info(summary, 'daily snapshot run complete');
  return summary;
};

module.exports = {
  runDailySnapshots,
  snapshotEmployeeMetrics,
  snapshotProjectMetrics,
  snapshotWorkspaceMetrics,
  snapshotBurndown,
  snapshotVelocity,
};
