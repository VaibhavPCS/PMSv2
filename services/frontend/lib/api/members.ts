// Members / users endpoint module. The OLD app reads org members through
// `/project/members` and searches users via `/workspace/users/search`.
// This module consolidates those user-directory reads for the members screens.

import { getRequest } from './client';
import type { MembersResponse, OrganizationUsersResponse } from '@/types';

export const membersApi = {
  // GET /project/members  (all members visible to the current user)
  list: () => getRequest<MembersResponse>('/project/members'),

  // GET /workspace/users/search?query=...
  search: (query: string) =>
    getRequest<OrganizationUsersResponse>(
      `/workspace/users/search?query=${encodeURIComponent(query)}`
    ),
};
