/**
 * Discounts API Client
 * Handles preset discount configs, manager PIN verification, and audit logging.
 */

import apiClient from './client';

const api = {
  get:    (path: string, config?: any) => apiClient.get(`/discounts${path}`, config),
  post:   (path: string, data?: any, config?: any) => apiClient.post(`/discounts${path}`, data, config),
  patch:  (path: string, data?: any, config?: any) => apiClient.patch(`/discounts${path}`, data, config),
  delete: (path: string, config?: any) => apiClient.delete(`/discounts${path}`, config),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiscountConfig {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  requires_pin: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface DiscountConfigCreate {
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  requires_pin?: boolean;
}

export interface PinVerifyResult {
  authorized: boolean;
  manager_id: string;
  manager_name: string;
}

export interface ManagerOption {
  id: string;
  full_name: string;
  role: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

const discountsApi = {
  /** List all active preset discount configs. */
  listConfigs: async (activeOnly = true): Promise<DiscountConfig[]> => {
    const res = await api.get(`/configs?active_only=${activeOnly}`);
    return res.data;
  },

  /** Create a new preset discount (manager/admin only). */
  createConfig: async (data: DiscountConfigCreate): Promise<DiscountConfig> => {
    const res = await api.post('/configs', data);
    return res.data;
  },

  /** Update an existing preset discount (manager/admin only). */
  updateConfig: async (id: string, data: Partial<DiscountConfigCreate & { is_active: boolean }>): Promise<DiscountConfig> => {
    const res = await api.patch(`/configs/${id}`, data);
    return res.data;
  },

  /** Deactivate a preset discount (manager/admin only). */
  deleteConfig: async (id: string): Promise<void> => {
    await api.delete(`/configs/${id}`);
  },

  /** Verify a manager's PIN for custom discount authorization. */
  verifyPin: async (managerUserId: string, pin: string): Promise<PinVerifyResult> => {
    const res = await api.post('/verify-pin', { manager_user_id: managerUserId, pin });
    return res.data;
  },

  /** Get list of managers/admins for the PIN picker. */
  listManagers: async (): Promise<ManagerOption[]> => {
    const res = await api.get('/managers');
    return res.data;
  },

  /** Record a discount application in the audit log. */
  logAudit: async (data: {
    order_id?: string;
    order_number?: string;
    discount_config_id?: string;
    discount_type: string;
    discount_value?: number;
    discount_amount: number;
    reason?: string;
    scope: 'order' | 'item';
    item_name?: string;
    approved_by?: string;
  }): Promise<void> => {
    try {
      await api.post('/audit', data);
    } catch {
      // audit failures are non-critical
    }
  },

  /**
   * Calculate the actual KES discount amount from a config + subtotal.
   * Used client-side to show preview before submitting the order.
   */
  calculateDiscount: (config: DiscountConfig, subtotal: number): number => {
    if (config.discount_type === 'percentage') {
      return Math.round((subtotal * config.discount_value) / 100 * 100) / 100;
    }
    return Math.min(config.discount_value, subtotal);
  },
};

export default discountsApi;
