// Path translation: OLD monolith REST contract -> NEW microservice gateway.
//
// The frontend was ported from the old MongoDB monolith, whose REST API used
// singular, un-prefixed resource paths (/workspace, /project, /task, /auth/me,
// /notification ...). The new backend is a set of microservices fronted by the
// Next rewrites() gateway, which expects /api/v1/<plural>/... . This interceptor
// rewrites the bulk of those calls in one place so the ported components keep
// their exact call sites.
//
// SuperTokens auth (/auth/signin|signup|signout|session) does NOT pass through
// this client — those go via the supertokens-web-js SDK — so mapping every
// remaining /auth/* (i.e. /auth/me) to /api/v1/auth/* here is safe.
//
// NOTE: some old endpoints have NO 1:1 backend equivalent yet and will still
// 404 until the corresponding microservice route is built. Known gaps:
//   /analytics/*            (no analytics REST service — Flink async only)
//   /workspace/all-tasks    (cross-service task aggregation)
//   /workspace/switch       (active-workspace setter)
//   /workspace/users/search (member search)
//   /project/recent, /project/members, /project/:id/role,
//     /project/:id/assignable-members, /project/:id/tasks
//   /task/:id/hold, /task/:id/resume, /task/project/:id*
//   /excel-upload/*         (maps conceptually to the imports service)
// These are reported separately rather than silently rewritten to a wrong URL.

// Singular old root -> plural new root.
const PLURAL: Record<string, string> = {
  workspace: 'workspaces',
  project: 'projects',
  task: 'tasks',
  sprint: 'sprints',
  notification: 'notifications',
};

// Roots that are valid once prefixed with /api/v1 (the port left these plural).
const PASS_ROOTS = new Set([
  'auth', 'workspaces', 'projects', 'tasks', 'sprints', 'recurring',
  'imports', 'notifications', 'workflows', 'chats', 'messages', 'files',
  'meetings', 'comments', 'analytics', 'excel-upload',
]);

// Special remaps where the new path differs by BOTH root AND path (so generic
// singular->plural pluralization is NOT sufficient). These map the old, un-
// prefixed monolith path to the EXACT new microservice route the backend owns:
//   - approval data lives in task-service (4004), not a (nonexistent) analytics svc
//   - cross-service "all tasks" aggregation lives in task-service (4004)
//   - "recent projects" is a dedicated new project-service route, distinct from
//     the existing GET /api/v1/projects collection route
// Keyed by exact old path (no query/hash) -> final /api/v1/* path.
const SPECIAL_REMAP: Record<string, string> = {
  '/analytics/approval-stats': '/api/v1/tasks/approval-stats',
  '/analytics/approval-tasks': '/api/v1/tasks/approval-tasks',
  '/workspace/all-tasks': '/api/v1/tasks/all',
  '/project/recent': '/api/v1/projects/recent',
};

export function mapApiPath(url: string): string {
  // Leave absolute URLs and already-migrated paths untouched.
  if (!url || !url.startsWith('/')) return url;
  if (url.startsWith('/api/v1/') || url === '/api/v1') return url;

  // Split off query/hash so we only rewrite the path segment.
  const qIdx = url.search(/[?#]/);
  const path = qIdx === -1 ? url : url.slice(0, qIdx);
  const suffix = qIdx === -1 ? '' : url.slice(qIdx);

  // Exact-path special remaps win over generic root pluralization.
  const special = SPECIAL_REMAP[path];
  if (special) return `${special}${suffix}`;

  const segs = path.split('/').filter(Boolean); // drop leading ''
  if (segs.length === 0) return url;

  const root = segs[0];
  const mappedRoot = PLURAL[root] ?? root;
  if (!PASS_ROOTS.has(mappedRoot)) return url; // unknown root -> leave as-is

  segs[0] = mappedRoot;
  return `/api/v1/${segs.join('/')}${suffix}`;
}
