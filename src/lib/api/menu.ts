// @ts-nocheck
/**
 * Menu API Client
 * Handles all menu-related operations
 */

import apiClient from './client';

// All requests go through the offline-aware apiClient.
// Paths must include the /menu prefix since apiClient's baseURL is /api/v1.
const api = {
  get:    (path: string, config?: any) => apiClient.get(`/menu${path}`, config),
  post:   (path: string, data?: any, config?: any) => apiClient.post(`/menu${path}`, data, config),
  put:    (path: string, data?: any, config?: any) => apiClient.put(`/menu${path}`, data, config),
  patch:  (path: string, data?: any, config?: any) => apiClient.patch(`/menu${path}`, data, config),
  delete: (path: string, config?: any) => apiClient.delete(`/menu${path}`, config),
};

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
  track_inventory?: boolean;
  stock_quantity?: number;
  reorder_level?: number;
  unit?: string;
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
  track_inventory?: boolean;
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
      // Bust the menu items cache so the new item appears immediately
      try {
        const { dbHelpers } = await import('../db/schema');
        await dbHelpers.deleteCachedDataByPrefix('/menu/items');
      } catch { /* non-fatal */ }
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
      // Invalidate the menu items GET cache so the next load reflects the change
      try {
        const { dbHelpers } = await import('../db/schema');
        await dbHelpers.deleteCachedDataByPrefix('/menu/items');
      } catch { /* non-fatal */ }
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
      // Invalidate cache on delete too
      try {
        const { dbHelpers } = await import('../db/schema');
        await dbHelpers.deleteCachedDataByPrefix('/menu/items');
      } catch { /* non-fatal */ }
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
