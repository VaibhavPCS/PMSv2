const { CatchAsync, APIError } = require('@pms/error-handler');
const Query = require('../services/query.service');
const UserAnalytics = require('../services/user-analytics.service');

// ============================================================================
// READ-ONLY analytics controllers for dashboards.
//
// These handlers ONLY read pre-aggregated tables via the query service. No
// aggregation, counting, or metric math ever happens here or downstream on the
// request path — Kafka consumers maintain current-state tables and a cron
// scheduler appends time-series snapshots. Handlers stay thin: validate input,
// enforce workspace scope, delegate the read, shape the response.
// ============================================================================

const ok = (res, data) => res.status(200).json({ status: 'success', data });

// Every endpoint is workspace-scoped. The workspace id comes either from the
// route param (/workspace/:workspaceId) or the required `workspaceId` query
// string. Missing scope is a 400 — we never read across all workspaces.
const requireWorkspaceId = (req) => {
  const workspaceId = req.params.workspaceId || req.query.workspaceId;
  if (!workspaceId || !String(workspaceId).trim()) {
    throw new APIError(400, 'workspaceId is required.');
  }
  return String(workspaceId);
};

// ─── Burndown (sprint time-series) ────────────────────────────────────────────
const GetBurndown = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const { sprintId, from, to } = req.query;
  const rows = await Query.GetBurndown({ workspaceId, sprintId, from, to });
  return ok(res, rows);
});

// ─── Velocity (per closed sprint) ─────────────────────────────────────────────
const GetVelocity = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const { projectId, from, to } = req.query;
  const rows = await Query.GetVelocity({ workspaceId, projectId, from, to });
  return ok(res, rows);
});

// ─── Cumulative Flow Diagram ──────────────────────────────────────────────────
const GetCfd = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const { projectId, from, to } = req.query;
  const rows = await Query.GetCfd({ workspaceId, projectId, from, to });
  return ok(res, rows);
});

// ─── Cycle / lead time (per-task lifecycle facts) ─────────────────────────────
const GetCycleTime = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const { projectId, assigneeId, limit } = req.query;
  const rows = await Query.GetCycleTime({ workspaceId, projectId, assigneeId, limit });
  return ok(res, rows);
});

// ─── Throughput / created-vs-resolved ─────────────────────────────────────────
const GetThroughput = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const { projectId, period, from, to } = req.query;
  const rows = await Query.GetThroughput({ workspaceId, projectId, period, from, to });
  return ok(res, rows);
});

// ─── Workload (current-state per-employee open work) ──────────────────────────
const GetWorkload = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const rows = await Query.GetWorkload(workspaceId, req.query.limit);
  return ok(res, rows);
});

// ─── Leaderboard (pre-ranked) ─────────────────────────────────────────────────
const GetLeaderboard = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const rows = await Query.GetLeaderboard(workspaceId, req.query.limit);
  return ok(res, rows);
});

// ─── Single employee metrics ──────────────────────────────────────────────────
const GetEmployeeMetric = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const row = await Query.GetEmployeeMetric(req.params.userId, workspaceId);
  if (!row) throw new APIError(404, 'Employee metrics not found.');
  return ok(res, row);
});

// ─── Single project metrics ───────────────────────────────────────────────────
const GetProjectMetric = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const row = await Query.GetProjectMetric(req.params.projectId, workspaceId);
  if (!row) throw new APIError(404, 'Project metrics not found.');
  return ok(res, row);
});

// ─── Single workspace metrics ─────────────────────────────────────────────────
const GetWorkspaceMetric = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const row = await Query.GetWorkspaceMetric(workspaceId);
  if (!row) throw new APIError(404, 'Workspace metrics not found.');
  return ok(res, row);
});

// ─── Dashboard overview (fan-out of pre-aggregated reads) ─────────────────────
const GetOverview = CatchAsync(async (req, res) => {
  const workspaceId = requireWorkspaceId(req);
  const data = await Query.GetOverview(workspaceId, req.query.leaderboardLimit);
  if (!data.workspace) throw new APIError(404, 'Workspace metrics not found.');
  return ok(res, data);
});

