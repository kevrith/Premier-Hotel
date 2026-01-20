/**
 * Enhanced Admin API Client
 * Complete user lifecycle management with audit logging
 */

import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

// Configure axios instance with cookie-based auth
const api = axios.create({
  baseURL: `${API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token before redirecting
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          const refreshToken = parsed.state?.refreshToken;

          if (refreshToken) {
            // Try to refresh the token
            const refreshResponse = await axios.post(
              `${API_URL}/api/v1/auth/refresh`,
              { refresh_token: refreshToken },
              { withCredentials: true }
            );

            if (refreshResponse.data?.access_token) {
              // Update the token in localStorage
              parsed.state.token = refreshResponse.data.access_token;
              localStorage.setItem('auth-storage', JSON.stringify(parsed));

              // Retry the original request with new token
              const originalRequest = error.config;
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
              return api(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }

      // If refresh failed or no refresh token, redirect to login
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// Types
// ============================================

export interface UserCreate {
  email: string;
  password: string;
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
