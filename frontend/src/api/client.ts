import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from './types';

export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * The access token lives only in memory (never localStorage) to limit the blast radius of
 * an XSS bug (Plan §10). The refresh token is an httpOnly cookie the browser handles.
 */
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

/** AuthContext registers what to do when a refresh finally fails (clear user → /login). */
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/**
 * One in-flight refresh shared by every caller: N simultaneous 401s (or React StrictMode's
 * double-mounted effects) trigger exactly one POST /auth/refresh (Plan §13, FE-002). This
 * matters doubly because the server treats a second use of a rotated token as theft.
 */
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= axios
    .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, null, { withCredentials: true })
    .then(({ data }) => {
      tokenStore.set(data.accessToken);
      return data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = AUTH_ENDPOINTS.some((p) => original?.url?.startsWith(p));

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original as AxiosRequestConfig); // replay the original request once
      } catch {
        tokenStore.set(null);
        onSessionExpired?.();
      }
    }
    return Promise.reject(error);
  },
);

// ───────────────────────────── Error helpers ─────────────────────────────

export function isApiError(err: unknown): err is AxiosError<ApiErrorBody> {
  return axios.isAxiosError(err) && !!(err.response?.data as ApiErrorBody | undefined)?.error;
}

/** Human-readable message for any thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isApiError(err)) return err.response!.data.error.message;
  if (axios.isAxiosError(err) && !err.response) return 'Cannot reach the server. Check your connection.';
  return fallback;
}

export function errorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (!isApiError(err)) return {};
  const out: Record<string, string> = {};
  for (const d of err.response!.data.error.details ?? []) out[d.field] ??= d.message;
  return out;
}
