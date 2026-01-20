/**
 * Secure Authentication API Service
 * SECURITY: Uses httpOnly cookies for token storage (XSS protection)
 * REPLACES: auth.ts localStorage-based authentication
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

// Create axios instance with cookie support
const authApi = axios.create({
  baseURL: `${API_V1}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  // CRITICAL SECURITY FIX: Enable sending cookies with requests
  withCredentials: true, // Allows httpOnly cookies to be sent/received
});

// SECURITY: No request interceptor needed - cookies sent automatically
// SECURITY: No localStorage token access

// Response interceptor only for error handling (token refresh happens in client.secure.ts)
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Let the main API client handle token refresh
    // This prevents duplicate refresh logic
    return Promise.reject(error);
  }
);

// ===== TYPE DEFINITIONS =====

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
  token: string;
  new_password: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  full_name: string;
  role: string;
  status: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  profile_picture?: string;
}

// SECURITY: Response no longer includes tokens (stored in httpOnly cookies)
export interface AuthResponse {
  user: User;
  message: string;
}

export interface CurrentUserResponse {
  user: User;
}

// ===== AUTHENTICATION ENDPOINTS =====

/**
 * Register with email
 * SECURITY: Tokens set in httpOnly cookies by backend
 */
export const registerWithEmail = async (data: RegisterEmailData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/register', data);
  return response.data;
};

/**
 * Register with phone
 * SECURITY: Tokens set in httpOnly cookies by backend
 */
export const registerWithPhone = async (data: RegisterPhoneData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/register', data);
  return response.data;
};

/**
 * Login with email
 * SECURITY: Tokens set in httpOnly cookies by backend
 */
export const loginWithEmail = async (data: LoginEmailData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/login', data);
  return response.data;
};

/**
 * Login with phone
 * SECURITY: Tokens set in httpOnly cookies by backend
 */
export const loginWithPhone = async (data: LoginPhoneData): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/login', data);
  return response.data;
};

/**
 * Logout
 * SECURITY: Clears httpOnly cookies on backend
 */
export const logout = async (): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/logout');
  return response.data;
};

/**
 * Get current authenticated user
 * SECURITY: Uses access token cookie
 */
export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  const response = await authApi.get<CurrentUserResponse>('/me');
  return response.data;
};

/**
 * Refresh access token
 * SECURITY: Uses refresh token cookie, sets new access token cookie
 */
export const refreshToken = async (): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/refresh');
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (data: Partial<User>): Promise<CurrentUserResponse> => {
  const response = await authApi.patch<CurrentUserResponse>('/me', data);
  return response.data;
};

// ===== VERIFICATION ENDPOINTS =====

/**
 * Verify OTP for email/phone verification
 */
export const verifyOTP = async (otp: string, type: 'email' | 'phone'): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>(`/verify-${type}`, {
    otp_code: otp,
  });
  return response.data;
};

/**
 * Resend OTP
 */
export const resendOTP = async (type: 'email' | 'phone'): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>(`/resend-${type}-otp`);
  return response.data;
};

/**
 * Send phone OTP
 */
export const sendPhoneOTP = async (data: SendOTPData): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/phone/send-otp', data);
  return response.data;
};

/**
 * Verify phone OTP
 */
export const verifyPhoneOTP = async (data: VerifyOTPData): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/phone/verify-otp', data);
  return response.data;
};

// ===== PASSWORD RESET ENDPOINTS =====

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/password-reset/request', {
    email,
  });
  return response.data;
};

/**
 * Confirm password reset with token
 */
export const confirmPasswordReset = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/password-reset/confirm', {
    token,
    new_password: newPassword,
  });
  return response.data;
};

/**
 * Reset forgotten password
 */
export const resetForgottenPassword = async (data: ForgotPasswordData): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/forgot-password', data);
  return response.data;
};

// ===== SOCIAL AUTH ENDPOINTS =====

/**
 * Social login (Google, Facebook, etc.)
 * SECURITY: Tokens set in httpOnly cookies by backend
 */
export const socialLogin = async (provider: string, accessToken: string): Promise<AuthResponse> => {
  const response = await authApi.post<AuthResponse>('/social-login', {
    provider,
    access_token: accessToken,
  });
  return response.data;
};

/**
 * Link social account to existing account
 */
export const linkSocialAccount = async (provider: string, accessToken: string): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/link-social', {
    provider,
    access_token: accessToken,
  });
  return response.data;
};

/**
 * Unlink social account
 */
export const unlinkSocialAccount = async (provider: string): Promise<{ message: string }> => {
  const response = await authApi.post<{ message: string }>('/unlink-social', {
    provider,
  });
  return response.data;
};

// Export the axios instance for advanced use cases
export default authApi;
