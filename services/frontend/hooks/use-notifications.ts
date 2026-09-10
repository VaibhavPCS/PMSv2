'use client';

// Notification react-query hooks. Endpoints + keys match the OLD app
// (singular /notification).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, queryKeys } from '@/lib/api';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list(),
    staleTime: 1000 * 30,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
