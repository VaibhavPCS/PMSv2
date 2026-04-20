'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import type { CreateTaskPayload, UpdateTaskPayload, TaskFilters } from '@/lib/api';
import { QUERY_KEYS } from '@shared/constants';
import type { Task } from '@shared/types';

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TASKS, filters],
    queryFn: () => tasksApi.getAll(filters),
    staleTime: 1000 * 60,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TASK(id),
    queryFn: async () => {
      const res = await tasksApi.getById(id);
      return res.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      if (vars.projectId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT(vars.projectId) });
      }
    },
  });
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTaskPayload) => tasksApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
    },
  });
}

export function useUpdateTaskStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: Task['status']) => tasksApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
    },
  });
}

export function useLogHours(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hours: number) => tasksApi.logHours(id, hours),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TASK(id) });
    },
  });
}

export function useTaskComments(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TASK(id), 'comments'],
    queryFn: async () => {
      const res = await tasksApi.getComments(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => tasksApi.addComment(taskId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QUERY_KEYS.TASK(taskId), 'comments'] });
    },
  });
}