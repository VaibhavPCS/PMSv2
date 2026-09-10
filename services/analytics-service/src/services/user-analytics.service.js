const prisma = require('../config/prisma');
const { GetTaskSource } = require('../config/task-source');
const { isDoneStatus, normalizeStatus, round2, pct } = require('./metric-formulas');

// ============================================================================
// USER (PERSONAL) ANALYTICS SERVICE
//
// Builds the per-user "productivity report" consumed by the Personal Stats and
// User Export screens. Ported/adapted from the OLD monolith
// (PMS_BACKEND productivity-report.service.js + analytics-controller.js
// listUsers / getUserProductivitySnapshotRange / exportUserProductivity).
//
// The analytics DB (pms_analytics) only stores pre-aggregated, name-less rows
// keyed by SuperTokens userId. The richer per-task report the UI renders needs
// task-level rows with dates, so we read them READ-ONLY from the pms_task DB via
// GetTaskSource() when it is configured. When it is NOT configured we degrade
// gracefully to the current-state EmployeeMetric row so the screens still work.
//
// No writes ever happen here. Heavy aggregation is request-path here only
// because the old monolith computed it on the request path too; the response is
// shaped to byte-match the OLD ReportData contract the ported frontend reads.
// ============================================================================

const TASK_TABLE = '"Task"';
const ASSIGNEE_TABLE = '"TaskAssignee"';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const daysBetween = (a, b) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
};

// ── User listing ────────────────────────────────────────────────────────────
// Returns [{ userId, userName }]. Names do not live in the analytics DB; the
// best available source is the workspace-scoped EmployeeMetric rows. When a
// workspaceId is supplied we scope to it, otherwise we return every distinct
// user the analytics DB knows about. userName falls back to the userId because
// the analytics DB carries no display name.
const ListUsers = async (workspaceId) => {
  const where = workspaceId ? { workspaceId } : {};
  const rows = await prisma.employeeMetric.findMany({
    where,
    select: { userId: true },
    distinct: ['userId'],
    orderBy: { userId: 'asc' },
  });
  return rows.map((r) => ({ userId: r.userId, userName: r.userId }));
};

// ── Read a user's tasks from the pms_task source DB (READ-ONLY) ───────────────
// Returns null when the source DB is not configured so callers can fall back.
const readUserTasks = async (userId) => {
  const taskSource = GetTaskSource();
  if (!taskSource) return null;

  // assignees are a join table; pull every active task assigned to the user
  // along with the dates the report needs. completedAt is derived from the most
  // recent "completed/approved" history row (TaskHistory.toValue), since Task
  // has no completedAt column in the new schema.
  const rows = await taskSource.$queryRawUnsafe(
    `SELECT t.id, t.title, t.status, t.priority, t."projectId",
            t."dueDate", t."startDate", t."createdAt",
            (SELECT MAX(h."createdAt") FROM "TaskHistory" h
               WHERE h."taskId" = t.id
                 AND lower(h."toValue") IN ('done','completed','approved')) AS "completedAt"
       FROM ${TASK_TABLE} t
       JOIN ${ASSIGNEE_TABLE} a ON a."taskId" = t.id
      WHERE a."userId" = $1 AND t."isActive" = true`,
    userId,
  );
  return rows;
};

