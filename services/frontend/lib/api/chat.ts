// Chat endpoint module. Endpoints ported VERBATIM from OLD app (/chats*).

import { getRequest, postRequest } from './client';
import type {
  Chat,
  ChatListResponse,
  CreateChatResponse,
  UnreadCountResponse,
  OrganizationUsersResponse,
} from '@/types';

export interface CreateChatPayload {
  type?: 'direct' | 'group';
  name?: string;
  participants?: string[];
  userId?: string;
  [key: string]: unknown;
}

export const chatApi = {
  // GET /chats/organization
  listOrganization: () => getRequest<ChatListResponse>('/chats/organization'),

  // GET /chats/:chatId
  getById: (chatId: string) =>
    getRequest<{ success?: boolean; data?: Chat } & Partial<Chat>>(`/chats/${chatId}`),

  // GET /chats/unread/count
  unreadCount: () => getRequest<UnreadCountResponse>('/chats/unread/count'),

  // GET /chats/users/organization
  organizationUsers: () =>
    getRequest<OrganizationUsersResponse>('/chats/users/organization'),

  // POST /chats
  create: (payload: CreateChatPayload) =>
    postRequest<CreateChatResponse>('/chats', payload),
};
