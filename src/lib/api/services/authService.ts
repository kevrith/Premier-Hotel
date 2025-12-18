/**
 * Authentication API Service
 * Handles all authentication-related API calls with full TypeScript support
 *
 * @module api/services/authService
 */

import { api } from '../client';
import type { User, LoginCredentials, RegisterData, ApiResponse } from '@/types';

/**
 * Login response data
 */
interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * Token refresh response
 */
interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Profile update payload
 */
interface ProfileUpdateData {
  full_name?: string;
  phone?: string;
  email?: string;
}

/**
 * Password change payload
 */
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Authentication Service
 * Provides methods for user authentication and profile management
 */
const authService = {
  /**
   * Login user with email and password
   * @param email - User email address
   * @param password - User password
   * @returns Promise with user data and authentication tokens
   * @throws {Error} If login fails
   *
   * @example
   * ```typescript
   * const result = await authService.login('user@example.com', 'password123');
   * console.log(result.user.email); // user@example.com
   * ```
   */
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register new user account
   * @param userData - User registration data including email, password, name, phone
   * @returns Promise with new user data and authentication tokens
   * @throws {Error} If registration fails (email exists, validation errors, etc.)
   *
   * @example
   * ```typescript
   * const result = await authService.register({
   *   email: 'newuser@example.com',
   *   password: 'securepass123',
   *   full_name: 'John Doe',
   *   phone: '+254712345678'
   * });
   * ```
   */
  register: async (userData: RegisterData): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<LoginResponse>('/auth/register', userData);
    return response.data;
  },

  /**
   * Logout current user
   * Invalidates the current session and tokens
   * @returns Promise resolving when logout is complete
   *
   * @example
   * ```typescript
   * await authService.logout();
   * // User is now logged out
   * ```
   */
  logout: async (): Promise<ApiResponse<void>> => {
    const response = await api.post<void>('/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns Promise with new access token
   * @throws {Error} If refresh token is invalid or expired
   *
   * @example
   * ```typescript
   * const result = await authService.refreshToken('refresh_token_here');
   * console.log(result.access_token); // New access token
   * ```
   */
  refreshToken: async (refreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> => {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current authenticated user profile
   * Requires valid authentication token
   * @returns Promise with current user profile data
   * @throws {Error} If not authenticated
   *
   * @example
   * ```typescript
   * const result = await authService.getCurrentUser();
   * console.log(result.user.role); // 'customer', 'admin', etc.
   * ```
   */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Update current user profile
   * @param data - Profile fields to update (full_name, phone, email)
   * @returns Promise with updated user data
   * @throws {Error} If update fails or validation errors
   *
   * @example
   * ```typescript
   * const result = await authService.updateProfile({
   *   full_name: 'Jane Doe',
   *   phone: '+254798765432'
   * });
   * ```
   */
  updateProfile: async (data: ProfileUpdateData): Promise<ApiResponse<User>> => {
    const response = await api.patch<User>('/auth/profile', data);
    return response.data;
  },

  /**
   * Change user password
   * @param currentPassword - Current password for verification
   * @param newPassword - New password (must meet security requirements)
   * @returns Promise resolving when password is changed
   * @throws {Error} If current password is incorrect or new password is invalid
   *
   * @example
   * ```typescript
   * await authService.changePassword('oldpass123', 'newpass456');
   * // Password successfully changed
   * ```
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> => {
    const response = await api.post<void>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Request password reset email
   * Sends an email with password reset link to the user
   * @param email - User email address
   * @returns Promise resolving when reset email is sent
   * @throws {Error} If email doesn't exist or sending fails
   *
   * @example
   * ```typescript
   * await authService.forgotPassword('user@example.com');
   * // Reset email sent
   * ```
   */
  forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
    const response = await api.post<void>('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password using reset token
   * @param token - Password reset token from email
   * @param password - New password
   * @returns Promise resolving when password is reset
   * @throws {Error} If token is invalid or expired
   *
   * @example
   * ```typescript
   * await authService.resetPassword('token_from_email', 'newpassword123');
   * // Password successfully reset
   * ```
   */
  resetPassword: async (token: string, password: string): Promise<ApiResponse<void>> => {
    const response = await api.post<void>('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  /**
   * Verify email address using verification token
   * @param token - Email verification token from email
   * @returns Promise resolving when email is verified
   * @throws {Error} If token is invalid or already used
   *
   * @example
   * ```typescript
   * await authService.verifyEmail('verification_token');
   * // Email verified
   * ```
   */
  verifyEmail: async (token: string): Promise<ApiResponse<void>> => {
    const response = await api.post<void>('/auth/verify-email', { token });
    return response.data;
  },
};

export default authService;
