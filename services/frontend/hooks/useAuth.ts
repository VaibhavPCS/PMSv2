'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { QUERY_KEYS, ROUTES } from '@shared/constants';
import type { LoginPayload, RegisterPayload } from '@shared/types';

export function useMe() {
  return useQuery({
    queryKey: QUERY_KEYS.ME,
    queryFn: async () => {
      const res = await authApi.me();
      return res.data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useLogin() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ME });
      router.push(ROUTES.DASHBOARD);
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.ME });
      router.push(ROUTES.DASHBOARD);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.clear();
      router.push(ROUTES.LOGIN);
    },
    onError: () => {
      // Force logout even on error
      qc.clear();
      router.push(ROUTES.LOGIN);
    },
  });
}