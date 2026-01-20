/**
 * Menu API Client
 * Handles all menu-related operations
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Configure axios instance with cookie-based auth
const api = axios.create({
  baseURL: `${API_URL}/menu`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// ============================================
// Types
// ============================================

export type MenuCategory = 'appetizers' | 'starters' | 'mains' | 'desserts' | 'drinks' | 'beverages' | 'breakfast' | 'snacks';

export interface MenuItem {
  id: string;
  name: string;
  name_sw?: string;
  description?: string;
  description_sw?: string;
  category: MenuCategory;
  base_price: number;
  image_url?: string;
  dietary_info?: string[];
  customizations?: any[];
  preparation_time?: number;
  available: boolean;
  is_available: boolean;
  popular?: boolean;
  rating?: number;
  total_orders?: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemCreate {
  name: string;
  name_sw?: string;
  description?: string;
  description_sw?: string;
  category: MenuCategory;
  base_price: number;
  image_url?: string;
  dietary_info?: string[];
  customizations?: any[];
  preparation_time?: number;
  available?: boolean;
}

export interface MenuItemUpdate {
  name?: string;
  name_sw?: string;
  description?: string;
  description_sw?: string;
  category?: MenuCategory;
  base_price?: number;
  image_url?: string;
  dietary_info?: string[];
  customizations?: any[];
  preparation_time?: number;
  available?: boolean;
  popular?: boolean;
}

// ============================================
// Menu API Service
// ============================================

class MenuAPIService {
  /**
   * Get all menu items
   */
  async listMenuItems(category?: string): Promise<MenuItem[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);

      const response = await api.get<MenuItem[]>(`/items?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch menu items');
    }
  }

  /**
   * Get a specific menu item by ID
   */
  async getMenuItem(itemId: string): Promise<MenuItem> {
    try {
      const response = await api.get<MenuItem>(`/items/${itemId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch menu item');
    }
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(itemData: MenuItemCreate): Promise<MenuItem> {
    try {
      const response = await api.post<MenuItem>('/items', itemData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to create menu item');
    }
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(itemId: string, itemData: MenuItemUpdate): Promise<MenuItem> {
    try {
      const response = await api.put<MenuItem>(`/items/${itemId}`, itemData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update menu item');
    }
  }

  /**
   * Delete a menu item
   */
  async deleteMenuItem(itemId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/items/${itemId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete menu item');
    }
  }

  /**
   * Get menu categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get<string[]>('/categories');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch categories');
    }
  }
}

export const menuAPI = new MenuAPIService();
export default menuAPI;
