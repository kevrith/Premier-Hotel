/**
 * API Client with Axios
 * Offline-aware: queues mutations when offline, serves GETs from IndexedDB cache.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { toastManager as toast } from '@/lib/toastManager';
import type { ApiResponse } from '@/types';
import { db, dbHelpers } from '@/db/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata?: { startTime: Date };
  _retry?: boolean;
  _offlineQueued?: boolean; // marks requests we queued offline
}

interface AuthStorage {
  state: { token?: string; refreshToken?: string };
  version: number;
}

// ── API Base URL ──────────────────────────────────────────────────────────────

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000/api/v1`;
  }
  return envUrl || 'http://localhost:8000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

// ── Axios instance ────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Offline helpers ───────────────────────────────────────────────────────────

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function isMutation(method?: string): boolean {
  return MUTATION_METHODS.has((method ?? '').toLowerCase());
}

/**
 * URLs that must NEVER be queued offline — they require real-time server
 * processing and replaying them later could cause data corruption.
 */
const NO_OFFLINE_QUEUE_PATTERNS = [
  '/void',
  '/void-receipt',
  '/void-item',
  '/void-request',
  '/void-approve',
  '/void-reject',
  '/payments',
  '/bulk-cancel',
  '/reverse',
  '/auth/',
  '/location-stock/transfer',    // stock transfers must be real-time — queuing causes duplicate movements
  '/location-stock/adjust',      // stock adjustments are not safe to replay offline
  '/purchase-orders/direct-receive', // stock receiving updates inventory — must be real-time
  '/purchase-orders/',           // PO approval, send, cancel, receive — all real-time
  '/stock/receive',              // unified stock receive — real-time
  '/orders/end-of-day',          // EOD close — real-time only
  '/housekeeping/tasks/self-claim', // room claiming must be real-time — replay causes duplicate/stale tasks
];

function shouldQueueOffline(url: string): boolean {
  return !NO_OFFLINE_QUEUE_PATTERNS.some(p => url.includes(p));
}

/** Map a URL path to a logical entity type used by the sync processor */
function urlToEntityType(url: string): string {
  if (url.includes('/orders'))       return 'order';
  if (url.includes('/bookings'))     return 'booking';
  if (url.includes('/housekeeping')) return 'room_status';
  if (url.includes('/rooms'))        return 'room_status';
  if (url.includes('/payments'))     return 'payment';
  if (url.includes('/menu'))         return 'menu_item';
  return 'generic';
}

/** Higher priority = synced first (1 = critical) */
function urlToPriority(url: string): number {
  if (url.includes('/orders'))   return 1;
  if (url.includes('/payments')) return 1;
  if (url.includes('/bookings')) return 2;
  if (url.includes('/housekeeping') || url.includes('/rooms')) return 3;
  return 5;
}

/** Build an HTTP method → sync action mapping */
function methodToAction(method: string): string {
  const m = method.toLowerCase();
  if (m === 'post')   return 'create';
  if (m === 'delete') return 'delete';
  return 'update'; // put / patch
}

/**
 * Queue a failed mutation into IndexedDB so it can be replayed later.
 * Stores the full request details (url, method, body) so the sync
 * processor knows exactly what to re-send.
 */
async function queueOfflineMutation(config: RequestConfigWithMetadata): Promise<void> {
  const url    = config.url ?? '';
  const method = (config.method ?? 'post').toLowerCase();
  let   body   = config.data;

  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* keep as string */ }
  }

  await db.pendingSync.add({
    action:     methodToAction(method),
    entityType: urlToEntityType(url),
    data: {
      ...body,
      _url:    url,   // stored so the sync processor can re-issue the exact call
      _method: method,
    },
    timestamp:  new Date().toISOString(),
    priority:   urlToPriority(url),
    retryCount: 0,
  });
}

/**
 * Try to serve a GET response from the IndexedDB generic cache.
 * Returns null if nothing is cached or the entry is expired.
 */
async function getCachedGet(url: string): Promise<any | null> {
  try {
    return await dbHelpers.getCachedData(url);
  } catch {
    return null;
  }
}

/**
 * Store a successful GET response in the generic IndexedDB cache.
 * TTL defaults to 30 minutes; pass expiresInMinutes to override.
 */
async function cacheGetResponse(url: string, data: any, expiresInMinutes = 30): Promise<void> {
  try {
    await dbHelpers.setCachedData(url, data, expiresInMinutes);
  } catch { /* non-fatal */ }
}

