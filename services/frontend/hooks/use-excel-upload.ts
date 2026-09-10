'use client';

// Excel-upload react-query hooks. Endpoints + keys match the OLD app
// (/excel-upload/**).

import { useQuery, useMutation } from '@tanstack/react-query';
import { excelUploadApi, queryKeys } from '@/lib/api';

export function useExcelWorkspaces() {
  return useQuery({
    queryKey: queryKeys.excelWorkspaces,
    queryFn: () => excelUploadApi.workspaces(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useExcelProjects(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.excelProjects(workspaceId),
    queryFn: () => excelUploadApi.projects(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useExcelProjectUsers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.excelProjectUsers(projectId),
    queryFn: () => excelUploadApi.projectUsers(projectId),
    enabled: !!projectId,
  });
}

export function useExcelProjectLeads(projectId: string) {
  return useQuery({
    queryKey: queryKeys.excelProjectLeads(projectId),
    queryFn: () => excelUploadApi.projectLeads(projectId),
    enabled: !!projectId,
  });
}

export function useExcelParsePreview() {
  return useMutation({
    mutationFn: (formData: FormData) => excelUploadApi.parsePreview(formData),
  });
}

export function useExcelUploadTasks() {
  return useMutation({
    mutationFn: (formData: FormData) => excelUploadApi.uploadTasks(formData),
  });
}
