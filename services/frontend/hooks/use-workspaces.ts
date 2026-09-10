'use client';

// Workspace react-query hooks. Query keys + endpoints match the OLD app.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesApi, queryKeys } from '@/lib/api';
import type {
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
} from '@/lib/api';

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: () => workspacesApi.getAll(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: () => workspacesApi.getById(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWorkspaceAllTasks() {
  return useQuery({
    queryKey: queryKeys.workspaceAllTasks,
    queryFn: () => workspacesApi.getAllTasks(),
    staleTime: 1000 * 60,
  });
}

export function useWorkspaceUserSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.workspaceUserSearch(query),
    queryFn: () => workspacesApi.searchUsers(query),
    enabled: query.trim().length > 0,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => workspacesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) =>
      workspacesApi.update(workspaceId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) });
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => workspacesApi.remove(workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useSwitchWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => workspacesApi.switch(workspaceId),
    onSuccess: () => {
      // Switching workspace changes the workspace-id header context entirely.
      qc.invalidateQueries();
    },
  });
}

export function useInviteToWorkspace(workspaceId: string) {
  return useMutation({
    mutationFn: (payload: { email: string; role: string }) =>
      workspacesApi.invite(workspaceId, payload),
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) });
    },
  });
}

export function useUpdateWorkspaceMemberRole(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: string }) =>
      workspacesApi.updateMemberRole(workspaceId, memberId, newRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) });
    },
  });
}
