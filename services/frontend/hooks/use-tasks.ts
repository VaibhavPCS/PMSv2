'use client';

// Task react-query hooks. Query keys + endpoints match the OLD app
// (singular /task, /task/project/:id, status/hold/resume/approve/reject).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, queryKeys } from '@/lib/api';
import type { CreateTaskPayload, UpdateTaskPayload } from '@/lib/api';

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasksByProject(projectId),
    queryFn: () => tasksApi.getByProject(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}

export function useProjectUserTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasksByProjectUser(projectId),
    queryFn: () => tasksApi.getByProjectForUser(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}

export function useProjectTaskMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectTaskMembers(projectId),
    queryFn: () => tasksApi.getProjectMembers(projectId),
    enabled: !!projectId,
  });
}

function invalidateTaskLists(qc: ReturnType<typeof useQueryClient>, projectId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.tasks });
  if (projectId) {
    qc.invalidateQueries({ queryKey: queryKeys.tasksByProject(projectId) });
    qc.invalidateQueries({ queryKey: queryKeys.tasksByProjectUser(projectId) });
  }
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onSuccess: (_data, vars) => {
      invalidateTaskLists(qc, (vars.projectId || vars.project) as string | undefined);
    },
  });
}

export function useCreateTaskMultipart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => tasksApi.createMultipart(formData),
    onSuccess: () => invalidateTaskLists(qc),
  });
}

export function useUpdateTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) => tasksApi.update(taskId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function usePatchTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<UpdateTaskPayload>) => tasksApi.patch(taskId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function useDeleteTask(projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksApi.remove(taskId),
    onSuccess: () => invalidateTaskLists(qc, projectId),
  });
}

export function useUpdateTaskStatus(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => tasksApi.updateStatus(taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function useHoldTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => tasksApi.hold(taskId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function useResumeTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.resume(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function useApproveTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tasksApi.approve(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}

export function useRejectTask(taskId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> | FormData) =>
      payload instanceof FormData
        ? tasksApi.rejectMultipart(taskId, payload)
        : tasksApi.reject(taskId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      invalidateTaskLists(qc, projectId);
    },
  });
}
