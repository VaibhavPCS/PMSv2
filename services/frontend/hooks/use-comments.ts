'use client';

// Comment react-query hooks. Endpoints + keys match the OLD app's task-scoped
// comment routes (/task/:taskId/comments).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi, queryKeys } from '@/lib/api';

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: queryKeys.taskComments(taskId),
    queryFn: () => commentsApi.listByTask(taskId),
    enabled: !!taskId,
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => commentsApi.add(taskId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.taskComments(taskId) });
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.remove(taskId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.taskComments(taskId) });
    },
  });
}
