'use client';

// Members / users react-query hooks. Endpoints + keys match the OLD app
// (/project/members, /workspace/users/search).

import { useQuery } from '@tanstack/react-query';
import { membersApi, queryKeys } from '@/lib/api';

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: () => membersApi.list(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMemberSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.workspaceUserSearch(query),
    queryFn: () => membersApi.search(query),
    enabled: query.trim().length > 0,
  });
}
