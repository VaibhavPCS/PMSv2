// Meeting endpoint module. Endpoints ported VERBATIM from OLD app (/meetings).

import { getRequest, postRequest, putRequest, deleteRequest } from './client';
import type {
  Meeting,
  MeetingListResponse,
  MeetingResponseValue,
} from '@/types';

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledDate: string;
  duration: number;
  meetingLink?: string;
  participants?: string[];
  [key: string]: unknown;
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  scheduledDate?: string;
  duration?: number;
  meetingLink?: string;
  status?: Meeting['status'];
  [key: string]: unknown;
}

export const meetingsApi = {
  // GET /meetings
  list: () => getRequest<MeetingListResponse>('/meetings'),

  // POST /meetings
  create: (payload: CreateMeetingPayload) =>
    postRequest<{ success?: boolean; data?: Meeting }>('/meetings', payload),

  // PUT /meetings/:id
  update: (meetingId: string, payload: UpdateMeetingPayload) =>
    putRequest<{ success?: boolean; data?: Meeting }>(`/meetings/${meetingId}`, payload),

  // DELETE /meetings/:id
  remove: (meetingId: string) =>
    deleteRequest<{ success?: boolean }>(`/meetings/${meetingId}`),

  // POST /meetings/:id/respond  with { response }
  respond: (meetingId: string, response: MeetingResponseValue) =>
    postRequest<{ success?: boolean; data?: Meeting }>(
      `/meetings/${meetingId}/respond`,
      { response }
    ),
};
