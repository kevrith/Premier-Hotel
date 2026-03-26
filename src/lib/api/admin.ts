/**
 * Admin API Client
 * Handles all administrative operations (user management, etc.)
 */

import apiClient from './client';

// All requests go through the offline-aware apiClient.
// Paths must include the /admin prefix since apiClient's baseURL is /api/v1.
const api = {
  get:    (path: string, config?: any) => apiClient.get(`/admin${path}`, config),
  post:   (path: string, data?: any, config?: any) => apiClient.post(`/admin${path}`, data, config),
  put:    (path: string, data?: any, config?: any) => apiClient.put(`/admin${path}`, data, config),
  patch:  (path: string, data?: any, config?: any) => apiClient.patch(`/admin${path}`, data, config),
  delete: (path: string, config?: any) => apiClient.delete(`/admin${path}`, config),
};

// ============================================
// Types
// ============================================

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  role: 'customer' | 'waiter' | 'chef' | 'cleaner' | 'manager' | 'admin';
}

export interface UserUpdate {
  full_name?: string;
  phone_number?: string;
  role?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: string;
  created_at: string;
}

// ============================================
// Admin API Service
// ============================================

class AdminAPIService {
  /**
   * Create a new user account
   */
  async createUser(userData: UserCreate): Promise<User> {
    try {
      console.log('API client: Creating user with data:', userData);
      console.log('API client: Using cookie-based authentication');
      console.log('API client: Base URL:', api.defaults.baseURL);

      const response = await api.post<User>('/users', userData);
      console.log('API client: Response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API client: Error response:', error.response);
      console.error('API client: Error status:', error.response?.status);
      console.error('API client: Error data:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Failed to create user');
    }
  }

  /**
   * List all users with optional role filtering
   */
  async listUsers(role?: string, skip = 0, limit = 100): Promise<User[]> {
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      const response = await api.get<User[]>(`/users?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch users');
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUser(userId: string): Promise<User> {
    try {
      const response = await api.get<User>(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch user');
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<{ message: string }> {
    try {
      const response = await api.patch(`/users/${userId}/role`, null, {
        params: { role },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update role');
    }
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId: string, permissions: string[]): Promise<{ message: string }> {
    try {
      const response = await api.patch(`/users/${userId}/permissions`, permissions);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update permissions');
    }
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to deactivate user');
    }
  }
}

export const adminAPI = new AdminAPIService();
export default adminAPI;
