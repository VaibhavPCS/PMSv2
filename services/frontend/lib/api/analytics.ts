// Analytics endpoint module. Endpoints ported VERBATIM from OLD app
// (app/features/analytics/**). Mirrors leaderboard / workspace / project /
// user / employees / performance / lifecycle / approval / refresh.

import { apiClient, getRequest, postRequest } from './client';
import type {
  LeaderboardResponse,
  WorkspaceSummary,
  ProjectAnalyticsResponse,
  UserProductivityStats,
  EmployeeListResponse,
  EmployeePerformanceResponse,
  LifecycleResponse,
} from '@/types';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  workspaceId?: string;
}

export interface PerformanceParams {
  period?: string;
  startDate?: string;
  endDate?: string;
}

export const analyticsApi = {
  // GET /analytics/leaderboard
  leaderboard: () => getRequest<LeaderboardResponse>('/analytics/leaderboard'),

  // GET /analytics/workspace/:workspaceId
  workspace: (workspaceId: string) =>
    getRequest<WorkspaceSummary>(`/analytics/workspace/${workspaceId}`),

  // GET /analytics/project/:projectId{?startDate&endDate}
  project: (projectId: string, startDate?: string, endDate?: string) => {
    let url = `/analytics/project/${projectId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return getRequest<ProjectAnalyticsResponse>(url);
  },

  // GET /analytics/project/all
  projectAll: () => getRequest<unknown>('/analytics/project/all'),

  // GET /analytics/user/:userId
  user: (userId: string) =>
    getRequest<UserProductivityStats>(`/analytics/user/${userId}`),

  // GET /analytics/employees   (axios params)
  employees: (params: EmployeeListParams = {}) =>
    apiClient
      .get<EmployeeListResponse>('/analytics/employees', { params })
      .then((r) => r.data),

  // GET /analytics/employee/:userId/performance
  employeePerformance: (userId: string, params: PerformanceParams = { period: 'daily' }) =>
    apiClient
      .get<EmployeePerformanceResponse>(`/analytics/employee/${userId}/performance`, { params })
      .then((r) => r.data),

  // GET /analytics/task/:taskId/lifecycle
  taskLifecycle: (taskId: string, page = 1, limit = 50) =>
    apiClient
      .get<LifecycleResponse>(`/analytics/task/${taskId}/lifecycle`, { params: { page, limit } })
      .then((r) => r.data),

  // GET /analytics/approval-stats{query}
  approvalStats: (query = '') => getRequest<any>(`/analytics/approval-stats${query}`),

  // GET /analytics/approval-tasks{query}
  approvalTasks: (query = '') => getRequest<any>(`/analytics/approval-tasks${query}`),

  // POST /analytics/refresh
  refresh: () => postRequest<{ message: string }>('/analytics/refresh', {}),

  // GET /analytics/snapshot/workspace/:workspaceId
  // Snapshot-based comprehensive workspace report (40x faster); falls back to
  // real-time when no snapshot. Returns the raw envelope so the caller can read
  // `source` / `lastUpdated` / `data`. Ported VERBATIM from OLD workspace-report.tsx.
  workspaceSnapshot: (workspaceId: string) =>
    getRequest<any>(`/analytics/snapshot/workspace/${workspaceId}`),

  // GET /analytics/workspace/:workspaceId/report?format=excel{&startDate&endDate}
  // Styled Excel/CSV download for the workspace comprehensive report.
  workspaceReportDownload: (
    workspaceId: string,
    startDate?: string,
    endDate?: string
  ) => {
    let url = `/analytics/workspace/${workspaceId}/report?format=excel`;
    if (startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return apiClient
      .get(url, { responseType: 'blob' })
      .then((r) => r.data as Blob);
  },
};
