// @ts-nocheck
/**
 * Enhanced Admin API Client
 * Complete user lifecycle management with audit logging
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
  email?: string;
  password?: string;
  pin?: string;
  full_name: string;
  phone_number?: string;
  role: 'customer' | 'waiter' | 'chef' | 'cleaner' | 'manager' | 'owner' | 'admin';
}

export interface UserUpdate {
  full_name?: string;
  phone_number?: string;
  role?: string;
}

export interface UserDeactivate {
  reason: string;
  termination_date?: string;
  notes?: string;
}

export interface UserDelete {
  reason: string;
  confirmation: string; // Must be "DELETE"
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated' | 'deleted';
  created_at: string;
  last_login_at?: string;
  terminated_at?: string;
  termination_reason?: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  performed_by_user_id: string;
  performed_by_name?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  terminated_users: number;
  deleted_users: number;
  users_by_role: Record<string, number>;
  recent_signups: number;
  recent_terminations: number;
  users_created_this_month: number;
}

// ============================================
// Enhanced Admin API Service
// ============================================

class AdminAPIService {
  /**
   * Create a new user account
   */
  async createUser(userData: UserCreate): Promise<User> {
    try {
      const response = await api.post<User>('/users', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to create user');
    }
  }

  /**
   * List all users with optional filtering
   */
  async listUsers(
    role?: string,
    status?: string,
    skip = 0,
    limit = 100
  ): Promise<User[]> {
    try {
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (status) params.append('status', status);
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
   * Deactivate a user (soft delete)
   */
  async deactivateUser(
    userId: string,
    deactivationData: UserDeactivate
  ): Promise<{ message: string; user_id: string; terminated_at: string }> {
    try {
      const response = await api.put(`/users/${userId}/deactivate`, deactivationData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to deactivate user');
    }
  }

  /**
   * Reactivate a previously deactivated user
   */
  async reactivateUser(userId: string): Promise<{ message: string; user_id: string }> {
    try {
      const response = await api.put(`/users/${userId}/reactivate`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to reactivate user');
    }
  }

  /**
   * Permanently delete a user
   */
  async deleteUser(
    userId: string,
    deleteData: UserDelete
  ): Promise<{ message: string; user_id: string }> {
    try {
      const response = await api.delete(`/users/${userId}`, { data: deleteData });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete user');
    }
  }

  /**
   * Get audit log for a specific user
   */
  async getUserAuditLog(userId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      const response = await api.get<AuditLogEntry[]>(
        `/users/${userId}/audit-log?limit=${limit}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch audit log');
    }
  }

  /**
   * Get all audit logs with optional filtering
   */
  async getAllAuditLogs(action?: string, limit = 100): Promise<AuditLogEntry[]> {
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      params.append('limit', limit.toString());

      const response = await api.get<AuditLogEntry[]>(
        `/audit-log?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch audit logs');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const response = await api.get<UserStatistics>('/users/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch statistics');
    }
  }
}

export const adminAPI = new AdminAPIService();
export default adminAPI;
