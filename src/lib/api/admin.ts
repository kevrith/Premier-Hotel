/**
 * Admin API Client
 * Handles all administrative operations (user management, etc.)
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configure axios instance with cookie-based auth
const api = axios.create({
  baseURL: `${API_URL}/api/v1/admin`,
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
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on 401
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
