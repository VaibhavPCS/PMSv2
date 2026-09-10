'use client';

// Message react-query hooks. Endpoints + keys match the OLD app
// (/messages/chats/:chatId).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi, queryKeys } from '@/lib/api';
import type { SendMessagePayload } from '@/lib/api';

export function useMessages(chatId: string) {
  return useQuery({
    queryKey: queryKeys.messages(chatId),
    queryFn: () => messagesApi.listByChat(chatId),
    enabled: !!chatId,
  });
}

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) => messagesApi.send(chatId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messages(chatId) });
      qc.invalidateQueries({ queryKey: queryKeys.chats });
      qc.invalidateQueries({ queryKey: queryKeys.chatUnreadCount });
    },
  });
}
