/**
 * Orders API Client
 * Handles all order-related API calls
 */
import apiClient from './client';

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
  special_instructions?: string;
}

export interface CreateOrderData {
  location: string;
  location_type: 'table' | 'room';
  items: OrderItem[];
  special_instructions?: string;
}

export interface UpdateOrderStatusData {
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  notes?: string;
}

export interface UpdateOrderData {
  status?: string;
  assigned_waiter_id?: string;
  assigned_chef_id?: string;
  notes?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  location: string;
  location_type: string;
  status: string;
  items: any[];
  subtotal: number;
  tax: number;
  total_amount: number;
  priority: string;
  special_instructions?: string;
  notes?: string;
  assigned_waiter_id?: string;
  assigned_chef_id?: string;
  estimated_ready_time?: string;
  created_at: string;
  updated_at: string;
}

export const ordersApi = {
  /**
   * Get all orders (staff only)
   */
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
    location_type?: string;
  }): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.location_type) queryParams.append('location_type', params.location_type);

    const response = await apiClient.get(`/orders?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get current user's orders
   */
  getMyOrders: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/orders/my-orders?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get kitchen orders (chefs only)
   */
  getKitchenOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders/kitchen');
    return response.data;
  },

  /**
   * Get order by ID
   */
  getById: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Create a new order
   */
  create: async (orderData: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },

  /**
   * Update order status (staff only)
   */
  updateStatus: async (orderId: string, statusData: UpdateOrderStatusData): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${orderId}/status`, statusData);
    return response.data;
  },

  /**
   * Update order (staff only)
   */
  update: async (orderId: string, orderData: UpdateOrderData): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${orderId}`, orderData);
    return response.data;
  }
};

export default ordersApi;
