/**
 * Authentication API Service
 * Handles all authentication-related API calls to the backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for auth
});

// Add request interceptor to attach token
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for token refresh
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return authApi(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
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
export const refreshAccessToken = async (refreshToken: string) => {
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  return response.data;
};

/**
 * Get Current User Profile
 */
export const getCurrentUser = async () => {
  const response = await authApi.get('/me');
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
    // Clear tokens regardless of API response
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export default authApi;
