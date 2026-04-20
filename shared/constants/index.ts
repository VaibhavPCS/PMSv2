export const ROUTES = {
  HOME:      '/',
  LOGIN:     '/login',
  REGISTER:  '/register',
  DASHBOARD: '/dashboard',
  PROJECTS:  '/dashboard/projects',
  PROJECT:   (id: string) => `/dashboard/projects/${id}`,
  TASKS:     '/dashboard/tasks',
  TASK:      (id: string) => `/dashboard/tasks/${id}`,
  ANALYTICS: '/dashboard/analytics',
  SETTINGS:  '/dashboard/settings',
  MEMBERS:   '/dashboard/members',
} as const;

export const QUERY_KEYS = {
  ME:        ['me'] as const,
  PROJECTS:  ['projects'] as const,
  PROJECT:   (id: string) => ['projects', id] as const,
  TASKS:     ['tasks'] as const,
  TASK:      (id: string) => ['tasks', id] as const,
  MEMBERS:   ['members'] as const,
  ANALYTICS: ['analytics'] as const,
  WORKSPACE: ['workspace'] as const,
};

export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
} as const;

export const PROJECT_STATUS = {
  ACTIVE:    'active',
  COMPLETED: 'completed',
  ON_HOLD:   'on-hold',
  ARCHIVED:  'archived',
} as const;

export const TASK_STATUS = {
  TODO:        'todo',
  IN_PROGRESS: 'in-progress',
  IN_REVIEW:   'in-review',
  DONE:        'done',
  CANCELLED:   'cancelled',
} as const;

export const TASK_PRIORITY = {
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
  URGENT: 'urgent',
} as const;

export const MEMBER_ROLE = {
  OWNER:  'owner',
  ADMIN:  'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;
