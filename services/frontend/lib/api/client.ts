import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { mapApiPath } from './path-map';
import { normalizeIds } from './normalize-ids';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Translate old-monolith resource paths to the new /api/v1 gateway contract.
  if (config.url) config.url = mapApiPath(config.url);
  if (typeof window !== 'undefined') {
    const workspaceId = localStorage.getItem('currentWorkspaceId');
    if (workspaceId && config.headers) {
      config.headers['workspace-id'] = workspaceId;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Additively inject `_id` from the backend's `id` so the ported frontend's
    // _id-based keys / URL building / nested reads keep working.
    if (response.data && typeof response.data === 'object') {
      response.data = normalizeIds(response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        window.dispatchEvent(new Event('force-logout'));
      }
      if (!error.response) {
        window.dispatchEvent(
          new CustomEvent('network-error', { detail: { message: error.message } })
        );
      }
    }
    return Promise.reject(error);
  }
);

export async function getRequest<T>(url: string): Promise<T> {
  const res = await apiClient.get<T>(url, {
    headers: { Accept: 'application/json' },
  });
  return res.data;
}

export async function postRequest<T>(url: string, data: unknown): Promise<T> {
  const res = await apiClient.post<T>(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
}

export async function postMultipart<T>(url: string, formData: FormData): Promise<T> {
  const res = await apiClient.post<T>(url, formData);
  return res.data;
}

export async function putRequest<T>(url: string, data: unknown): Promise<T> {
  const res = await apiClient.put<T>(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
}

export async function patchRequest<T>(url: string, data: unknown = {}): Promise<T> {
  const res = await apiClient.patch<T>(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.data;
}

export async function deleteRequest<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.delete<T>(url, data !== undefined ? {
    data,
    headers: { 'Content-Type': 'application/json' },
  } : undefined);
  return res.data;
}