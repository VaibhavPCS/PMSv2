'use client';

// Chat react-query hooks. Endpoints + keys match the OLD app (/chats*).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, queryKeys } from '@/lib/api';
import type { CreateChatPayload } from '@/lib/api';

export function useChats() {
  return useQuery({
    queryKey: queryKeys.chats,
    queryFn: () => chatApi.listOrganization(),
    staleTime: 1000 * 30,
  });
}

export function useChat(chatId: string) {
  return useQuery({
    queryKey: queryKeys.chat(chatId),
    queryFn: () => chatApi.getById(chatId),
    enabled: !!chatId,
  });
}

export function useChatUnreadCount() {
  return useQuery({
    queryKey: queryKeys.chatUnreadCount,
    queryFn: () => chatApi.unreadCount(),
    staleTime: 1000 * 15,
  });
}

export function useOrganizationUsers() {
  return useQuery({
    queryKey: queryKeys.organizationUsers,
    queryFn: () => chatApi.organizationUsers(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChatPayload) => chatApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
}
