export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT: (id: string) => `/projects/${id}`,
  TASKS: '/tasks',
  TASK: (id: string) => `/tasks/${id}`,
  ANALYTICS: '/analytics',
  MEMBERS: '/members',
  MEETINGS: '/meetings',
  MESSAGES: '/messages',
  CHAT: '/chat',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  WORKSPACE: '/workspace',
  ADMINISTRATION: '/administration',
  ARCHIVED: '/archived',
  EXCEL_UPLOAD: '/excel-upload',
  INVITE: (token: string) => `/invite/${token}`,
} as const;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
  cancelled: 'Cancelled',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  in_review: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'pms_access_token',
  REFRESH_TOKEN: 'pms_refresh_token',
  CURRENT_WORKSPACE: 'pms_workspace',
  THEME: 'pms_theme',
} as const;

export const QUERY_KEYS = {
  ME: ['me'],
  PROJECTS: ['projects'],
  PROJECT: (id: string) => ['projects', id],
  TASKS: ['tasks'],
  TASK: (id: string) => ['tasks', id],
  MEMBERS: ['members'],
  MEETINGS: ['meetings'],
  MESSAGES: ['messages'],
  ANALYTICS: ['analytics'],
  WORKSPACE: ['workspace'],
} as const;