// ── Build the OLD-shape ReportData from a task list ──────────────────────────
const buildReportFromTasks = (userId, tasks, start, end) => {
  const rangeDays = daysBetween(start, end) + 1;
  const inRange = (d) => d && new Date(d) >= start && new Date(d) <= end;

  // Completed-in-range: completed timestamp falls inside the window.
  const completed = tasks.filter((t) => isDoneStatus(t.status) && inRange(t.completedAt));
  // Open-in-range: not done, due inside the window.
  const open = tasks.filter((t) => !isDoneStatus(t.status) && inRange(t.dueDate));

  const now = new Date();
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  const totalTasks = completed.length + open.length;
  const completionRate = pct(completed.length, totalTasks);

  const durations = completed
    .filter((t) => t.createdAt && t.completedAt)
    .map((t) => daysBetween(t.createdAt, t.completedAt));
  const avgTimeToComplete = durations.length
    ? round2(durations.reduce((s, n) => s + n, 0) / durations.length)
    : 0;
  const fastest = durations.length ? Math.min(...durations) : null;
  const slowest = durations.length ? Math.max(...durations) : null;
  const onTime = completed.filter(
    (t) => t.dueDate && t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate),
  ).length;
  const onTimeRate = pct(onTime, completed.length);
  const tasksPerDay = round2(completed.length / (rangeDays || 1));

  // Weekly breakdown over the range.
  const weekly = [];
  let weekIdx = 0;
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
    weekIdx += 1;
    const wStart = new Date(cursor);
    const wEnd = new Date(cursor);
    wEnd.setDate(wEnd.getDate() + 6);
    if (wEnd > end) wEnd.setTime(end.getTime());
    const wCompleted = completed.filter(
      (t) => t.completedAt && new Date(t.completedAt) >= wStart && new Date(t.completedAt) <= wEnd,
    );
    const wOnTime = wCompleted.filter(
      (t) => t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate),
    ).length;
    weekly.push({
      week: weekIdx,
      startDate: fmtDate(wStart),
      endDate: fmtDate(wEnd),
      completed: wCompleted.length,
      percentage: pct(wCompleted.length, completed.length),
      onTime: wOnTime,
    });
  }

  // Per-day completion histogram -> peak day.
  const byDay = {};
  completed.forEach((t) => {
    const key = fmtDate(t.completedAt);
    if (key) byDay[key] = (byDay[key] || 0) + 1;
  });
  let peakDay = '';
  let peakDayCount = 0;
  Object.entries(byDay).forEach(([k, v]) => {
    if (v > peakDayCount) {
      peakDay = k;
      peakDayCount = v;
    }
  });

  // Project breakdown.
  const projMap = {};
  tasks.forEach((t) => {
    const pid = t.projectId || 'unknown';
    if (!projMap[pid]) projMap[pid] = { assigned: 0, completed: 0, onTime: 0 };
    projMap[pid].assigned += 1;
    if (isDoneStatus(t.status) && inRange(t.completedAt)) {
      projMap[pid].completed += 1;
      if (t.dueDate && t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate)) {
        projMap[pid].onTime += 1;
      }
    }
  });
  const projects = Object.entries(projMap).map(([pid, p]) => ({
    projectName: pid,
    assigned: p.assigned,
    completed: p.completed,
    completionRate: pct(p.completed, p.assigned),
    onTimeRate: pct(p.onTime, p.completed),
    contribution: pct(p.completed, completed.length),
  }));

  // Composite performance score (mirrors OLD component weighting).
  const completionScore = completionRate;
  const onTimeScore = onTimeRate;
  const projectCount = Object.keys(projMap).length;
  const diversityScore = projectCount > 0 ? 100 : 0;
  const consistencyScore = peakDayCount > 0 ? pct(completed.length, peakDayCount * rangeDays) : 0;
  const overallScore = round2(
    completionScore * 0.4 + onTimeScore * 0.3 + diversityScore * 0.15 + consistencyScore * 0.15,
  );
  const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F';
  const status = overallScore >= 75 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Improvement';

  return {
    user: { id: userId, name: userId, email: '', role: '', profilePicture: null },
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
      days: rangeDays,
      displayText: `${fmtDate(start)} - ${fmtDate(end)}`,
    },
    summary: {
      totalTasks,
      completedTasks: completed.length,
      openTasks: open.length,
      overdueTasks: overdue,
      completionRate,
    },
    timing: {
      avgTimeToComplete,
      fastestCompletion: fastest === null ? null : String(fastest),
      slowestCompletion: slowest === null ? null : String(slowest),
      onTimeRate,
      tasksPerDay,
    },
    weekly,
    performanceScore: {
      overallScore,
      grade,
      status,
      components: {
        completion: completionScore,
        onTime: onTimeScore,
        diversity: diversityScore,
        consistency: consistencyScore,
      },
    },
    completedTasks: completed.map((t) => ({
      id: t.id,
      title: t.title,
      project: t.projectId || '',
      completedAt: fmtDate(t.completedAt),
      priority: normalizeStatus(t.priority) || t.priority || '',
      daysToComplete: t.createdAt && t.completedAt ? daysBetween(t.createdAt, t.completedAt) : 0,
    })),
    openTasks: open.map((t) => ({
      id: t.id,
      title: t.title,
      project: t.projectId || '',
      dueDate: fmtDate(t.dueDate),
      priority: normalizeStatus(t.priority) || t.priority || '',
      status: normalizeStatus(t.status) || t.status || '',
      daysUntilDue: t.dueDate ? daysBetween(now, t.dueDate) : 0,
      isOverdue: !!(t.dueDate && new Date(t.dueDate) < now),
    })),
    projects,
    comparison: [],
    peakDay,
    peakDayCount,
    consistency: consistencyScore,
    productivityTrend: 'stable',
    efficiencyMetrics: {
      avgDaysToComplete: String(avgTimeToComplete),
      fastestCompletion: fastest === null ? 'N/A' : String(fastest),
      slowestCompletion: slowest === null ? 'N/A' : String(slowest),
      peakDay,
      peakDayCount,
      tasksPerDay: String(tasksPerDay),
      productivityTrend: 'stable',
    },
  };
};

