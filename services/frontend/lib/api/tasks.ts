import type {
  ApiResponse,
  PaginatedResponse,
  Task,
  Comment,
  Attachment,
} from '@shared/types';
import {
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest,
  postMultipart,
} from './client';

const BASE = '/tasks';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  tags?: string[];
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  page?: number;
  limit?: number;
}

export const tasksApi = {
  getAll: (filters: TaskFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined) params.set(k, String(v));
    });
    return getRequest<PaginatedResponse<Task>>(`${BASE}?${params.toString()}`);
  },

  getById: (id: string) =>
    getRequest<ApiResponse<Task>>(`${BASE}/${id}`),

  create: (payload: CreateTaskPayload) =>
    postRequest<ApiResponse<Task>>(BASE, payload),

  update: (id: string, payload: UpdateTaskPayload) =>
    putRequest<ApiResponse<Task>>(`${BASE}/${id}`, payload),

  updateStatus: (id: string, status: Task['status']) =>
    patchRequest<ApiResponse<Task>>(`${BASE}/${id}/status`, { status }),

  delete: (id: string) =>
    deleteRequest<ApiResponse<null>>(`${BASE}/${id}`),

  logHours: (id: string, hours: number) =>
    patchRequest<ApiResponse<Task>>(`${BASE}/${id}/log-hours`, { hours }),

  getComments: (id: string) =>
    getRequest<ApiResponse<Comment[]>>(`${BASE}/${id}/comments`),

  addComment: (id: string, content: string) =>
    postRequest<ApiResponse<Comment>>(`${BASE}/${id}/comments`, { content }),

  deleteComment: (taskId: string, commentId: string) =>
    deleteRequest<ApiResponse<null>>(`${BASE}/${taskId}/comments/${commentId}`),

  uploadAttachment: (id: string, formData: FormData) =>
    postMultipart<ApiResponse<Attachment>>(`${BASE}/${id}/attachments`, formData),

  deleteAttachment: (taskId: string, attachmentId: string) =>
    deleteRequest<ApiResponse<null>>(`${BASE}/${taskId}/attachments/${attachmentId}`),
};