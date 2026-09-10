// Task endpoint module. Endpoints ported VERBATIM from OLD app (singular /task).

import {
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest,
  postMultipart,
} from './client';
import type { Task, TaskListResponse, MembersResponse } from '@/types';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  project?: string;
  projectId?: string;
  assignedTo?: string;
  assigneeId?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
  sprint?: string;
  [key: string]: unknown;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assignedTo?: string | null;
  assigneeId?: string | null;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  tags?: string[];
  [key: string]: unknown;
}

export const tasksApi = {
  // GET /task/project/:projectId
  getByProject: (projectId: string) =>
    getRequest<TaskListResponse>(`/task/project/${projectId}`),

  // GET /task/project/:projectId/user
  getByProjectForUser: (projectId: string) =>
    getRequest<TaskListResponse>(`/task/project/${projectId}/user`),

  // GET /task/project/:projectId/members
  getProjectMembers: (projectId: string) =>
    getRequest<MembersResponse>(`/task/project/${projectId}/members`),

  // POST /task   (JSON)
  create: (payload: CreateTaskPayload) =>
    postRequest<{ success?: boolean; data?: Task }>('/task', payload),

  // POST /task   (multipart — task with attachments)
  createMultipart: (formData: FormData) =>
    postMultipart<{ success?: boolean; data?: Task }>('/task', formData),

  // PUT /task/:id
  update: (taskId: string, payload: UpdateTaskPayload) =>
    putRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}`, payload),

  // PATCH /task/:id   (e.g. { assignedTo })
  patch: (taskId: string, payload: Partial<UpdateTaskPayload>) =>
    patchRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}`, payload),

  // DELETE /task/:id
  remove: (taskId: string) =>
    deleteRequest<{ success?: boolean }>(`/task/${taskId}`),

  // POST /task/:id/status   with { status }
  updateStatus: (taskId: string, status: string) =>
    postRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}/status`, { status }),

  // POST /task/:id/hold   with { reason }
  hold: (taskId: string, reason: string) =>
    postRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}/hold`, { reason }),

  // POST /task/:id/resume
  resume: (taskId: string) =>
    postRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}/resume`, {}),

  // POST /task/:id/approve
  approve: (taskId: string) =>
    postRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}/approve`, {}),

  // POST /task/:id/reject   (JSON body)
  reject: (taskId: string, payload: Record<string, unknown>) =>
    postRequest<{ success?: boolean; data?: Task }>(`/task/${taskId}/reject`, payload),

  // POST /task/:id/reject   (multipart — rejection with attachments)
  rejectMultipart: (taskId: string, formData: FormData) =>
    postMultipart<{ success?: boolean; data?: Task }>(`/task/${taskId}/reject`, formData),
};
