'use client';

// Auth react-query mutation hooks. Ported VERBATIM from OLD app/hooks/use-auth.ts
// (register / verify-email / login / verify-otp / resend-otp / forgot-password /
// verify-reset-otp / reset-password) plus a `me` query and logout.
// Endpoints match the OLD app EXACTLY (singular /auth/*).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, queryKeys } from '@/lib/api';
import type { RegisterPayload } from '@/lib/api';

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => authApi.me(),
    enabled,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: (data: { token: string }) => authApi.verifyEmail(data),
  });
}

export function useSignInMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useVerifyOTPMutation() {
  return useMutation({
    mutationFn: (data: { userId: string; otp: string; type: string }) =>
      authApi.verifyOtp(data),
  });
}

export function useResendOTPMutation() {
  return useMutation({
    mutationFn: (data: { userId: string }) => authApi.resendOtp(data),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (data: { email: string }) => authApi.forgotPassword(data),
  });
}

export function useVerifyResetOTPMutation() {
  return useMutation({
    mutationFn: (data: { userId: string; otp: string }) => authApi.verifyResetOtp(data),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (data: { userId: string; resetToken: string; newPassword: string }) =>
      authApi.resetPassword(data),
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => qc.clear(),
    onError: () => qc.clear(),
  });
}
