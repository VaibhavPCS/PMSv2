'use client';

// Invite react-query hooks. Endpoints + keys match the OLD app
// (/workspace/invite/accept/:token). Workspace creation of an invite lives in
// use-workspaces (useInviteToWorkspace).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invitesApi, queryKeys } from '@/lib/api';

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => invitesApi.accept(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}
