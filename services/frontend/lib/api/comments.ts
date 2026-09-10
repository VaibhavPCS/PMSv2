// Comment endpoint module. The OLD app surfaces task comments through the task
// resource; these endpoints mirror that REST shape (/task/:taskId/comments).
// Kept here as a dedicated domain module so the comments hooks have a home.

import { getRequest, postRequest, deleteRequest } from './client';
import type { Comment } from '@/types';

export const commentsApi = {
  // GET /task/:taskId/comments
  listByTask: (taskId: string) =>
    getRequest<{ success?: boolean; data?: Comment[]; comments?: Comment[] }>(
      `/task/${taskId}/comments`
    ),

  // POST /task/:taskId/comments
  add: (taskId: string, content: string) =>
    postRequest<{ success?: boolean; data?: Comment }>(
      `/task/${taskId}/comments`,
      { content }
    ),

  // DELETE /task/:taskId/comments/:commentId
  remove: (taskId: string, commentId: string) =>
    deleteRequest<{ success?: boolean }>(`/task/${taskId}/comments/${commentId}`),
};
