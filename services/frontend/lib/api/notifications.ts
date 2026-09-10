// Notification endpoint module. Endpoints ported VERBATIM from OLD app
// (singular /notification).

import { getRequest, patchRequest } from './client';
import type { NotificationResponse } from '@/types';

export const notificationsApi = {
  // GET /notification
  list: () => getRequest<NotificationResponse>('/notification'),

  // PATCH /notification/:id/read
  markRead: (notificationId: string) =>
    patchRequest<{ success?: boolean }>(`/notification/${notificationId}/read`, {}),

  // PATCH /notification/read-all
  markAllRead: () => patchRequest<{ success?: boolean }>('/notification/read-all', {}),
};
