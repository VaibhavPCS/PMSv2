// Project-members endpoint module. Endpoints ported VERBATIM from OLD app
// (plural /projects/:projectId/members*).

import { getRequest, postRequest, patchRequest, deleteRequest } from './client';
import type { ProjectMember } from '@/types';

export interface AddProjectMemberPayload {
  userId?: string;
  email?: string;
  role?: string;
  reportsTo?: string | null;
  [key: string]: unknown;
}

export interface UpdateProjectMemberPayload {
  role?: string;
  reportsTo?: string | null;
}

export const projectMembersApi = {
  // GET /projects/:projectId/members
  list: (projectId: string) =>
    getRequest<{ success?: boolean; data?: ProjectMember[]; members?: ProjectMember[] }>(
      `/projects/${projectId}/members`
    ),

  // POST /projects/:projectId/members
  add: (projectId: string, payload: AddProjectMemberPayload) =>
    postRequest<{ success?: boolean; data?: ProjectMember }>(
      `/projects/${projectId}/members`,
      payload
    ),

  // PATCH /projects/:projectId/members/:memberId
  update: (projectId: string, memberId: string, payload: UpdateProjectMemberPayload) =>
    patchRequest<{ success?: boolean; data?: ProjectMember }>(
      `/projects/${projectId}/members/${memberId}`,
      payload
    ),

  // DELETE /projects/:projectId/members   (body { memberId })
  remove: (projectId: string, memberId: string) =>
    deleteRequest<{ success?: boolean }>(`/projects/${projectId}/members`, { memberId }),
};
