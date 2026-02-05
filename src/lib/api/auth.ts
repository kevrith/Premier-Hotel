/**
 * Authentication API Service
 * Handles all authentication-related API calls to the backend
 */

import axios from 'axios';

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for auth
});

// Add request interceptor - no need to manually set headers for cookie auth
authApi.interceptors.request.use(
  (config) => {
    // For cookie-based auth, cookies are sent automatically with withCredentials: true
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if a refresh is in progress to prevent concurrent refresh attempts
let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: any) => void; reject: (reason?: any) => void}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Add response interceptor for authentication errors
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for auth check endpoints - let them fail silently
    // This prevents infinite loops when checking if user is authenticated
    const skipRefreshEndpoints = ['/auth/me', '/auth/refresh'];
    const requestUrl = originalRequest?.url || '';
    const shouldSkipRefresh = skipRefreshEndpoints.some(endpoint =>
      requestUrl.includes(endpoint) || requestUrl.endsWith(endpoint.split('/').pop())
    );

    if (shouldSkipRefresh) {
      return Promise.reject(error);
    }

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return authApi(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // For cookie-based auth, try to refresh using the refresh endpoint
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true
        });

        processQueue();
        isRefreshing = false;

        // Retry original request
        return authApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;
        // Don't redirect here - let the application handle routing
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface RegisterEmailData {
  email: string;
  password: string;
  full_name: string;
}

export interface RegisterPhoneData {
  phone: string;
  password: string;
  full_name: string;
}

export interface LoginEmailData {
  email: string;
  password: string;
}

export interface LoginPhoneData {
  phone: string;
  password: string;
}

export interface VerifyOTPData {
  phone?: string;
  email?: string;
  otp_code?: string;
  token?: string;
}

export interface SendOTPData {
  phone: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  token: string;
  new_password: string;
}

export interface SocialAuthData {
  provider: 'google' | 'facebook' | 'apple';
  access_token: string;
  profile_data?: any;
}

/**
 * Register with Email
 */
export const registerWithEmail = async (data: RegisterEmailData) => {
  const response = await authApi.post('/register', data);
  return response.data;
};

/**
 * Register with Phone
 */
export const registerWithPhone = async (data: RegisterPhoneData) => {
  const response = await authApi.post('/register', data);
  return response.data;
};

/**
 * Login with Email
 */
export const loginWithEmail = async (data: LoginEmailData) => {
  const response = await authApi.post('/login', data);
  return response.data;
};

/**
 * Login with Phone
 */
export const loginWithPhone = async (data: LoginPhoneData) => {
  // For phone login, convert to email-style login for now
  // TODO: Implement phone-based auth in backend
  const response = await authApi.post('/login', data);
  return response.data;
};

/**
 * Send OTP to Phone
 */
export const sendOTP = async (data: SendOTPData) => {
  const response = await authApi.post('/send-otp', data);
  return response.data;
};

/**
 * Verify Phone OTP
 */
export const verifyPhoneOTP = async (data: VerifyOTPData) => {
  const response = await authApi.post('/verify-otp', data);
  return response.data;
};

/**
 * Verify Email Token/OTP
 */
export const verifyEmailOTP = async (data: VerifyOTPData) => {
  const response = await authApi.post('/verify-email', data);
  return response.data;
};

/**
 * Resend Verification (Email or Phone)
 */
export const resendVerification = async (data: { email?: string; phone?: string }) => {
  const response = await authApi.post('/resend-verification', data);
  return response.data;
};

/**
 * Forgot Password
 */
export const forgotPassword = async (data: ForgotPasswordData) => {
  const response = await authApi.post('/forgot-password', data);
  return response.data;
};

/**
 * Reset Password
 */
export const resetPassword = async (data: ResetPasswordData) => {
  const response = await authApi.post('/reset-password', data);
  return response.data;
};

/**
 * Social Authentication (Google, Facebook, etc.)
 */
export const socialAuth = async (data: SocialAuthData) => {
  const response = await authApi.post('/social-auth', data);
  return response.data;
};

/**
 * Refresh Access Token
 */
export const refreshAccessToken = async () => {
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
    withCredentials: true
  });
  return response.data;
};

/**
 * Refresh Token (alias for refreshAccessToken)
 */
export const refreshToken = async () => {
  // For cookie-based auth, this is handled by the backend automatically
  const response = await refreshAccessToken();
  return response;
};

/**
 * Get Current User Profile
 */
export const getCurrentUser = async () => {
  const response = await authApi.get('/me');
  return response.data;
};

/**
 * Update User Profile
 */
export const updateProfile = async (data: any) => {
  const response = await authApi.put('/me', data);
  return response.data;
};

/**
 * Verify OTP
 */
export const verifyOTP = async (otp: string, type: 'email' | 'phone') => {
  const data = type === 'email'
    ? { token: otp }
    : { otp_code: otp };
  
  const response = await authApi.post('/verify-otp', data);
  return response.data;
};

/**
 * Resend OTP
 */
export const resendOTP = async (type: 'email' | 'phone') => {
  const response = await authApi.post('/resend-verification', { type });
  return response.data;
};

/**
 * Request Password Reset
 */
export const requestPasswordReset = async (email: string) => {
  const response = await authApi.post('/forgot-password', { email });
  return response.data;
};

/**
 * Confirm Password Reset
 */
export const confirmPasswordReset = async (token: string, newPassword: string) => {
  const response = await authApi.post('/reset-password', { token, new_password: newPassword });
  return response.data;
};

/**
 * Social Login
 */
export const socialLogin = async (provider: string, accessToken: string) => {
  const response = await authApi.post('/social-auth', {
    provider,
    access_token: accessToken,
  });
  return response.data;
};

/**
 * Logout
 */
export const logout = async () => {
  try {
    await authApi.post('/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear any local storage tokens (if any were stored)
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export default authApi;