// ============================================================================
// USER (PERSONAL) ANALYTICS — list users, per-user productivity report, and
// CSV/PDF exports for the Personal Stats + User Export screens. Ported from the
// OLD monolith (listUsers / getUserProductivitySnapshotRange /
// exportUserProductivity[/pdf]) and adapted to the new Prisma analytics tables
// + READ-ONLY pms_task source. The ported frontend reads `res.data` DIRECTLY as
// the report (res.data.user, res.data.summary, res.data.source) and the user
// list as `res.data?.users`, so these handlers ALSO spread the payload at the
// top level in addition to the standard { status, data } envelope.
// ============================================================================

// The workspace context arrives as the `workspace-id` header (frontend axios
// always attaches it) or as a `workspaceId` query param. Personal screens still
// work without it (user lookups fall back to all-workspace scope).
const workspaceScope = (req) =>
  (req.headers['workspace-id'] || req.query.workspaceId || '').toString().trim() || undefined;

// CSV cell escaper (RFC-4180 quoting).
const csvEsc = (s) => `"${String(s === null || s === undefined ? '' : s).replace(/"/g, '""')}"`;

// ─── GET /users — workspace users for the export picker ───────────────────────
// Frontend reads res.data?.users || res.data, so we expose `users` at top level
// (and inside data) while keeping the { status, data } envelope.
const ListUsers = CatchAsync(async (req, res) => {
  const users = await UserAnalytics.ListUsers(workspaceScope(req));
  return res.status(200).json({ status: 'success', users, data: { users } });
});

// ─── GET /snapshot/user/:userId/range — productivity report for a range ───────
// Frontend reads res.data directly (res.data.user / .summary / .source), so we
// spread the report at top level and also nest it under data for the envelope.
const GetUserSnapshotRange = CatchAsync(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  if (!userId) throw new APIError(400, 'userId is required.');
  if (!startDate || !endDate) throw new APIError(400, 'Both startDate and endDate are required.');

  const { report, source } = await UserAnalytics.GetUserProductivityReport(
    userId, startDate, endDate, workspaceScope(req),
  );
  const body = { ...report, source: 'snapshot_range', computedFrom: source, snapshotCount: 0 };
  return res.status(200).json({ status: 'success', ...body, data: body });
});

