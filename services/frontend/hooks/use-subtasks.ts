'use client';

// Subtask react-query hooks. Endpoints + keys match the OLD app
// (/task/:taskId/subtasks).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subtasksApi, queryKeys } from '@/lib/api';
import type { CreateSubtaskPayload } from '@/lib/api';

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: queryKeys.subtasks(taskId),
    queryFn: () => subtasksApi.list(taskId),
    enabled: !!taskId,
  });
}

export function useCreateSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubtaskPayload) => subtasksApi.create(taskId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subtasks(taskId) });
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}