// ── Request interceptor ───────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Attach JWT
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed: AuthStorage = JSON.parse(authStorage);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch { /* ignore */ }
    }

    const c = config as RequestConfigWithMetadata;
    c.metadata = { startTime: new Date() };
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    const config = response.config as RequestConfigWithMetadata;

    // Log timing in development
    if (import.meta.env.DEV && config.metadata) {
      const ms = Date.now() - config.metadata.startTime.getTime();
      console.log(`API ${(config.method ?? '').toUpperCase()} ${config.url} - ${ms}ms`);
    }

    // Cache successful GET responses for offline fallback
    if ((config.method ?? '').toLowerCase() === 'get' && config.url) {
      const ttl = config.url.includes('/menu') ? 24 * 60
                : config.url.includes('/rooms') ? 60
                : 30;
      // Build cache key that includes query params so date/filter changes aren't cached together
      const params = config.params;
      const cacheKey = params && Object.keys(params).length > 0
        ? `${config.url}?${new URLSearchParams(params).toString()}`
        : config.url;
      cacheGetResponse(cacheKey, response.data, ttl);
    }

    // Invalidate menu items cache after any successful mutation on a menu item
    const method = (config.method ?? '').toLowerCase();
    if (isMutation(method) && config.url?.includes('/menu/items')) {
      dbHelpers.deleteCachedDataByPrefix('/menu/items').catch(() => {});
    }

    return response;
  },

  async (error) => {
    const originalRequest = error.config as RequestConfigWithMetadata;

    // ── Network / offline error (no HTTP response received) ──────────────────
    if (!error.response) {
      const method = (originalRequest?.method ?? '').toLowerCase();
      const url    = originalRequest?.url ?? '';

      // MUTATIONS offline → queue & return synthetic 202 so the UI doesn't crash
      if (isMutation(method) && !originalRequest?._offlineQueued && shouldQueueOffline(url)) {
        try {
          await queueOfflineMutation(originalRequest);
          originalRequest._offlineQueued = true;

          // Dispatch event so the OfflineBanner updates its count
          window.dispatchEvent(new CustomEvent('offline:queued', { detail: { url, method } }));

          if (!navigator.onLine) {
            toast.info(`Saved offline — will sync when connected`, { id: 'offline-queued', icon: '📶' });
          }

          // Return a synthetic Axios-like response
          return Promise.resolve({
            data: {
              offline: true,
              queued:  true,
              tempId:  `offline_${Date.now()}`,
              message: 'Action saved offline. Will sync automatically when connected.',
            },
            status:     202,
            statusText: 'Queued Offline',
            headers:    {},
            config:     originalRequest,
            request:    error.request,
          } as AxiosResponse);
        } catch (queueError) {
          console.error('[Offline] Failed to queue mutation:', queueError);
        }
      }

      // GETs offline → try IndexedDB cache (match cache key including query params)
      if (method === 'get' && url) {
        const offlineParams = originalRequest?.params;
        const offlineCacheKey = offlineParams && Object.keys(offlineParams).length > 0
          ? `${url}?${new URLSearchParams(offlineParams).toString()}`
          : url;
        const cached = await getCachedGet(offlineCacheKey);
        if (cached) {
          return Promise.resolve({
            data:       cached,
            status:     200,
            statusText: 'OK (Cached)',
            headers:    {},
            config:     originalRequest,
            request:    error.request,
          } as AxiosResponse);
        }
      }

      // Still offline but nothing cached — show a non-intrusive message
      if (!navigator.onLine) {
        return Promise.reject(error); // OfflineBanner already tells the user
      }

      // Auth endpoint failures are handled by the login page — don't double-toast
      if (url.includes('/auth/')) {
        return Promise.reject(error);
      }

      // User is online but request failed — server may be temporarily unreachable
      // (e.g. cold start). Don't blame the user's connection.
      toast.error('Server temporarily unreachable. Please try again in a moment.', { id: 'network-error' });
      return Promise.reject(error);
    }

    // ── HTTP error responses ──────────────────────────────────────────────────
    const { status, data } = error.response;

    switch (status) {
      case 401:
        if (!navigator.onLine) return Promise.reject(error);

        // Don't fire session-expired for auth endpoints themselves
        if (originalRequest?.url?.includes('/auth/')) return Promise.reject(error);

        if (!originalRequest._retry) {
          originalRequest._retry = true;
          try {
            let refreshToken = '';
            try {
              const raw = localStorage.getItem('auth-storage');
              if (raw) refreshToken = JSON.parse(raw).state?.refreshToken || '';
            } catch { /* ignore */ }

            const refreshRes = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              refreshToken ? { refresh_token: refreshToken } : {},
              { withCredentials: true }
            );

            // Save new token and retry original request
            if (refreshRes.data?.access_token) {
              try {
                const raw = localStorage.getItem('auth-storage');
                const parsed = raw ? JSON.parse(raw) : { state: {} };
                parsed.state.token = refreshRes.data.access_token;
                parsed.state.refreshToken = refreshRes.data.refresh_token || refreshToken;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              } catch { /* ignore */ }
              originalRequest.headers.Authorization = `Bearer ${refreshRes.data.access_token}`;
            }
            return apiClient(originalRequest);
          } catch (refreshError: any) {
            // Only fire session-expired if refresh also got a real 401/403
            if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
              window.dispatchEvent(new CustomEvent('auth:session-expired'));
              toast.error('Your session has expired. Please sign in to continue.', { id: 'session-expired' });
            }
            return Promise.reject(refreshError);
          }
        }
        break;

      case 403:
        toast.error('Access denied. You don\'t have permission to perform this action.', { id: 'forbidden' });
        break;

      case 404:
        toast.error(data?.message || 'The requested resource was not found.');
        break;

      case 422:
        if (data?.errors) {
          Object.values<string[]>(data.errors).forEach(arr =>
            arr.forEach(msg => toast.error(msg))
          );
        } else {
          toast.error(data?.message || 'Validation failed. Please review your input.');
        }
        break;

      case 429:
        toast.error('Request limit reached. Please wait a moment before trying again.', { id: 'rate-limit' });
        break;

      case 500: case 502: case 503: case 504:
        toast.error('A server error occurred. Please try again.', { id: 'server-error' });
        break;

      default:
        toast.error(data?.message || 'An unexpected error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

// ── Helper methods ────────────────────────────────────────────────────────────

export const api = {
  get: <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.get<ApiResponse<T>>(url, config),

  post: <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.post<ApiResponse<T>>(url, data, config),

  put: <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.put<ApiResponse<T>>(url, data, config),

  patch: <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.patch<ApiResponse<T>>(url, data, config),

  delete: <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.delete<ApiResponse<T>>(url, config),

  upload: <T = any>(url: string, formData: FormData, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> =>
    apiClient.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: { 'Content-Type': 'multipart/form-data', ...config.headers },
    }),
};

export default apiClient;
