import { api } from '../client';

/**
 * User Management API Service
 * Handles user and staff management API calls
 */

const userService = {
  /**
   * Get all users (Admin only)
   * @param {Object} params - Query parameters (role, status, search, page, limit)
   * @returns {Promise} - List of users
   */
  getAllUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  /**
   * Get user by ID (Admin/Manager)
   * @param {string} userId - User ID
   * @returns {Promise} - User details
   */
  getUserById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user (Admin only)
   * @param {Object} userData - User data
   * @returns {Promise} - Created user
   */
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  /**
   * Update user (Admin/Manager)
   * @param {string} userId - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise} - Updated user
   */
  updateUser: async (userId, userData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  /**
   * Delete user (Admin only)
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  /**
   * Update user status (Admin)
   * @param {string} userId - User ID
   * @param {string} status - Status (active, inactive, suspended)
   * @returns {Promise} - Updated user
   */
  updateUserStatus: async (userId, status) => {
    const response = await api.patch(`/users/${userId}/status`, { status });
    return response.data;
  },

  /**
   * Update user role (Admin only)
   * @param {string} userId - User ID
   * @param {string} role - Role (customer, chef, waiter, cleaner, manager, admin)
   * @returns {Promise} - Updated user
   */
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Get user activity log (Admin)
   * @param {string} userId - User ID
   * @param {Object} params - Query parameters (page, limit)
   * @returns {Promise} - Activity log
   */
  getUserActivity: async (userId, params = {}) => {
    const response = await api.get(`/users/${userId}/activity`, { params });
    return response.data;
  },

  /**
   * Get staff members (Manager/Admin)
   * @param {Object} params - Query parameters (role, status)
   * @returns {Promise} - List of staff
   */
  getStaff: async (params = {}) => {
    const response = await api.get('/users/staff', { params });
    return response.data;
  },

  /**
   * Get staff performance (Manager/Admin)
   * @param {string} staffId - Staff member ID
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise} - Performance metrics
   */
  getStaffPerformance: async (staffId, params = {}) => {
    const response = await api.get(`/users/staff/${staffId}/performance`, { params });
    return response.data;
  },

  /**
   * Get customer statistics (Admin/Manager)
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise} - Customer statistics
   */
  getCustomerStats: async (params = {}) => {
    const response = await api.get('/users/customers/stats', { params });
    return response.data;
  },

  /**
   * Upload user avatar
   * @param {string} userId - User ID
   * @param {FormData} formData - Form data with avatar image
   * @returns {Promise} - Updated user with avatar URL
   */
  uploadAvatar: async (userId, formData) => {
    const response = await api.upload(`/users/${userId}/avatar`, formData);
    return response.data;
  },
};

export default userService;
