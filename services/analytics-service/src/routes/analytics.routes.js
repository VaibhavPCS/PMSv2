const Router = require('express').Router();
const { AuthenticateToken, RequireRole } = require('@pms/auth-middleware');
const { ROLES } = require('@pms/constants');
const C = require('../controllers/analytics.controller');

// Every dashboard endpoint is GET, authenticated, role-gated, and
// workspace-scoped. Aggregation happens off the request path (Kafka consumers +
// cron scheduler); these handlers only read pre-aggregated tables.
//
// All workspace members may read analytics, so the gate allows every role.
// Tighten per-endpoint here if leadership-only views are ever required.
const CanRead = RequireRole(...Object.values(ROLES));
const guard = [AuthenticateToken, CanRead];

/**
 * @openapi
 * /api/v1/analytics/burndown:
 *   get:
 *     tags: [Agile]
 *     summary: Burndown time-series (workspace-scoped, optional sprint)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: sprintId, schema: { type: string } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: Burndown points, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/TimeSeriesPoint' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/burndown', ...guard, C.GetBurndown);

/**
 * @openapi
 * /api/v1/analytics/velocity:
 *   get:
 *     tags: [Agile]
 *     summary: Velocity per closed sprint (workspace-scoped, optional project)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: projectId, schema: { type: string } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: Velocity points, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/TimeSeriesPoint' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/velocity', ...guard, C.GetVelocity);

/**
 * @openapi
 * /api/v1/analytics/cfd:
 *   get:
 *     tags: [Agile]
 *     summary: Cumulative Flow Diagram time-series (workspace-scoped, optional project)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: projectId, schema: { type: string } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: CFD points, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/TimeSeriesPoint' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/cfd', ...guard, C.GetCfd);

/**
 * @openapi
 * /api/v1/analytics/cycle-time:
 *   get:
 *     tags: [Agile]
 *     summary: Per-task cycle/lead time facts (workspace-scoped)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: projectId, schema: { type: string } }
 *       - { in: query, name: assigneeId, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 100, maximum: 100 } }
 *     responses:
 *       200: { description: Task lifecycle facts, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/TaskLifecycleStat' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/cycle-time', ...guard, C.GetCycleTime);

/**
 * @openapi
 * /api/v1/analytics/throughput:
 *   get:
 *     tags: [Agile]
 *     summary: Throughput / created-vs-resolved trend (workspace-scoped)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: projectId, schema: { type: string } }
 *       - { in: query, name: period, schema: { type: string, enum: [daily, weekly] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: Throughput points, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/TimeSeriesPoint' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/throughput', ...guard, C.GetThroughput);

/**
 * @openapi
 * /api/v1/analytics/workload:
 *   get:
 *     tags: [Workspace]
 *     summary: Current-state per-employee workload for a workspace
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 100, maximum: 100 } }
 *     responses:
 *       200: { description: Workload rows, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/EmployeeMetric' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/workload', ...guard, C.GetWorkload);

/**
 * @openapi
 * /api/v1/analytics/leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Ranked leaderboard for a workspace
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200: { description: Ranked entries, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/LeaderboardEntry' } } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/leaderboard', ...guard, C.GetLeaderboard);

/**
 * @openapi
 * /api/v1/analytics/overview:
 *   get:
 *     tags: [Workspace]
 *     summary: Dashboard overview (workspace rollup + top leaderboard + workload)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *       - { in: query, name: leaderboardLimit, schema: { type: integer, default: 5, maximum: 100 } }
 *     responses:
 *       200: { description: Overview payload, content: { application/json: { schema: { $ref: '#/components/schemas/Overview' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
Router.get('/overview', ...guard, C.GetOverview);

/**
 * @openapi
 * /api/v1/analytics/users:
 *   get:
 *     tags: [Employee]
 *     summary: List workspace users for the export picker
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: query, name: workspaceId, schema: { type: string } }
 *     responses:
 *       200: { description: "Users { status, users, data: { users } }" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// STATIC route — registered before the parameterised /employee, /project,
// /workspace and /snapshot routes so its literal segment is never captured.
Router.get('/users', ...guard, C.ListUsers);

/**
 * @openapi
 * /api/v1/analytics/snapshot/user/{userId}/range:
 *   get:
 *     tags: [Employee]
 *     summary: User productivity report for a date range
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *       - { in: query, name: startDate, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: endDate, required: true, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: "ReportData spread at top level + under data" }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/snapshot/user/:userId/range', ...guard, C.GetUserSnapshotRange);

/**
 * @openapi
 * /api/v1/analytics/export/user/{userId}/pdf:
 *   get:
 *     tags: [Employee]
 *     summary: Export user productivity (PDF download)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *       - { in: query, name: startDate, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: endDate, required: true, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: PDF file, content: { application/pdf: {} } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// More specific /pdf route is registered BEFORE the base /export/user/:userId.
Router.get('/export/user/:userId/pdf', ...guard, C.ExportUserPdf);

/**
 * @openapi
 * /api/v1/analytics/export/user/{userId}:
 *   get:
 *     tags: [Employee]
 *     summary: Export user productivity (CSV download)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *       - { in: query, name: startDate, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: endDate, required: true, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: CSV file, content: { text/csv: {} } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
Router.get('/export/user/:userId', ...guard, C.ExportUserCsv);

/**
 * @openapi
 * /api/v1/analytics/employee/{userId}:
 *   get:
 *     tags: [Employee]
 *     summary: Current-state metrics for one employee (workspace-scoped)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Employee metrics, content: { application/json: { schema: { $ref: '#/components/schemas/EmployeeMetric' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
Router.get('/employee/:userId', ...guard, C.GetEmployeeMetric);

/**
 * @openapi
 * /api/v1/analytics/project/{projectId}:
 *   get:
 *     tags: [Project]
 *     summary: Current-state metrics for one project (workspace-scoped)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string } }
 *       - { in: query, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project metrics, content: { application/json: { schema: { $ref: '#/components/schemas/ProjectMetric' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
Router.get('/project/:projectId', ...guard, C.GetProjectMetric);

/**
 * @openapi
 * /api/v1/analytics/workspace/{workspaceId}:
 *   get:
 *     tags: [Workspace]
 *     summary: Workspace-wide rollup metrics
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Workspace metrics, content: { application/json: { schema: { $ref: '#/components/schemas/WorkspaceMetric' } } } }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
Router.get('/workspace/:workspaceId', ...guard, C.GetWorkspaceMetric);

module.exports = Router;
