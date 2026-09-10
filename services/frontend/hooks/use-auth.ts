'use client';

import { useMutation } from '@tanstack/react-query';
import { postRequest } from '@/lib/api';
import { stSignIn, stSignUp } from '@/lib/api/supertokens-auth';
export { useAuth } from '@/providers/AuthProvider';

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: (data: SignupFormData) => stSignUp(data.email, data.password, data.name),
  });
};

export const useVerifyEmailMutation = () => {
  return useMutation({
    mutationFn: (data: { token: string }) => postRequest('/auth/user/email/verify', data),
  });
};

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) => stSignIn(data.email, data.password),
  });
};

export const useVerifyOTPMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string; otp: string; type: string }) => {
      return postRequest('/auth/verify-otp', {
        token: {
          userId: data.userId,
          otp: data.otp,
        },
      });
    },
  });
};

export const useResendOTPMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string }) => postRequest('/auth/resend-otp', data),
  });
};

// NEW: Password Reset Mutations
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string }) => postRequest('/auth/forgot-password', data),
  });
};

export const useVerifyResetOTPMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string; otp: string }) => postRequest('/auth/verify-reset-otp', data),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string; resetToken: string; newPassword: string }) =>
      postRequest('/auth/reset-password', data),
  });
};
