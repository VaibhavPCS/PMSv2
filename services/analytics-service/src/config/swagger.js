const Path = require('path');
const SwaggerJsdoc = require('swagger-jsdoc');

// Analytics is READ-ONLY over the wire. All values are pre-aggregated by Kafka
// consumers (current-state tables) and a node-cron scheduler (time-series
// snapshots). No write endpoints are exposed.
const definition = {
  openapi: '3.0.0',
  info: {
    title: 'PMS — Analytics Service',
    version: '1.0.0',
    description:
      'Serves pre-aggregated performance and agile-flow metrics. Current-state tables are maintained incrementally by Kafka event consumers; time-series snapshots are appended by a daily scheduler. The REST API only reads these tables — no aggregation happens inline.',
  },
  servers: [{ url: 'http://localhost:4012', description: 'Local development' }],
  tags: [
    { name: 'Employee', description: 'Per-employee performance metrics' },
    { name: 'Leaderboard', description: 'Workspace leaderboard rankings' },
    { name: 'Project', description: 'Per-project rollups' },
    { name: 'Workspace', description: 'Workspace-wide rollups' },
    { name: 'Task', description: 'Task lifecycle stats' },
    { name: 'Agile', description: 'Burndown, velocity, CFD, throughput trends' },
    { name: 'Trends', description: 'Generic metric time-series' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sAccessToken', description: 'SuperTokens session cookie' },
    },
    schemas: {
      EmployeeMetric: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          workspaceId: { type: 'string' },
          totalTasks: { type: 'integer' },
          completedCount: { type: 'integer' },
          overdueCount: { type: 'integer' },
          approvalRate: { type: 'number' },
          onTimeCompletionRate: { type: 'number' },
          avgTimeToCompleteMs: { type: 'number' },
          productivityScore: { type: 'number' },
        },
      },
      LeaderboardEntry: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          rank: { type: 'integer' },
          completedCount: { type: 'integer' },
          productivityScore: { type: 'number' },
        },
      },
      ProjectMetric: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          totalTasks: { type: 'integer' },
          completedCount: { type: 'integer' },
          completionPercent: { type: 'number' },
          healthScore: { type: 'number' },
          statusDistribution: { type: 'object' },
        },
      },
      WorkspaceMetric: { type: 'object' },
      TaskLifecycleStat: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          cycleTimeMs: { type: 'number' },
          leadTimeMs: { type: 'number' },
          rejectionCount: { type: 'integer' },
          isFirstTimeRight: { type: 'boolean' },
        },
      },
      TimeSeriesPoint: {
        type: 'object',
        properties: {
          entityId: { type: 'string' },
          workspaceId: { type: 'string' },
          capturedAt: { type: 'string', format: 'date-time' },
        },
      },
      Overview: {
        type: 'object',
        properties: {
          workspace: { $ref: '#/components/schemas/WorkspaceMetric' },
          leaderboard: { type: 'array', items: { $ref: '#/components/schemas/LeaderboardEntry' } },
          topWorkload: { type: 'array', items: { $ref: '#/components/schemas/EmployeeMetric' } },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: { status: { type: 'string', example: 'fail' }, message: { type: 'string' } },
      },
    },
    responses: {
      BadRequest: { description: 'Missing or invalid query parameter (e.g. workspaceId)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Unauthorized: { description: 'Session missing or expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Metric not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
  },
  // Path definitions live as @openapi JSDoc on the route handlers and are
  // collected via the `apis` glob below.
  paths: {},
};

module.exports = SwaggerJsdoc({
  definition,
  apis: [Path.resolve(__dirname, '../routes/*.js')],
});
