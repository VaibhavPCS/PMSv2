'use strict';
/**
 * analytics-service one-time BACKFILL
 * ---------------------------------------------------------------------------
 * Seeds pms_analytics from already-migrated source DBs so dashboards have data
 * before the event-driven runtime has processed anything.
 *
 *   READ-ONLY sources (one PrismaClient per db, DATABASE_URL composed from
 *   DB_BASE exactly like scripts/migrate/lib.js):
 *     pms_task      -> Task, TaskHistory, Sprint
 *     pms_project   -> Project, ProjectMember
 *     pms_auth      -> users
 *     pms_workspace -> WorkspaceMember (for membership / leaders)
 *
 *   WRITES (analytics prisma client -> pms_analytics):
 *     current-state : EmployeeMetric, LeaderboardEntry, ProjectMetric,
 *                     WorkspaceMetric, TaskLifecycleStat
 *     time-series   : BurndownPoint, VelocityPoint, CfdPoint, ThroughputPoint,
 *                     MetricSnapshot
 *
 * Architecture note: runtime stays event-driven (Kafka consumers maintain
 * current-state; cron appends snapshots). This script is the ONE-TIME seed and
 * is fully IDEMPOTENT — every target table is deleteMany()'d then re-inserted.
 *
 * Metric FORMULAS are ported from PMS_Analytics/utils/metrics-calculator.js and
 * the *-metrics.service.js files, adapted to the NEW Postgres shapes:
 *   - status enum values (completed/pending/in_progress/in_review/on_hold/...)
 *   - TaskHistory rows: { action, fromValue, toValue, createdAt } (no eventType)
 *   - assignees in a join table (TaskAssignee), times derived from history
 *
 * Durations are stored in MILLISECONDS (schema uses *Ms fields).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { TASK_STATUS } = require('@pms/constants');

const ROOT = path.resolve(__dirname, '../../..');

// ---- DB url + client helpers (mirror scripts/migrate/lib.js) --------------
function dbUrl(name) {
  const base = (process.env.DB_BASE || 'postgresql://pms:pms_secret@localhost:5435').replace(/\/+$/, '');
  return `${base}/${name}?schema=public`;
}
function sourceClient(svc, db) {
  const { PrismaClient } = require(path.join(ROOT, 'services', svc, 'generated/prisma-client'));
  return new PrismaClient({ datasources: { db: { url: dbUrl(db) } } });
}
function analyticsClient() {
  const { PrismaClient } = require(path.join(ROOT, 'services', 'analytics-service', 'generated/prisma-client'));
  const name = (process.env.DB_NAME && process.env.DB_NAME.trim()) || 'pms_analytics';
  return new PrismaClient({ datasources: { db: { url: dbUrl(name) } } });
}

// ---- tiny stat helpers -----------------------------------------------------
const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;
const r2 = (n) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const pct = (num, den) => (den > 0 ? r2((num / den) * 100) : 0);
const avg = (arr) => (arr.length ? r2(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const DONE = new Set([TASK_STATUS.COMPLETED, TASK_STATUS.APPROVED]); // "finished" for completion math
const OVERDUE_EXEMPT = new Set([TASK_STATUS.COMPLETED, TASK_STATUS.APPROVED, TASK_STATUS.ON_HOLD]);
const APPROVAL_PENDING = new Set([TASK_STATUS.COMPLETED, TASK_STATUS.IN_REVIEW]);

// Bucket a task's status into the distribution keys used by the dashboards.
function distKey(status) {
  switch (status) {
    case TASK_STATUS.PENDING: return 'todo';
    case TASK_STATUS.IN_PROGRESS: return 'inProgress';
    case TASK_STATUS.IN_REVIEW: return 'inReview';
    case TASK_STATUS.COMPLETED:
    case TASK_STATUS.APPROVED: return 'done';
    case TASK_STATUS.ON_HOLD: return 'onHold';
    case TASK_STATUS.REJECTED: return 'rejected';
    case TASK_STATUS.OVERDUE: return 'overdue';
    case TASK_STATUS.FLAGGED: return 'flagged';
    default: return status || 'todo';
  }
}

/**
 * Derive lifecycle timestamps + event facts for a single task from its
 * history rows. There are no completedAt/startedAt columns in the new Task
 * model, so everything is reconstructed from TaskHistory.
 */
