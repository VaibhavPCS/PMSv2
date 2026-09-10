// Workspace endpoint module. Endpoints ported VERBATIM from OLD app
// (singular /workspace, /workspace/switch, /workspace/all-tasks, invites, members).

import {
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest,
} from './client';
import type {
  Workspace,
  WorkspaceResponse,
  TaskListResponse,
  OrganizationUsersResponse,
} from '@/types';

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
}

export const workspacesApi = {
  getAll: () => getRequest<WorkspaceResponse>('/workspace'),

  getById: (workspaceId: string) =>
    getRequest<{ success?: boolean; data?: Workspace } & Partial<Workspace>>(
      `/workspace/${workspaceId}`
    ),

  create: (payload: CreateWorkspacePayload) =>
    postRequest<{ success?: boolean; data?: Workspace }>('/workspace', payload),

  update: (workspaceId: string, payload: UpdateWorkspacePayload) =>
    putRequest<{ success?: boolean; data?: Workspace }>(`/workspace/${workspaceId}`, payload),

  remove: (workspaceId: string) =>
    deleteRequest<{ success?: boolean }>(`/workspace/${workspaceId}`),

  switch: (workspaceId: string) =>
    postRequest<{ success?: boolean; data?: Workspace }>('/workspace/switch', { workspaceId }),

  getAllTasks: () => getRequest<TaskListResponse>('/workspace/all-tasks'),

  searchUsers: (query: string) =>
    getRequest<OrganizationUsersResponse>(
      `/workspace/users/search?query=${encodeURIComponent(query)}`
    ),

  invite: (workspaceId: string, payload: { email: string; role: string }) =>
    postRequest<{ success?: boolean; message?: string }>(
      `/workspace/${workspaceId}/invite`,
      payload
    ),

  removeMember: (workspaceId: string, memberId: string) =>
    deleteRequest<{ success?: boolean }>(`/workspace/${workspaceId}/members/${memberId}`),

  updateMemberRole: (workspaceId: string, memberId: string, newRole: string) =>
    patchRequest<{ success?: boolean }>(
      `/workspace/${workspaceId}/members/${memberId}/role`,
      { newRole }
    ),
};
