/**
 * Secure API Client with Cookie-Based Authentication
 * SECURITY: Uses httpOnly cookies instead of localStorage tokens (XSS protection)
 * REPLACES: client.ts localStorage-based token handling
 *
 * @module api/client.secure
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toastManager as toast } from '@/lib/toastManager';
import type { ApiResponse } from '@/types';

/**
 * Extended Axios config with metadata for request tracking
 */
interface RequestConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: Date;
  };
  _retry?: boolean;
}

/**
 * API Base URL - can be configured via environment variables
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Create axios instance with secure cookie-based authentication
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  // CRITICAL SECURITY FIX: Enable sending cookies with requests
  withCredentials: true, // Allows httpOnly cookies to be sent
});

/**
 * Request interceptor - Add metadata and prepare request
 * SECURITY: No token handling needed - cookies automatically sent
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add request timestamp for debugging
    const configWithMetadata = config as RequestConfigWithMetadata;
    configWithMetadata.metadata = { startTime: new Date() };

    // SECURITY: Tokens automatically sent via httpOnly cookies
    // No manual Authorization header needed
    // No localStorage access

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally and token refresh
 * Handles automatic token refresh using httpOnly refresh cookie
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log request duration in development
    const config = response.config as RequestConfigWithMetadata;
    if (import.meta.env.DEV && config.metadata && process.env.NODE_ENV === 'development') {
      const duration = new Date().getTime() - config.metadata.startTime.getTime();
      const method = config.method?.toUpperCase() || 'UNKNOWN';
      console.log(`API ${method} ${config.url} - ${duration}ms`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config as RequestConfigWithMetadata;

    if (!error.response) {
      toast.error('Network unavailable. Please check your connection and try again.', { id: 'network-error' });
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    switch (status) {
      case 401: {
        const skipRefreshEndpoints = ['/auth/me', '/auth/refresh', '/auth/login', '/auth/register'];
        const requestUrl = originalRequest?.url || '';
        const shouldSkipRefresh = skipRefreshEndpoints.some(ep => requestUrl.includes(ep));

        if (shouldSkipRefresh) {
          return Promise.reject(error);
        }

        if (!originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            );
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Let AuthContext handle the redirect and cleanup
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            toast.error('Your session has expired. Please sign in to continue.', { id: 'session-expired' });
            return Promise.reject(refreshError);
          }
        }

        // Already retried — session cannot be recovered
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        toast.error('Your session has expired. Please sign in to continue.', { id: 'session-expired' });
        break;
      }

      case 403:
        toast.error('Access denied. You don\'t have permission to perform this action.', { id: 'forbidden' });
        break;

      case 404:
        toast.error(data?.message || 'The requested resource was not found.');
        break;

      case 422:
        if (data?.errors) {
          Object.values<string[]>(data.errors).forEach((errorArray) => {
            errorArray.forEach((msg) => toast.error(msg));
          });
        } else {
          toast.error(data?.message || 'Validation failed. Please review your input.');
        }
        break;

      case 429:
        toast.error('Request limit reached. Please wait a moment before trying again.', { id: 'rate-limit' });
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        toast.error('A server error occurred. Please try again.', { id: 'server-error' });
        break;

      default:
        toast.error(data?.message || 'An unexpected error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

/**
 * API helper methods with TypeScript generics for type-safe requests
 * SECURITY: All methods automatically include httpOnly cookies
 */
export const api = {
  /**
   * GET request
   * @template T - The expected response data type
   * @param url - The endpoint URL
   * @param config - Optional Axios config
   * @returns Promise with typed response
   */
  get: <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.get<ApiResponse<T>>(url, config);
  },

  /**
   * POST request
   * @template T - The expected response data type
   * @param url - The endpoint URL
   * @param data - Request payload
   * @param config - Optional Axios config
   * @returns Promise with typed response
   */
  post: <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.post<ApiResponse<T>>(url, data, config);
  },

  /**
   * PUT request
   * @template T - The expected response data type
   * @param url - The endpoint URL
   * @param data - Request payload
   * @param config - Optional Axios config
   * @returns Promise with typed response
   */
  put: <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.put<ApiResponse<T>>(url, data, config);
  },

  /**
   * PATCH request
   * @template T - The expected response data type
   * @param url - The endpoint URL
   * @param data - Request payload
   * @param config - Optional Axios config
   * @returns Promise with typed response
   */
  patch: <T = any>(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.patch<ApiResponse<T>>(url, data, config);
  },

  /**
   * DELETE request
   * @template T - The expected response data type
   * @param url - The endpoint URL
   * @param config - Optional Axios config
   * @returns Promise with typed response
   */
  delete: <T = any>(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.delete<ApiResponse<T>>(url, config);
  },

  /**
   * Upload file (multipart/form-data)
   * @template T - The expected response data type
   * @param url - The endpoint URL
   * @param formData - FormData object with files
   * @param config - Optional Axios config
   * @returns Promise with typed response
   */
  upload: <T = any>(url: string, formData: FormData, config: AxiosRequestConfig = {}): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
    });
  },
};

export default apiClient;
