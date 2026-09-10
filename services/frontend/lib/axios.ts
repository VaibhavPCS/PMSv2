import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { mapApiPath } from "./api/path-map";
import { normalizeIds } from "./api/normalize-ids";

const api = axios.create({
  // Same-origin gateway (:3000); the request interceptor maps old paths to /api/v1/*.
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  // Do not set global Content-Type or Cache-Control to avoid unnecessary CORS preflights
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Translate old-monolith resource paths to the new /api/v1 gateway contract.
  if (config.url) config.url = mapApiPath(config.url);
  if (typeof window === "undefined") {
    return config;
  }
  const currentWorkspaceId = localStorage.getItem("currentWorkspaceId");
  // Always include workspace-id if available to ensure backend context
  if (currentWorkspaceId) {
    if (config.headers) {
      (config.headers as any)['workspace-id'] = currentWorkspaceId;
    } else {
      (config.headers as any) = { 'workspace-id': currentWorkspaceId };
    }
  }

  return config;
});

// Keep existing response interceptor and functions
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Additively inject `_id` from the backend's `id` so the ported frontend's
    // _id-based keys / URL building / nested reads keep working.
    if (response.data && typeof response.data === 'object') {
      response.data = normalizeIds(response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    if (typeof window !== "undefined") {
      if (error.response && error.response.status === 401) {
        window.dispatchEvent(new Event("force-logout"));
      }
      // Surface network/CORS errors more clearly
      if (!error.response) {
        // Axios network error (e.g., CORS/preflight failure, DNS, SSL)
        window.dispatchEvent(new CustomEvent('network-error', { detail: { message: error.message } }));
      }
    }
    return Promise.reject(error);
  }
);

// ✅ ALL API METHODS USING AXIOS
const postData = async <T = any>(url: string, data: unknown): Promise<T> => {
  const response = await api.post(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

// Multipart/form-data post helper for file uploads
const postMultipart = async <T = any>(url: string, formData: FormData): Promise<T> => {
  const response = await api.post(url, formData, {
    // Let axios/browser set the correct Content-Type with boundary
    headers: {},
  });
  return response.data;
};

const putData = async <T = any>(url: string, data: unknown): Promise<T> => {
  const response = await api.put(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const updateData = async <T = any>(url: string, data: unknown): Promise<T> => {
  const response = await api.put(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const fetchData = async <T = any>(url: string): Promise<T> => {
  const response = await api.get<T>(url, {
    // Keep GET simple to minimize preflights
    headers: { 'Accept': 'application/json' },
  });
  return response.data;
};

// ✅ CLEAN: Single deleteData function using axios
const patchData = async <T = any>(url: string, data: unknown = {}): Promise<T> => {
  const response = await api.patch(url, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

const deleteData = async <T = any>(url: string, data?: unknown): Promise<T> => {
  // Support sending a JSON body with DELETE when needed (e.g., memberId)
  const response = await api.delete(url, data !== undefined ? {
    data,
    headers: { 'Content-Type': 'application/json' },
  } : undefined);
  return response.data;
};

export const apiClient = api;

export { postData, postMultipart, putData, updateData, patchData, fetchData, deleteData };
