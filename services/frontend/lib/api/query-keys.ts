// Centralized react-query keys that MATCH the OLD React-Router app's keys
// exactly (e.g. ['analytics','leaderboard'], ['analytics','project',id,start,end]).
// The OLD app mostly used plain string-array keys; this module gives every
// ported hook a single, consistent source so invalidation lines up across
// domains. Keys are intentionally simple arrays to mirror the old behaviour.

export const queryKeys = {
  // ---- auth ----
  me: ['auth', 'me'] as const,

  // ---- workspaces ----
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspace', id] as const,
  workspaceAllTasks: ['workspace', 'all-tasks'] as const,
  workspaceUserSearch: (query: string) => ['workspace', 'users', 'search', query] as const,

  // ---- projects ----
  projects: ['projects'] as const,
  projectsByWorkspace: (workspaceId: string) => ['projects', 'workspace', workspaceId] as const,
  projectsRecent: (params?: string) => ['projects', 'recent', params ?? ''] as const,
  project: (id: string) => ['project', id] as const,
  projectRole: (id: string) => ['project', id, 'role'] as const,
  projectTasks: (id: string) => ['project', id, 'tasks'] as const,
  projectAssignableMembers: (id: string) => ['project', id, 'assignable-members'] as const,
  allProjectMembers: ['project', 'members'] as const,

  // ---- project members ----
  projectMembers: (projectId: string) => ['projects', projectId, 'members'] as const,
  projectAttachments: (projectId: string) => ['projects', projectId, 'attachments'] as const,

  // ---- tasks ----
  tasks: ['tasks'] as const,
  task: (id: string) => ['task', id] as const,
  tasksByProject: (projectId: string) => ['task', 'project', projectId] as const,
  tasksByProjectUser: (projectId: string) => ['task', 'project', projectId, 'user'] as const,
  projectTaskMembers: (projectId: string) => ['task', 'project', projectId, 'members'] as const,

  // ---- subtasks ----
  subtasks: (taskId: string) => ['task', taskId, 'subtasks'] as const,

  // ---- comments ----
  taskComments: (taskId: string) => ['task', taskId, 'comments'] as const,

  // ---- sprints ----
  sprint: (id: string) => ['sprint', id] as const,
  sprintsByProject: (projectId: string, query?: string) =>
    ['sprint', 'project', projectId, query ?? ''] as const,
  sprintStatusByProject: (projectId: string) => ['sprint', 'project', projectId, 'status'] as const,

  // ---- meetings ----
  meetings: ['meetings'] as const,
  meeting: (id: string) => ['meetings', id] as const,

  // ---- chat ----
  chats: ['chats', 'organization'] as const,
  chat: (id: string) => ['chats', id] as const,
  chatUnreadCount: ['chats', 'unread', 'count'] as const,
  organizationUsers: ['chats', 'users', 'organization'] as const,

  // ---- messages ----
  messages: (chatId: string) => ['messages', 'chat', chatId] as const,

  // ---- notifications ----
  notifications: ['notification'] as const,

  // ---- members / users ----
  members: ['project', 'members'] as const,

  // ---- analytics ----
  analytics: ['analytics'] as const,
  analyticsLeaderboard: ['analytics', 'leaderboard'] as const,
  analyticsWorkspace: (workspaceId: string) => ['analytics', 'workspace', workspaceId] as const,
  analyticsProject: (projectId: string, startDate?: string, endDate?: string) =>
    ['analytics', 'project', projectId, startDate, endDate] as const,
  analyticsProjectAll: ['analytics', 'project', 'all'] as const,
  analyticsUser: (userId: string) => ['analytics', 'user', userId] as const,
  analyticsEmployees: (params?: Record<string, unknown>) => ['analytics', 'employees', params ?? {}] as const,
  analyticsEmployeePerformance: (userId: string) => ['analytics', 'employee', userId, 'performance'] as const,
  analyticsTaskLifecycle: (taskId: string) => ['analytics', 'task', taskId, 'lifecycle'] as const,
  analyticsApprovalStats: (query?: string) => ['analytics', 'approval-stats', query ?? ''] as const,
  analyticsApprovalTasks: (query?: string) => ['analytics', 'approval-tasks', query ?? ''] as const,

  // ---- excel upload ----
  excelWorkspaces: ['excel-upload', 'workspaces'] as const,
  excelProjects: (workspaceId: string) => ['excel-upload', 'workspaces', workspaceId, 'projects'] as const,
  excelProjectUsers: (projectId: string) => ['excel-upload', 'projects', projectId, 'users'] as const,
  excelProjectLeads: (projectId: string) => ['excel-upload', 'projects', projectId, 'leads'] as const,
} as const;
