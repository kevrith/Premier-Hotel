/**
 * API Client with Axios
 * Provides a configured axios instance with interceptors for authentication,
 * error handling, and request/response logging.
 *
 * @module api/client
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';
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
 * Auth storage structure
 */
interface AuthStorage {
  state: {
    token?: string;
    refreshToken?: string;
  };
  version: number;
}

/**
 * API Base URL - can be configured via environment variables
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Create axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (for cookie-based auth)
});

/**
 * Request interceptor - Add auth token to requests
 * Automatically attaches JWT token from localStorage to all requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Get token from localStorage
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed: AuthStorage = JSON.parse(authStorage);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }

    // Add request timestamp for debugging
    const configWithMetadata = config as RequestConfigWithMetadata;
    configWithMetadata.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 * Handles token refresh, error toasts, and request logging
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log request duration in development
    const config = response.config as RequestConfigWithMetadata;
    if (import.meta.env.DEV && config.metadata) {
      const duration = new Date().getTime() - config.metadata.startTime.getTime();
      const method = config.method?.toUpperCase() || 'UNKNOWN';
      console.log(`API ${method} ${config.url} - ${duration}ms`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config as RequestConfigWithMetadata;

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle different error status codes
    switch (status) {
      case 401:
        // Unauthorized - Token expired or invalid
        if (!originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
              const parsed: AuthStorage = JSON.parse(authStorage);
              if (parsed.state?.refreshToken) {
                const response = await axios.post<{ access_token: string }>(
                  `${API_BASE_URL}/auth/refresh`,
                  { refreshToken: parsed.state.refreshToken }
                );

                const { access_token } = response.data;

                // Update token in localStorage
                const updatedState: AuthStorage = {
                  state: { ...parsed.state, token: access_token },
                  version: 0,
                };
                localStorage.setItem('auth-storage', JSON.stringify(updatedState));

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return apiClient(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
            return Promise.reject(refreshError);
          }
        }

        // If retry failed or already retried, logout
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        break;

      case 403:
        // Forbidden - User doesn't have permission
        toast.error('You do not have permission to perform this action.');
        break;

      case 404:
        // Not found
        toast.error(data?.message || 'Resource not found.');
        break;

      case 422:
        // Validation error
        if (data?.errors) {
          // Display validation errors
          Object.values<string[]>(data.errors).forEach((errorArray) => {
            errorArray.forEach((msg) => toast.error(msg));
          });
        } else {
          toast.error(data?.message || 'Validation error.');
        }
        break;

      case 429:
        // Too many requests
        toast.error('Too many requests. Please try again later.');
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        toast.error('Server error. Please try again later.');
        break;

      default:
        // Generic error
        toast.error(data?.message || 'An error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

/**
 * API helper methods with TypeScript generics for type-safe requests
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
