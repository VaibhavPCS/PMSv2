import type {
  ApiResponse,
  PaginatedResponse,
  Project,
  ProjectMember,
} from '@shared/types';
import { getRequest, postRequest, putRequest, patchRequest, deleteRequest } from './client';

const BASE = '/projects';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  workspaceId: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: Project['status'];
  startDate?: string;
  endDate?: string;
}

export const projectsApi = {
  getAll: (workspaceId: string, page = 1, limit = 20) =>
    getRequest<PaginatedResponse<Project>>(
      `${BASE}?workspaceId=${workspaceId}&page=${page}&limit=${limit}`
    ),

  getById: (id: string) =>
    getRequest<ApiResponse<Project>>(`${BASE}/${id}`),

  create: (payload: CreateProjectPayload) =>
    postRequest<ApiResponse<Project>>(BASE, payload),

  update: (id: string, payload: UpdateProjectPayload) =>
    putRequest<ApiResponse<Project>>(`${BASE}/${id}`, payload),

  updateStatus: (id: string, status: Project['status']) =>
    patchRequest<ApiResponse<Project>>(`${BASE}/${id}/status`, { status }),

  delete: (id: string) =>
    deleteRequest<ApiResponse<null>>(`${BASE}/${id}`),

  archive: (id: string) =>
    patchRequest<ApiResponse<Project>>(`${BASE}/${id}/archive`, {}),

  getMembers: (id: string) =>
    getRequest<ApiResponse<ProjectMember[]>>(`${BASE}/${id}/members`),

  addMember: (id: string, userId: string, role: ProjectMember['role']) =>
    postRequest<ApiResponse<ProjectMember>>(`${BASE}/${id}/members`, { userId, role }),

  removeMember: (id: string, userId: string) =>
    deleteRequest<ApiResponse<null>>(`${BASE}/${id}/members`, { userId }),

  getArchived: (workspaceId: string) =>
    getRequest<PaginatedResponse<Project>>(
      `${BASE}/archived?workspaceId=${workspaceId}`
    ),
};