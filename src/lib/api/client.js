import axios from 'axios';
import { toast } from 'react-hot-toast';

// API Base URL - can be configured via environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Log request duration in development
    if (import.meta.env.DEV && response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`API ${response.config.method.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

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
              const { state } = JSON.parse(authStorage);
              if (state?.refreshToken) {
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                  refreshToken: state.refreshToken,
                });

                const { access_token } = response.data;

                // Update token in localStorage
                const updatedState = { ...state, token: access_token };
                localStorage.setItem(
                  'auth-storage',
                  JSON.stringify({ state: updatedState, version: 0 })
                );

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
          Object.values(data.errors).forEach((errorArray) => {
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

// API helper methods
export const api = {
  // GET request
  get: (url, config = {}) => {
    return apiClient.get(url, config);
  },

  // POST request
  post: (url, data, config = {}) => {
    return apiClient.post(url, data, config);
  },

  // PUT request
  put: (url, data, config = {}) => {
    return apiClient.put(url, data, config);
  },

  // PATCH request
  patch: (url, data, config = {}) => {
    return apiClient.patch(url, data, config);
  },

  // DELETE request
  delete: (url, config = {}) => {
    return apiClient.delete(url, config);
  },

  // Upload file (multipart/form-data)
  upload: (url, formData, config = {}) => {
    return apiClient.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
    });
  },
};

export default apiClient;