// ── Degraded report from the current-state EmployeeMetric row ─────────────────
// Used when pms_task is not configured. Produces the same ReportData shape but
// without per-task lists (the screens render zero-rows gracefully).
const buildReportFromMetric = (userId, metric, start, end) => {
  const rangeDays = daysBetween(start, end) + 1;
  const totalTasks = metric ? metric.totalTasks : 0;
  const completedTasks = metric ? metric.completedCount : 0;
  const openTasks = metric ? metric.todoCount + metric.inProgressCount : 0;
  const overdueTasks = metric ? metric.overdueCount : 0;
  const completionRate = pct(completedTasks, totalTasks);
  const onTimeRate = metric ? round2(metric.onTimeCompletionRate) : 0;
  const overallScore = metric ? round2(metric.productivityScore) : 0;
  const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F';
  const status = overallScore >= 75 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Improvement';

  return {
    user: { id: userId, name: userId, email: '', role: '', profilePicture: null },
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
      days: rangeDays,
      displayText: `${fmtDate(start)} - ${fmtDate(end)}`,
    },
    summary: { totalTasks, completedTasks, openTasks, overdueTasks, completionRate },
    timing: {
      avgTimeToComplete: metric ? round2(metric.avgTimeToCompleteMs / (1000 * 60 * 60 * 24)) : 0,
      fastestCompletion: null,
      slowestCompletion: null,
      onTimeRate,
      tasksPerDay: round2(completedTasks / (rangeDays || 1)),
    },
    weekly: [],
    performanceScore: {
      overallScore,
      grade,
      status,
      components: { completion: completionRate, onTime: onTimeRate, diversity: 0, consistency: 0 },
    },
    completedTasks: [],
    openTasks: [],
    projects: [],
    comparison: [],
    peakDay: '',
    peakDayCount: 0,
    consistency: 0,
    productivityTrend: 'stable',
    efficiencyMetrics: {
      avgDaysToComplete: '0',
      fastestCompletion: 'N/A',
      slowestCompletion: 'N/A',
      peakDay: '',
      peakDayCount: 0,
      tasksPerDay: '0',
      productivityTrend: 'stable',
    },
  };
};

// ── Public: build the productivity report for a user over a date range ───────
const GetUserProductivityReport = async (userId, startDate, endDate, workspaceId) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const tasks = await readUserTasks(userId);
  if (tasks) {
    return { report: buildReportFromTasks(userId, tasks, start, end), source: 'task_source' };
  }

  // Fall back to current-state metric (best available without task source).
  let metric = null;
  if (workspaceId) {
    metric = await prisma.employeeMetric.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
  }
  if (!metric) {
    metric = await prisma.employeeMetric.findFirst({ where: { userId } });
  }
  return { report: buildReportFromMetric(userId, metric, start, end), source: 'metric' };
};

module.exports = {
  ListUsers,
  GetUserProductivityReport,
  fmtDate,
};
