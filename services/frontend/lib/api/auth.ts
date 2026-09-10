// Auth endpoint module. Ported from OLD app/hooks/use-auth.ts + auth-context.
// Endpoints match the OLD app EXACTLY (singular /auth/*). Replaces the
// supertokens-based scaffold version so the ported screens keep their call
// sites identical.

import { getRequest, postRequest } from './client';
import { stSignIn, stSignUp, stSignOut } from './supertokens-auth';
import type { ApiEnvelope, User } from '@/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) => stSignUp(data.email, data.password, data.name),

  verifyEmail: (data: { token: string }) => postRequest<any>('/auth/user/email/verify', data),

  login: (data: LoginPayload) => stSignIn(data.email, data.password),

  verifyOtp: (data: { userId: string; otp: string; type?: string }) =>
    postRequest<any>('/auth/verify-otp', {
      token: { userId: data.userId, otp: data.otp },
    }),

  resendOtp: (data: { userId: string }) => postRequest<any>('/auth/resend-otp', data),

  forgotPassword: (data: { email: string }) => postRequest<any>('/auth/forgot-password', data),

  verifyResetOtp: (data: { userId: string; otp: string }) =>
    postRequest<any>('/auth/verify-reset-otp', data),

  resetPassword: (data: { userId: string; resetToken: string; newPassword: string }) =>
    postRequest<any>('/auth/reset-password', data),

  me: () => getRequest<ApiEnvelope<User> & { user?: User }>('/api/v1/auth/me'),

  logout: () => stSignOut(),
};
