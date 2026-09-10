'use client';

// Project react-query hooks. Query keys + endpoints match the OLD app
// (singular /project, plural /projects for members/attachments).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, queryKeys } from '@/lib/api';
import type { CreateProjectPayload, UpdateProjectPayload } from '@/lib/api';

export function useProjects(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceId ? queryKeys.projectsByWorkspace(workspaceId) : queryKeys.projects,
    queryFn: () => projectsApi.getAll(workspaceId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentProjects(params?: string) {
  return useQuery({
    queryKey: queryKeys.projectsRecent(params),
    queryFn: () => projectsApi.getRecent(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAllProjectMembers() {
  return useQuery({
    queryKey: queryKeys.allProjectMembers,
    queryFn: () => projectsApi.getAllMembers(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => projectsApi.getById(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProjectRole(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectRole(projectId),
    queryFn: () => projectsApi.getRole(projectId),
    enabled: !!projectId,
  });
}

export function useProjectTasksByProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectTasks(projectId),
    queryFn: () => projectsApi.getTasks(projectId),
    enabled: !!projectId,
  });
}

export function useProjectAssignableMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectAssignableMembers(projectId),
    queryFn: () => projectsApi.getAssignableMembers(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => projectsApi.update(projectId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProjectStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => projectsApi.updateStatus(projectId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.remove(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useChangeProjectHead(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (newHeadId: string) => projectsApi.changeHead(projectId, newHeadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useUploadProjectAttachment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => projectsApi.uploadAttachment(projectId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectAttachments(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useDeleteProjectAttachment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => projectsApi.deleteAttachment(projectId, attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectAttachments(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}
