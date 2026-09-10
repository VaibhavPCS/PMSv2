'use client';

// Project-member react-query hooks. Endpoints + keys match the OLD app.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectMembersApi, queryKeys } from '@/lib/api';
import type {
  AddProjectMemberPayload,
  UpdateProjectMemberPayload,
} from '@/lib/api';

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => projectMembersApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddProjectMemberPayload) =>
      projectMembersApi.add(projectId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

export function useUpdateProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: UpdateProjectMemberPayload;
    }) => projectMembersApi.update(projectId, memberId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => projectMembersApi.remove(projectId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}
