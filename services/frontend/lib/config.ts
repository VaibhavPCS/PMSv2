// Centralized API/base URL config (ported from old app/lib/config.ts).
// Vite's import.meta.env.VITE_* is replaced by Next's process.env.NEXT_PUBLIC_*.

import type { Socket } from 'socket.io-client';

export const getBackendBaseUrl = (): string => {
  const envApiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  // return 'https://pms.upda.co.in:5001';
  return 'http://localhost:5001';
};

export const getApiBaseUrl = (): string => {
  return `${getBackendBaseUrl()}/api-v1`;
};

/**
 * Build a complete API endpoint URL
 * @param endpoint - The API endpoint (e.g., '/task/123', '/comment')
 * @returns Complete URL for the API endpoint
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Build a complete backend URL (for file downloads, etc.)
 * @param path - The backend path (e.g., '/uploads/file.jpg')
 * @returns Complete URL for the backend resource
 */
export const buildBackendUrl = (path: string): string => {
  const baseUrl = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/** Socket.io server origin (no /api suffix). */
export const getSocketUrl = (): string => {
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:5000'
  );
};

/**
 * Disconnect a socket.io client WITHOUT the browser's
 * "WebSocket is closed before the connection is established" console warning.
 *
 * React StrictMode double-invokes effects in dev, so an effect's cleanup can run
 * while the socket handshake is still in flight — closing a CONNECTING WebSocket
 * is exactly what logs that warning. If the socket hasn't connected yet, defer
 * the close until it does (or until the attempt errors, which also stops
 * reconnection retries so we don't leak a background socket).
 */
export const gracefulSocketDisconnect = (socket: Socket | null | undefined): void => {
  if (!socket) return;
  socket.off();
  if (socket.connected) {
    socket.disconnect();
    return;
  }
  socket.once('connect', () => socket.disconnect());
  socket.once('connect_error', () => socket.disconnect());
};
