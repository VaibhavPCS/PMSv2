// Subtask endpoint module. Endpoints ported VERBATIM from OLD app.
// OLD app: GET/POST `/task/:taskId/subtasks` (POST body matches task-detail.tsx).

import { getRequest, postRequest } from './client';
import type { Subtask, SubtaskListResponse } from '@/types';

export interface CreateSubtaskPayload {
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
}

export const subtasksApi = {
  // GET /task/:taskId/subtasks
  list: (taskId: string) =>
    getRequest<SubtaskListResponse>(`/task/${taskId}/subtasks`),

  // POST /task/:taskId/subtasks
  create: (taskId: string, payload: CreateSubtaskPayload) =>
    postRequest<{ success?: boolean; data?: Subtask }>(
      `/task/${taskId}/subtasks`,
      payload
    ),
};
