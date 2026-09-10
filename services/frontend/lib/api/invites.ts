// Invite endpoint module. Endpoints ported VERBATIM from OLD app.
// Workspace invites are created via /workspace/:id/invite (see workspacesApi);
// invite acceptance lives here for the dedicated /invite route.

import { postRequest } from './client';
import type { InviteAcceptResponse } from '@/types';

export const invitesApi = {
  // POST /workspace/invite/accept/:token
  accept: (token: string) =>
    postRequest<InviteAcceptResponse>(`/workspace/invite/accept/${token}`, {}),
};
