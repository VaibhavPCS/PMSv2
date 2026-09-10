'use client';

// Meeting react-query hooks. Endpoints + keys match the OLD app (/meetings).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi, queryKeys } from '@/lib/api';
import type { CreateMeetingPayload, UpdateMeetingPayload } from '@/lib/api';
import type { MeetingResponseValue } from '@/types';

export function useMeetings() {
  return useQuery({
    queryKey: queryKeys.meetings,
    queryFn: () => meetingsApi.list(),
    staleTime: 1000 * 60,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingPayload) => meetingsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings });
    },
  });
}

export function useUpdateMeeting(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMeetingPayload) => meetingsApi.update(meetingId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meeting(meetingId) });
      qc.invalidateQueries({ queryKey: queryKeys.meetings });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => meetingsApi.remove(meetingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meetings });
    },
  });
}

export function useRespondToMeeting(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (response: MeetingResponseValue) =>
      meetingsApi.respond(meetingId, response),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meeting(meetingId) });
      qc.invalidateQueries({ queryKey: queryKeys.meetings });
    },
  });
}
