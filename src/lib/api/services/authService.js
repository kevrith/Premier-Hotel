import { api } from '../client';

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - User data and tokens
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - User data and tokens
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} - New access token
   */
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user profile
   * @returns {Promise} - User profile data
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Update user profile
   * @param {Object} data - Updated profile data
   * @returns {Promise} - Updated user data
   */
  updateProfile: async (data) => {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise}
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise}
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Promise}
   */
  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise}
   */
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },
};

export default authService;
