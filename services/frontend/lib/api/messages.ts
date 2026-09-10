// Message endpoint module. Endpoints ported VERBATIM from OLD app
// (/messages/chats/:chatId).

import { getRequest, postRequest } from './client';
import type { Message, MessageListResponse } from '@/types';

export interface SendMessagePayload {
  content: string;
  replyTo?: string;
  attachments?: unknown[];
  [key: string]: unknown;
}

export const messagesApi = {
  // GET /messages/chats/:chatId
  listByChat: (chatId: string) =>
    getRequest<MessageListResponse>(`/messages/chats/${chatId}`),

  // POST /messages/chats/:chatId
  send: (chatId: string, payload: SendMessagePayload) =>
    postRequest<{ success?: boolean; data?: Message }>(
      `/messages/chats/${chatId}`,
      payload
    ),
};
