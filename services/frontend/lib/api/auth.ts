import type { ApiResponse, AuthResponse, LoginPayload, RegisterPayload, User } from '@shared/types';
import { getRequest, postRequest } from './client';

const BASE = '/auth';

export const authApi = {
  login: (payload: LoginPayload) =>
    postRequest<ApiResponse<AuthResponse>>(`${BASE}/login`, payload),

  register: (payload: RegisterPayload) =>
    postRequest<ApiResponse<AuthResponse>>(`${BASE}/register`, payload),

  logout: () =>
    postRequest<ApiResponse<null>>(`${BASE}/logout`, {}),

  me: () =>
    getRequest<ApiResponse<User>>(`${BASE}/me`),

  refreshToken: () =>
    postRequest<ApiResponse<{ accessToken: string }>>(`${BASE}/refresh`, {}),

  verifyEmail: (token: string) =>
    postRequest<ApiResponse<null>>(`${BASE}/verify-email`, { token }),

  forgotPassword: (email: string) =>
    postRequest<ApiResponse<null>>(`${BASE}/forgot-password`, { email }),

  resetPassword: (token: string, password: string) =>
    postRequest<ApiResponse<null>>(`${BASE}/reset-password`, { token, password }),
};