// ─── GET /export/user/:userId — CSV download ──────────────────────────────────
const ExportUserCsv = CatchAsync(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  if (!userId || !startDate || !endDate) {
    throw new APIError(400, 'Missing required parameters: userId, startDate, endDate.');
  }

  const { report } = await UserAnalytics.GetUserProductivityReport(
    userId, startDate, endDate, workspaceScope(req),
  );

  let csv = '﻿';
  csv += 'USER PRODUCTIVITY REPORT\n';
  csv += `User,${csvEsc(report.user.name)}\n`;
  csv += `Email,${csvEsc(report.user.email)}\n`;
  csv += `Role,${csvEsc(report.user.role)}\n`;
  csv += `Period,${csvEsc(report.dateRange.displayText)}\n`;
  csv += `Total Days,${report.dateRange.days}\n\n`;

  csv += 'SUMMARY STATISTICS\n';
  csv += 'Metric,Count,Percentage\n';
  csv += `Total Tasks,${report.summary.totalTasks},100%\n`;
  csv += `Completed,${report.summary.completedTasks},${report.summary.completionRate}%\n`;
  csv += `In Progress,${report.summary.openTasks},${report.summary.totalTasks > 0 ? Math.round((report.summary.openTasks / report.summary.totalTasks) * 100) : 0}%\n`;
  csv += `Overdue,${report.summary.overdueTasks},${report.summary.totalTasks > 0 ? Math.round((report.summary.overdueTasks / report.summary.totalTasks) * 100) : 0}%\n\n`;

  csv += 'COMPLETED TASKS\n';
  csv += 'Task,Project,Completed Date,Priority,Days to Complete\n';
  report.completedTasks.forEach((t) => {
    csv += `${csvEsc(t.title)},${csvEsc(t.project)},${csvEsc(t.completedAt)},${csvEsc(t.priority)},${t.daysToComplete}\n`;
  });
  csv += '\n';

  csv += 'DUE IN RANGE\n';
  csv += 'Task,Project,Due Date,Priority,Status,Days Until Due\n';
  report.openTasks.forEach((t) => {
    csv += `${csvEsc(t.title)},${csvEsc(t.project)},${csvEsc(t.dueDate)},${csvEsc(t.priority)},${csvEsc(t.status)},${t.daysUntilDue}\n`;
  });
  csv += '\n';

  csv += 'WEEKLY BREAKDOWN\n';
  csv += 'Week,Date Range,Completed,Percentage,On-Time\n';
  report.weekly.forEach((w) => {
    csv += `Week ${w.week},${csvEsc(`${w.startDate} - ${w.endDate}`)},${w.completed},${w.percentage}%,${w.onTime}\n`;
  });
  csv += '\n';

  csv += 'PERFORMANCE METRICS\n';
  csv += 'Metric,Value\n';
  csv += `Productivity Score,${report.performanceScore.overallScore}/100\n`;
  csv += `Grade,${csvEsc(report.performanceScore.grade)}\n`;
  csv += `Status,${csvEsc(report.performanceScore.status)}\n`;
  csv += `On-Time Rate,${report.timing.onTimeRate}%\n`;
  csv += `Avg Time to Complete,${report.timing.avgTimeToComplete} days\n`;
  csv += `Tasks Per Day,${report.timing.tasksPerDay}\n`;
  csv += `Peak Day,${csvEsc(report.peakDay)}\n`;
  csv += `Peak Day Count,${report.peakDayCount}\n\n`;

  csv += 'PROJECT BREAKDOWN\n';
  csv += 'Project,Assigned,Completed,Completion Rate,On-Time Rate,Contribution\n';
  report.projects.forEach((p) => {
    csv += `${csvEsc(p.projectName)},${p.assigned},${p.completed},${p.completionRate}%,${p.onTimeRate}%,${p.contribution}%\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=user-${userId}-productivity.csv`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  return res.status(200).send(csv);
});

// ─── GET /export/user/:userId/pdf — PDF download ──────────────────────────────
// No PDF library is a dependency of this service, so we emit a minimal, valid
// PDF 1.4 document by hand (pure string/Buffer — zero new deps), mirroring the
// OLD monolith's hand-rolled PDF export.
const ExportUserPdf = CatchAsync(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  if (!userId || !startDate || !endDate) {
    throw new APIError(400, 'Missing required parameters: userId, startDate, endDate.');
  }

  const { report } = await UserAnalytics.GetUserProductivityReport(
    userId, startDate, endDate, workspaceScope(req),
  );

  const rows = [];
  rows.push(`User Productivity [${report.user.name || userId}]`);
  rows.push(`Range: ${report.dateRange.displayText}`);
  rows.push(`Total Tasks: ${report.summary.totalTasks}`);
  rows.push(`Completed: ${report.summary.completedTasks}`);
  rows.push(`Open: ${report.summary.openTasks}`);
  rows.push(`Overdue: ${report.summary.overdueTasks}`);
  rows.push(`Completion Rate: ${report.summary.completionRate}%`);
  rows.push('');
  rows.push('Due In Range:');
  report.openTasks.forEach((t) => rows.push(`${t.title} | ${t.project} | ${t.dueDate} | ${t.priority} | ${t.status}`));
  rows.push('');
  rows.push('Completed In Range:');
  report.completedTasks.forEach((t) => rows.push(`${t.title} | ${t.project} | ${t.completedAt} | ${t.priority}`));

  const escPdf = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const pageWidth = 595;
  const pageHeight = 842;
  let content = `BT /F1 12 Tf 14 TL 50 800 Td (${escPdf(rows[0])}) Tj`;
  for (let i = 1; i < rows.length; i += 1) content += ` T* (${escPdf(rows[i])}) Tj`;
  content += ' ET';
  const stream = Buffer.from(content, 'utf8');

  const objs = [];
  objs.push({ id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' });
  objs.push({ id: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' });
  objs.push({ id: 5, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
  objs.push({ id: 3, body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>` });
  objs.push({ id: 4, body: `<< /Length ${stream.length} >>\nstream\n${content}\nendstream` });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const o of objs) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${o.id} 0 obj\n${o.body}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=user-${userId}-productivity.pdf`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  return res.status(200).send(Buffer.from(pdf, 'utf8'));
});

module.exports = {
  GetBurndown,
  GetVelocity,
  GetCfd,
  GetCycleTime,
  GetThroughput,
  GetWorkload,
  GetLeaderboard,
  GetEmployeeMetric,
  GetProjectMetric,
  GetWorkspaceMetric,
  GetOverview,
  ListUsers,
  GetUserSnapshotRange,
  ExportUserCsv,
  ExportUserPdf,
};
