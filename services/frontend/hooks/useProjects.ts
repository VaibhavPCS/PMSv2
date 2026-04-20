'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import type { CreateProjectPayload, UpdateProjectPayload } from '@/lib/api';
import { QUERY_KEYS } from '@shared/constants';
import type { Project } from '@shared/types';

export function useProjects(workspaceId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PROJECTS, workspaceId, page],
    queryFn: () => projectsApi.getAll(workspaceId, page, limit),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.PROJECT(id),
    queryFn: async () => {
      const res = await projectsApi.getById(id);
      return res.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => projectsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}

export function useUpdateProjectStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: Project['status']) => projectsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECTS });
    },
  });
}

export function useProjectMembers(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PROJECT(id), 'members'],
    queryFn: async () => {
      const res = await projectsApi.getMembers(id);
      return res.data;
    },
    enabled: !!id,
  });
}