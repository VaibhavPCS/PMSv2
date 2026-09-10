'use client';

// Sprint react-query hooks. Endpoints + keys match the OLD app (singular /sprint).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintsApi, queryKeys } from '@/lib/api';
import type { CreateSprintPayload, UpdateSprintPayload } from '@/lib/api';

export function useSprintsByProject(projectId: string, queryParams = '') {
  return useQuery({
    queryKey: queryKeys.sprintsByProject(projectId, queryParams),
    queryFn: () => sprintsApi.listByProject(projectId, queryParams),
    enabled: !!projectId,
  });
}

export function useSprintStatusByProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.sprintStatusByProject(projectId),
    queryFn: () => sprintsApi.statusByProject(projectId),
    enabled: !!projectId,
  });
}

export function useSprint(sprintId: string) {
  return useQuery({
    queryKey: queryKeys.sprint(sprintId),
    queryFn: () => sprintsApi.getById(sprintId),
    enabled: !!sprintId,
  });
}

function invalidateSprints(qc: ReturnType<typeof useQueryClient>, projectId?: string) {
  if (projectId) {
    qc.invalidateQueries({ queryKey: ['sprint', 'project', projectId] });
  } else {
    qc.invalidateQueries({ queryKey: ['sprint'] });
  }
}

export function useCreateSprint(projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSprintPayload) => sprintsApi.create(payload),
    onSuccess: (_data, vars) => invalidateSprints(qc, projectId ?? (vars.project as string)),
  });
}

export function useUpdateSprint(sprintId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSprintPayload) => sprintsApi.update(sprintId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sprint(sprintId) });
      invalidateSprints(qc, projectId);
    },
  });
}

export function useDeleteSprint(projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.remove(sprintId),
    onSuccess: () => invalidateSprints(qc, projectId),
  });
}

export function useStartSprint(projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.start(sprintId),
    onSuccess: () => invalidateSprints(qc, projectId),
  });
}

export function useCompleteSprint(projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.complete(sprintId),
    onSuccess: () => invalidateSprints(qc, projectId),
  });
}