function deriveLifecycle(task, hist) {
  const events = hist.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const createdAt = task.createdAt ? new Date(task.createdAt) : null;

  let startedAt = null;
  let completedAt = null;
  let approvedAt = null;
  let lastSubmitAt = null; // entry into a review/approval-eligible state
  let reviewMs = 0;
  let rejectionCount = 0;
  let approvalAttempts = 0;
  let reassignments = 0;

  for (const e of events) {
    const t = new Date(e.createdAt);
    const to = e.toValue;
    if (e.action === 'status_changed') {
      if (to === TASK_STATUS.IN_PROGRESS && !startedAt) startedAt = t;
      if (to === TASK_STATUS.COMPLETED) completedAt = t;
      if (to === TASK_STATUS.COMPLETED || to === TASK_STATUS.IN_REVIEW) { lastSubmitAt = t; approvalAttempts += 1; }
    } else if (e.action === 'in_review') {
      lastSubmitAt = t; approvalAttempts += 1;
    } else if (e.action === 'approved') {
      approvedAt = t;
      if (lastSubmitAt) { reviewMs += t - lastSubmitAt; lastSubmitAt = null; }
    } else if (e.action === 'rejected') {
      rejectionCount += 1;
      if (lastSubmitAt) { reviewMs += t - lastSubmitAt; lastSubmitAt = null; }
    } else if (e.action === 'reassigned') {
      reassignments += 1;
    }
  }

  // Completion fallback: status is terminal but no explicit status_changed row.
  if (!completedAt && DONE.has(task.status)) completedAt = approvedAt || (task.updatedAt ? new Date(task.updatedAt) : null);
  if (!approvedAt && task.status === TASK_STATUS.APPROVED) approvedAt = completedAt;

  const leadMs = createdAt && completedAt ? Math.max(0, completedAt - createdAt) : 0;
  const cycleMs = startedAt && completedAt ? Math.max(0, completedAt - startedAt) : 0;
  const timeToStartMs = createdAt && startedAt ? Math.max(0, startedAt - createdAt) : 0;

  // rejectionCount is also tracked on Task.cycleCount in the new model — take the max.
  rejectionCount = Math.max(rejectionCount, task.cycleCount || 0);
  approvalAttempts = Math.max(approvalAttempts, approvedAt ? 1 : 0);

  const isOverdue = task.dueDate && !OVERDUE_EXEMPT.has(task.status) && new Date(task.dueDate) < new Date();
  const onTime = completedAt && task.dueDate ? completedAt <= new Date(task.dueDate) : false;
  const isFirstTimeRight = rejectionCount === 0 && DONE.has(task.status) && approvalAttempts <= 1;

  return {
    createdAt, startedAt, completedAt, approvedAt,
    leadMs, cycleMs, timeToStartMs, reviewMs,
    rejectionCount, approvalAttempts, reassignments,
    isOverdue, onTime, isFirstTimeRight,
    isDone: DONE.has(task.status),
  };
}

function productivityScore({ approvalRate, onTimeCompletionRate, completedCount, avgRejectionsPerTask }) {
  const quality = 100 - (avgRejectionsPerTask || 0) * 10;
  const score = approvalRate * 0.4 + onTimeCompletionRate * 0.3 + (completedCount || 0) * 0.2 + quality * 0.1;
  return Math.max(0, Math.min(100, r2(score)));
}

