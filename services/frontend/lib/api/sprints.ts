// Sprint endpoint module. Endpoints ported VERBATIM from OLD app (singular /sprint).

import { getRequest, postRequest, putRequest, deleteRequest } from './client';
import type { Sprint, SprintListResponse, SprintTasksResponse } from '@/types';

export interface CreateSprintPayload {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  project: string;
  [key: string]: unknown;
}

export interface UpdateSprintPayload {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: Sprint['status'];
  [key: string]: unknown;
}

export const sprintsApi = {
  // GET /sprint/project/:projectId{?status=...}
  listByProject: (projectId: string, queryParams = '') =>
    getRequest<SprintListResponse>(`/sprint/project/${projectId}${queryParams}`),

  // GET /sprint/project/:projectId/status
  statusByProject: (projectId: string) =>
    getRequest<{ success?: boolean; data?: unknown }>(
      `/sprint/project/${projectId}/status`
    ),

  // GET /sprint/:id  -> { data: { tasks } }
  getById: (sprintId: string) =>
    getRequest<SprintTasksResponse>(`/sprint/${sprintId}`),

  // POST /sprint
  create: (payload: CreateSprintPayload) =>
    postRequest<{ success?: boolean; data?: Sprint }>('/sprint', payload),

  // PUT /sprint/:id
  update: (sprintId: string, payload: UpdateSprintPayload) =>
    putRequest<{ success?: boolean; data?: Sprint }>(`/sprint/${sprintId}`, payload),

  // DELETE /sprint/:id
  remove: (sprintId: string) =>
    deleteRequest<{ success?: boolean }>(`/sprint/${sprintId}`),

  // POST /sprint/:id/start
  start: (sprintId: string) =>
    postRequest<{ success?: boolean; data?: Sprint }>(`/sprint/${sprintId}/start`, {}),

  // POST /sprint/:id/complete
  complete: (sprintId: string) =>
    postRequest<{ success?: boolean; data?: Sprint }>(`/sprint/${sprintId}/complete`, {}),
};
