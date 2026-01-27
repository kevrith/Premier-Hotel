import api from './client';

export interface OrderModification {
  id: string;
  order_id: string;
  item_id?: string;
  modification_type: 'void' | 'reverse' | 'discount' | 'price_adjustment';
  reason: string;
  amount: number;
  approved_by: string;
  approved_at: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface VoidRequest {
  order_id: string;
  item_id?: string;
  reason: string;
  amount: number;
  manager_pin?: string;
}

export interface OrderHistory {
  id: string;
  order_id: string;
  action: string;
  details: string;
  performed_by: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuditTrail {
  id: string;
  action: string;
  entity_type: 'order' | 'item' | 'payment';
  entity_id: string;
  old_value?: any;
  new_value?: any;
  performed_by: string;
  performed_at: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
}

class OrderManagementService {
  async requestVoid(modification: VoidRequest): Promise<OrderModification> {
    const response = await api.post<OrderModification>('/orders/void-request', modification);
    return response.data;
  }

  async approveVoid(modificationId: string, managerPin: string): Promise<OrderModification> {
    const response = await api.post<OrderModification>(`/orders/void-approve/${modificationId}`, {
      manager_pin: managerPin
    });
    return response.data;
  }

  async rejectVoid(modificationId: string, reason: string): Promise<OrderModification> {
    const response = await api.post<OrderModification>(`/orders/void-reject/${modificationId}`, {
      reason
    });
    return response.data;
  }

  async getPendingModifications(): Promise<OrderModification[]> {
    const response = await api.get<OrderModification[]>('/orders/modifications/pending');
    return response.data;
  }

  async getOrderHistory(orderId: string): Promise<OrderHistory[]> {
    const response = await api.get<OrderHistory[]>(`/orders/${orderId}/history`);
    return response.data;
  }

  async getAuditTrail(filters?: {
    start_date?: string;
    end_date?: string;
    entity_type?: string;
    performed_by?: string;
  }): Promise<AuditTrail[]> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.performed_by) params.append('performed_by', filters.performed_by);

    const response = await api.get<AuditTrail[]>(`/audit/trail?${params.toString()}`);
    return response.data;
  }

  async getVoidStatistics(filters: {
    start_date: string;
    end_date: string;
  }): Promise<{
    total_voids: number;
    approved_voids: number;
    rejected_voids: number;
    total_amount: number;
    avg_processing_time: number;
    voids_by_employee: Array<{
      employee_id: string;
      employee_name: string;
      void_count: number;
      total_amount: number;
    }>;
  }> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);

    const response = await api.get(`/orders/void-statistics?${params.toString()}`);
    return response.data;
  }

  async reverseOrder(orderId: string, reason: string, managerPin: string): Promise<{
    success: boolean;
    message: string;
    transaction_id?: string;
  }> {
    const response = await api.post(`/orders/${orderId}/reverse`, {
      reason,
      manager_pin: managerPin
    });
    return response.data;
  }
}

export const orderManagementService = new OrderManagementService();