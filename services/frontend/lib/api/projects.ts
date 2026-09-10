// Project endpoint module. Endpoints ported VERBATIM from OLD app.
// NOTE the OLD backend mixes singular `/project` (list/detail/role/tasks) and
// plural `/projects` (members/attachments/change-head) — preserved exactly.

import {
  getRequest,
  postRequest,
  putRequest,
  deleteRequest,
  postMultipart,
} from './client';
import type {
  Project,
  ProjectResponse,
  TaskListResponse,
  MembersResponse,
} from '@/types';

export interface CreateProjectPayload {
  title?: string;
  name?: string;
  description?: string;
  workspaceId?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface UpdateProjectPayload {
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export const projectsApi = {
  // GET /project  (optionally scoped by workspace)
  getAll: (workspaceId?: string) =>
    getRequest<ProjectResponse>(
      workspaceId ? `/project?workspace=${workspaceId}` : '/project'
    ),

  // GET /project/recent?...
  getRecent: (params?: string) =>
    getRequest<ProjectResponse>(
      params ? `/project/recent?${params}` : '/project/recent?limit=1000'
    ),

  // GET /project/members
  getAllMembers: () => getRequest<MembersResponse>('/project/members'),

  // GET /project/:id
  getById: (projectId: string) =>
    getRequest<{ success?: boolean; data?: Project } & Partial<Project>>(
      `/project/${projectId}`
    ),

  // GET /project/:id/role
  getRole: (projectId: string) =>
    getRequest<{ success?: boolean; role?: string; data?: { role?: string } }>(
      `/project/${projectId}/role`
    ),

  // GET /project/:id/tasks
  getTasks: (projectId: string) =>
    getRequest<TaskListResponse>(`/project/${projectId}/tasks`),

  // GET /project/:id/assignable-members
  getAssignableMembers: (projectId: string) =>
    getRequest<MembersResponse>(`/project/${projectId}/assignable-members`),

  // POST /workspace (create handled in workspacesApi). Project create is
  // performed via task/excel flows in the OLD app; expose generic create here.
  create: (payload: CreateProjectPayload) =>
    postRequest<{ success?: boolean; data?: Project }>('/project', payload),

  // PUT /project/:id
  update: (projectId: string, payload: UpdateProjectPayload) =>
    putRequest<{ success?: boolean; data?: Project }>(`/project/${projectId}`, payload),

  // PUT /project/:id  with { status }
  updateStatus: (projectId: string, status: string) =>
    putRequest<{ success?: boolean; data?: Project }>(`/project/${projectId}`, { status }),

  // DELETE /project/:id
  remove: (projectId: string) =>
    deleteRequest<{ success?: boolean }>(`/project/${projectId}`),

  // POST /projects/:id/change-head  with { newHeadId }
  changeHead: (projectId: string, newHeadId: string) =>
    postRequest<{ success?: boolean }>(`/projects/${projectId}/change-head`, { newHeadId }),

  // POST /projects/:id/attachments  (multipart)
  uploadAttachment: (projectId: string, formData: FormData) =>
    postMultipart<{ success?: boolean; data?: unknown }>(
      `/projects/${projectId}/attachments`,
      formData
    ),

  // DELETE /projects/:id/attachments/:attachmentId
  deleteAttachment: (projectId: string, attachmentId: string) =>
    deleteRequest<{ success?: boolean }>(
      `/projects/${projectId}/attachments/${attachmentId}`
    ),
};