async function main() {
  const startedTs = Date.now();
  const taskDb = sourceClient('task-service', 'pms_task');
  const projectDb = sourceClient('project-service', 'pms_project');
  const authDb = sourceClient('auth-service', 'pms_auth');
  const workspaceDb = sourceClient('workspace-service', 'pms_workspace');
  const adb = analyticsClient();

  const counts = {};
  try {
    // ---------------------------------------------------------------- LOAD
    const [tasks, history, sprints, projects, projectMembers, users, wsMembers] = await Promise.all([
      taskDb.task.findMany({ include: { assignees: true } }),
      taskDb.taskHistory.findMany(),
      taskDb.sprint.findMany(),
      projectDb.project.findMany(),
      projectDb.projectMember.findMany(),
      authDb.user.findMany(),
      workspaceDb.workspaceMember.findMany(),
    ]);

    // Index history by task.
    const histByTask = new Map();
    for (const h of history) {
      if (!histByTask.has(h.taskId)) histByTask.set(h.taskId, []);
      histByTask.get(h.taskId).push(h);
    }

    // Pre-compute lifecycle facts for every task once.
    const lc = new Map();
    for (const t of tasks) lc.set(t.id, deriveLifecycle(t, histByTask.get(t.id) || []));

    const projById = new Map(projects.map((p) => [p.id, p]));

    // ========================================================= TASK LIFECYCLE
    const lifecycleRows = tasks.map((t) => {
      const f = lc.get(t.id);
      return {
        taskId: t.id,
        projectId: t.projectId,
        workspaceId: t.workspaceId,
        assigneeId: t.assignees[0]?.userId || null,
        totalDurationMs: r2(f.leadMs),
        workingDurationMs: r2(f.cycleMs),
        reviewDurationMs: r2(f.reviewMs),
        cycleTimeMs: r2(f.cycleMs),
        leadTimeMs: r2(f.leadMs),
        rejectionCount: f.rejectionCount,
        approvalAttempts: f.approvalAttempts,
        reassignments: f.reassignments,
        isFirstTimeRight: f.isFirstTimeRight,
        status: t.status,
        priority: t.priority,
        createdAtSrc: f.createdAt,
        startedAtSrc: f.startedAt,
        completedAtSrc: f.completedAt,
      };
    });

    // ========================================================= EMPLOYEE METRICS
    // Group tasks by (userId, workspaceId) via the assignee join table.
    const empGroups = new Map(); // `${userId}::${wsId}` -> { userId, workspaceId, tasks:[] }
    for (const t of tasks) {
      for (const a of t.assignees) {
        const key = `${a.userId}::${t.workspaceId}`;
        if (!empGroups.has(key)) empGroups.set(key, { userId: a.userId, workspaceId: t.workspaceId, tasks: [] });
        empGroups.get(key).tasks.push(t);
      }
    }

    const employeeRows = [];
    for (const g of empGroups.values()) {
      const ts = g.tasks;
      const facts = ts.map((t) => lc.get(t.id));
      const doneFacts = facts.filter((f) => f.isDone);
      const completedCount = doneFacts.length;
      const todoCount = ts.filter((t) => t.status === TASK_STATUS.PENDING).length;
      const inProgressCount = ts.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
      const overdueCount = facts.filter((f) => f.isOverdue).length;
      const approvedCount = ts.filter((t) => t.status === TASK_STATUS.APPROVED).length;
      const rejectedCount = ts.filter((t) => t.status === TASK_STATUS.REJECTED).length;
      const pendingApprovalCount = ts.filter((t) => APPROVAL_PENDING.has(t.status)).length;
      const submissions = facts.reduce((s, f) => s + f.approvalAttempts, 0);
      const totalRejections = facts.reduce((s, f) => s + f.rejectionCount, 0);
      const reassignments = facts.reduce((s, f) => s + f.reassignments, 0);

      const approvalRate = pct(approvedCount, approvedCount + rejectedCount);
      const firstTimeApprovalRate = pct(approvedCount, submissions);
      const avgRejectionsPerTask = ts.length ? r2(totalRejections / ts.length) : 0;
      const reworkRate = pct(reassignments, ts.length);
      const onTimeCompletionRate = pct(doneFacts.filter((f) => f.onTime).length, doneFacts.length);

      const avgTimeToStartMs = avg(facts.filter((f) => f.timeToStartMs > 0).map((f) => f.timeToStartMs));
      const avgTimeToCompleteMs = avg(doneFacts.filter((f) => f.leadMs > 0).map((f) => f.leadMs));
      const avgTimeToApprovalMs = avg(facts.filter((f) => f.reviewMs > 0).map((f) => f.reviewMs));
      const totalActiveTimeMs = r2(facts.reduce((s, f) => s + (f.cycleMs || 0), 0));

      employeeRows.push({
        userId: g.userId,
        workspaceId: g.workspaceId,
        totalTasks: ts.length,
        completedCount, todoCount, inProgressCount, overdueCount,
        approvedCount, rejectedCount, pendingApprovalCount,
        approvalRate, firstTimeApprovalRate, avgRejectionsPerTask, reworkRate, onTimeCompletionRate,
        avgTimeToStartMs, avgTimeToCompleteMs, avgTimeToApprovalMs, totalActiveTimeMs,
        productivityScore: productivityScore({ approvalRate, onTimeCompletionRate, completedCount, avgRejectionsPerTask }),
      });
    }

    // ========================================================= LEADERBOARD
    // Per workspace, rank assignees by productivityScore desc.
    const lbByWs = new Map();
    for (const e of employeeRows) {
      if (!lbByWs.has(e.workspaceId)) lbByWs.set(e.workspaceId, []);
      lbByWs.get(e.workspaceId).push(e);
    }
    const leaderboardRows = [];
    for (const [wsId, entries] of lbByWs.entries()) {
      entries.sort((a, b) => b.productivityScore - a.productivityScore || b.completedCount - a.completedCount);
      entries.forEach((e, i) => {
        leaderboardRows.push({
          workspaceId: wsId,
          userId: e.userId,
          completedCount: e.completedCount,
          approvalRate: e.approvalRate,
          onTimeCompletionRate: e.onTimeCompletionRate,
          productivityScore: e.productivityScore,
          rank: i + 1,
        });
      });
    }

    // ========================================================= PROJECT METRICS
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * DAY_MS);
    const tasksByProject = new Map();
    for (const t of tasks) {
      if (!tasksByProject.has(t.projectId)) tasksByProject.set(t.projectId, []);
      tasksByProject.get(t.projectId).push(t);
    }

    const projectRows = [];
    for (const [projectId, ts] of tasksByProject.entries()) {
      const proj = projById.get(projectId);
      const workspaceId = proj ? proj.workspaceId : (ts[0] && ts[0].workspaceId) || '';
      const facts = ts.map((t) => lc.get(t.id));
      const statusDistribution = {};
      const priorityDistribution = {};
      for (const t of ts) {
        const k = distKey(t.status);
        statusDistribution[k] = (statusDistribution[k] || 0) + 1;
        priorityDistribution[t.priority] = (priorityDistribution[t.priority] || 0) + 1;
      }
      const doneFacts = facts.filter((f) => f.isDone);
      const completedCount = doneFacts.length;
      const inProgressCount = ts.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
      const todoCount = ts.filter((t) => t.status === TASK_STATUS.PENDING).length;
      const overdueCount = facts.filter((f) => f.isOverdue).length;
      const rejectedCount = ts.filter((t) => t.status === TASK_STATUS.REJECTED).length;
      const approvedCount = ts.filter((t) => t.status === TASK_STATUS.APPROVED).length;
      const pendingApprovalCount = ts.filter((t) => APPROVAL_PENDING.has(t.status)).length;
      const completedLast7Days = doneFacts.filter((f) => f.completedAt && f.completedAt >= sevenAgo).length;

      const approvalRate = pct(approvedCount, approvedCount + rejectedCount);
      const onTimeCompletionRate = pct(doneFacts.filter((f) => f.onTime).length, doneFacts.length);
      const avgCycleTimeMs = avg(doneFacts.filter((f) => f.cycleMs > 0).map((f) => f.cycleMs));
      const avgLeadTimeMs = avg(doneFacts.filter((f) => f.leadMs > 0).map((f) => f.leadMs));
      const completionPercent = pct(completedCount, ts.length);
      const healthScore = r2(completionPercent * 0.4 + onTimeCompletionRate * 0.4 + (100 - pct(overdueCount, ts.length)) * 0.2);

      projectRows.push({
        projectId, workspaceId,
        totalTasks: ts.length,
        completedCount, inProgressCount, todoCount, overdueCount, rejectedCount, pendingApprovalCount, completedLast7Days,
        statusDistribution, priorityDistribution,
        approvalRate, onTimeCompletionRate, avgCycleTimeMs, avgLeadTimeMs, completionPercent, healthScore,
      });
    }
    // Projects with zero tasks still get a (mostly empty) metric row.
    for (const p of projects) {
      if (!tasksByProject.has(p.id)) {
        projectRows.push({
          projectId: p.id, workspaceId: p.workspaceId,
          totalTasks: 0, completedCount: 0, inProgressCount: 0, todoCount: 0, overdueCount: 0,
          rejectedCount: 0, pendingApprovalCount: 0, completedLast7Days: 0,
          statusDistribution: {}, priorityDistribution: {},
          approvalRate: 0, onTimeCompletionRate: 0, avgCycleTimeMs: 0, avgLeadTimeMs: 0,
          completionPercent: 0, healthScore: 0,
        });
      }
    }

    // ========================================================= WORKSPACE METRICS
    // Membership counts come from workspace-service; everything else rolls up tasks.
    const wsMemberCount = new Map();
    for (const m of wsMembers) wsMemberCount.set(m.workspaceId, (wsMemberCount.get(m.workspaceId) || 0) + 1);
    const projByWs = new Map();
    for (const p of projects) {
      if (!projByWs.has(p.workspaceId)) projByWs.set(p.workspaceId, []);
      projByWs.get(p.workspaceId).push(p);
    }
    const tasksByWs = new Map();
    for (const t of tasks) {
      if (!tasksByWs.has(t.workspaceId)) tasksByWs.set(t.workspaceId, []);
      tasksByWs.get(t.workspaceId).push(t);
    }
    const activeSprintsByWs = new Map();
    for (const s of sprints) {
      if (s.status !== 'active' || s.isActive === false) continue;
      const proj = projById.get(s.projectId);
      if (!proj) continue;
      activeSprintsByWs.set(proj.workspaceId, (activeSprintsByWs.get(proj.workspaceId) || 0) + 1);
    }

    const wsIds = new Set([...wsMemberCount.keys(), ...projByWs.keys(), ...tasksByWs.keys()]);
    const workspaceRows = [];
    for (const wsId of wsIds) {
      const ts = tasksByWs.get(wsId) || [];
      const facts = ts.map((t) => lc.get(t.id));
      const statusDistribution = {};
      const priorityDistribution = {};
      for (const t of ts) {
        const k = distKey(t.status);
        statusDistribution[k] = (statusDistribution[k] || 0) + 1;
        priorityDistribution[t.priority] = (priorityDistribution[t.priority] || 0) + 1;
      }
      const doneFacts = facts.filter((f) => f.isDone);
      const approvedCount = ts.filter((t) => t.status === TASK_STATUS.APPROVED).length;
      const rejectedCount = ts.filter((t) => t.status === TASK_STATUS.REJECTED).length;

      workspaceRows.push({
        workspaceId: wsId,
        totalProjects: (projByWs.get(wsId) || []).length,
        totalMembers: wsMemberCount.get(wsId) || 0,
        totalTasks: ts.length,
        completedCount: doneFacts.length,
        overdueCount: facts.filter((f) => f.isOverdue).length,
        activeSprints: activeSprintsByWs.get(wsId) || 0,
        statusDistribution, priorityDistribution,
        approvalRate: pct(approvedCount, approvedCount + rejectedCount),
        onTimeCompletionRate: pct(doneFacts.filter((f) => f.onTime).length, doneFacts.length),
        avgCycleTimeMs: avg(doneFacts.filter((f) => f.cycleMs > 0).map((f) => f.cycleMs)),
        throughputLast7Days: doneFacts.filter((f) => f.completedAt && f.completedAt >= sevenAgo).length,
      });
    }

    // ========================================================= TIME-SERIES SEED
    const capturedAt = startOfDay(now);

    // --- Velocity (closed sprints) + Burndown (one seed point per sprint) -----
    const tasksBySprint = new Map();
    for (const t of tasks) {
      if (!t.sprintId) continue;
      if (!tasksBySprint.has(t.sprintId)) tasksBySprint.set(t.sprintId, []);
      tasksBySprint.get(t.sprintId).push(t);
    }
    const velocityRows = [];
    const burndownRows = [];
    for (const s of sprints) {
      const proj = projById.get(s.projectId);
      const workspaceId = proj ? proj.workspaceId : '';
      const sTasks = tasksBySprint.get(s.id) || [];
      const committedCount = sTasks.length;
      const completedCount = sTasks.filter((t) => lc.get(t.id).isDone).length;
      if (s.status === 'closed') {
        velocityRows.push({
          workspaceId, projectId: s.projectId, sprintId: s.id, entityId: s.id,
          committedCount, completedCount, velocity: r2(completedCount), sprintName: s.name,
          capturedAt: s.closedAt ? new Date(s.closedAt) : capturedAt,
        });
      }
      burndownRows.push({
        workspaceId, projectId: s.projectId, sprintId: s.id, entityId: s.id,
        remainingCount: committedCount - completedCount,
        completedCount,
        totalCount: committedCount,
        idealRemaining: r2(committedCount / 2),
        capturedAt,
      });
    }

    // --- CFD: one seed row per project (current cumulative status mix) ---------
    const cfdRows = projectRows.map((p) => {
      const d = p.statusDistribution || {};
      return {
        workspaceId: p.workspaceId, projectId: p.projectId, entityId: p.projectId,
        todoCount: d.todo || 0,
        inProgressCount: d.inProgress || 0,
        inReviewCount: d.inReview || 0,
        doneCount: d.done || 0,
        onHoldCount: d.onHold || 0,
        statusCounts: d,
        capturedAt,
      };
    });

    // --- Throughput: created vs resolved per project (lifetime seed) ----------
    const throughputRows = projectRows.map((p) => ({
      workspaceId: p.workspaceId, projectId: p.projectId, entityId: p.projectId,
      createdCount: p.totalTasks,
      resolvedCount: p.completedCount,
      overdueCount: p.overdueCount,
      avgCycleTimeMs: p.avgCycleTimeMs,
      avgLeadTimeMs: p.avgLeadTimeMs,
      period: 'daily',
      capturedAt,
    }));

    // --- MetricSnapshot: one point per current-state metric we just computed --
    const metricSnapshotRows = [];
    for (const e of employeeRows) {
      metricSnapshotRows.push({
        workspaceId: e.workspaceId, entityId: e.userId, entityType: 'employee',
        metricKey: 'productivityScore', value: e.productivityScore, payload: e, period: 'daily', capturedAt,
      });
    }
    for (const p of projectRows) {
      metricSnapshotRows.push({
        workspaceId: p.workspaceId, entityId: p.projectId, entityType: 'project',
        metricKey: 'completionPercent', value: p.completionPercent, payload: p, period: 'daily', capturedAt,
      });
    }
    for (const w of workspaceRows) {
      metricSnapshotRows.push({
        workspaceId: w.workspaceId, entityId: w.workspaceId, entityType: 'workspace',
        metricKey: 'completedCount', value: w.completedCount, payload: w, period: 'daily', capturedAt,
      });
    }

    // ----------------------------------------------------- WRITE (idempotent)
    const insertMany = async (model, rows) => {
      if (!rows.length) return 0;
      const res = await adb[model].createMany({ data: rows, skipDuplicates: true });
      return res.count;
    };

    // Wipe target tables first so the backfill is fully re-runnable.
    await adb.$transaction([
      adb.metricSnapshot.deleteMany({}),
      adb.throughputPoint.deleteMany({}),
      adb.cfdPoint.deleteMany({}),
      adb.velocityPoint.deleteMany({}),
      adb.burndownPoint.deleteMany({}),
      adb.taskLifecycleStat.deleteMany({}),
      adb.leaderboardEntry.deleteMany({}),
      adb.workspaceMetric.deleteMany({}),
      adb.projectMetric.deleteMany({}),
      adb.employeeMetric.deleteMany({}),
    ]);

    counts.employeeMetrics = await insertMany('employeeMetric', employeeRows);
    counts.projectMetrics = await insertMany('projectMetric', projectRows);
    counts.workspaceMetrics = await insertMany('workspaceMetric', workspaceRows);
    counts.leaderboardEntries = await insertMany('leaderboardEntry', leaderboardRows);
    counts.taskLifecycleStats = await insertMany('taskLifecycleStat', lifecycleRows);
    counts.burndownPoints = await insertMany('burndownPoint', burndownRows);
    counts.velocityPoints = await insertMany('velocityPoint', velocityRows);
    counts.cfdPoints = await insertMany('cfdPoint', cfdRows);
    counts.throughputPoints = await insertMany('throughputPoint', throughputRows);
    counts.metricSnapshots = await insertMany('metricSnapshot', metricSnapshotRows);

    counts._sources = {
      tasks: tasks.length, history: history.length, sprints: sprints.length,
      projects: projects.length, projectMembers: projectMembers.length,
      users: users.length, workspaceMembers: wsMembers.length,
    };
    counts._workspaces = wsIds.size;
    counts._durationMs = Date.now() - startedTs;

    console.log('[analytics-backfill] done:', JSON.stringify(counts, null, 2));
    return counts;
  } finally {
    await Promise.allSettled([
      taskDb.$disconnect(), projectDb.$disconnect(), authDb.$disconnect(),
      workspaceDb.$disconnect(), adb.$disconnect(),
    ]);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => { console.error('[analytics-backfill] FAILED:', err); process.exit(1); });
}

module.exports = { main };
