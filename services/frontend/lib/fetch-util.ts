// Thin helpers that mirror the old app's @/lib/fetch-util API surface
// (fetchData / postData / patchData / putData / deleteData / postMultipart),
// implemented on top of the existing axios apiClient so the ported layout
// components keep their exact call sites.

import { apiClient } from '@/lib/api/client';

export const fetchData = async (path: string) => {
  const res = await apiClient.get(path);
  return res.data;
};

export const postData = async (path: string, data: unknown) => {
  const res = await apiClient.post(path, data);
  return res.data;
};

export const postMultipart = async (path: string, formData: FormData) => {
  const res = await apiClient.post(path, formData);
  return res.data;
};

export const putData = async (path: string, data: unknown) => {
  const res = await apiClient.put(path, data);
  return res.data;
};

export const updateData = putData;

export const patchData = async (path: string, data: unknown) => {
  const res = await apiClient.patch(path, data);
  return res.data;
};

export const deleteData = async (path: string) => {
  const res = await apiClient.delete(path);
  return res.data;
};

export { apiClient };
