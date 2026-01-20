/**
 * Purchase Orders API Client
 * Complete enterprise purchase order management
 */

import apiClient from './client';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  status: 'active' | 'inactive' | 'blocked';
  rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  inventory_item_id: string;
  quantity_ordered: number;
  unit_cost: number;
  quantity_received: number;
  quantity_pending: number;
  line_subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  line_total: number;
  quality_status?: 'good' | 'damaged' | 'rejected';
  notes?: string;
  created_at: string;
  inventory_items?: {
    id: string;
    name: string;
    sku?: string;
    unit_of_measure: string;
    current_stock: number;
  };
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  shipping_cost?: number;
  total: number;
  payment_status: 'pending' | 'partial' | 'paid';
  payment_due_date?: string;
  amount_paid: number;
  notes?: string;
  terms?: string;
  created_by_user_id?: string;
  approved_by_user_id?: string;
  received_by_user_id?: string;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier;
  purchase_order_items?: PurchaseOrderItem[];
}

export interface GoodsReceivedNote {
  id: string;
  grn_number: string;
  po_id?: string;
  supplier_id?: string;
  receipt_date: string;
  received_by_user_id?: string;
  inspection_status?: 'passed' | 'failed' | 'partial';
  quality_notes?: string;
  total_items_ordered?: number;
  total_items_received?: number;
  total_items_damaged?: number;
  total_items_rejected?: number;
  notes?: string;
  created_at: string;
  purchase_orders?: PurchaseOrder;
  suppliers?: Supplier;
}

export interface PurchaseOrderStats {
  total_pos: number;
  draft_pos: number;
  approved_pos: number;
  sent_pos: number;
  received_pos: number;
  cancelled_pos: number;
  total_value: number;
  total_paid: number;
  outstanding_payments: number;
  pending_deliveries: PurchaseOrder[];
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  rating?: number;
  notes?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  status?: 'active' | 'inactive' | 'blocked';
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  expected_delivery_date?: string;
  payment_due_date?: string;
  tax_amount?: number;
  discount_amount?: number;
  shipping_cost?: number;
  notes?: string;
  terms?: string;
  items: {
    inventory_item_id: string;
    quantity_ordered: number;
    unit_cost: number;
    discount_percentage?: number;
    discount_amount?: number;
    notes?: string;
  }[];
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  expected_delivery_date?: string;
  payment_due_date?: string;
  tax_amount?: number;
  discount_amount?: number;
  shipping_cost?: number;
  notes?: string;
  terms?: string;
  items?: {
    id?: string;
    inventory_item_id: string;
    quantity_ordered: number;
    unit_cost: number;
    discount_percentage?: number;
    discount_amount?: number;
    notes?: string;
  }[];
}

export interface ReceiveGoodsRequest {
  items: {
    po_item_id: string;
    quantity_received: number;
    quality_status: 'good' | 'damaged' | 'rejected';
    notes?: string;
  }[];
  inspection_status: 'passed' | 'failed' | 'partial';
  quality_notes?: string;
  notes?: string;
}

export interface RecordPaymentRequest {
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

// =====================================================
// API FUNCTIONS
// =====================================================

export const purchaseOrdersService = {
  // =====================================================
  // SUPPLIERS
  // =====================================================

  /**
   * Get all suppliers
   */
  async getSuppliers(params?: {
    status?: 'active' | 'inactive' | 'blocked';
    search?: string;
  }): Promise<Supplier[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const url = `/purchase-orders/suppliers${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ suppliers: Supplier[] }>(url);
    return response.data.suppliers || [];
  },

  /**
   * Create a new supplier
   */
  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.post<Supplier>('/purchase-orders/suppliers', data);
    return response.data;
  },

  /**
   * Update supplier
   */
  async updateSupplier(id: string, data: UpdateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.patch<Supplier>(`/purchase-orders/suppliers/${id}`, data);
    return response.data;
  },

  // =====================================================
  // PURCHASE ORDERS
  // =====================================================

  /**
   * Get all purchase orders
   */
  async getPurchaseOrders(params?: {
    status?: string;
    supplier_id?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<PurchaseOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id);
    if (params?.from_date) queryParams.append('from_date', params.from_date);
    if (params?.to_date) queryParams.append('to_date', params.to_date);

    const url = `/purchase-orders/${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ purchase_orders: PurchaseOrder[] }>(url);
    return response.data.purchase_orders || [];
  },

  /**
   * Get single purchase order with items
   */
  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`);
    return response.data;
  },

  /**
   * Create new purchase order
   */
  async createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>('/purchase-orders/', data);
    return response.data;
  },

  /**
   * Update purchase order (draft only)
   */
  async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
    const response = await apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}`, data);
    return response.data;
  },

  /**
   * Approve purchase order
   */
  async approvePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/approve`, {});
    return response.data;
  },

  /**
   * Send purchase order to supplier
   */
  async sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/send`, {});
    return response.data;
  },

  /**
   * Cancel purchase order
   */
  async cancelPurchaseOrder(id: string, reason?: string): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { reason });
    return response.data;
  },

  // =====================================================
  // GOODS RECEIPT (GRN)
  // =====================================================

  /**
   * Receive goods (creates GRN and auto-updates inventory)
   */
  async receiveGoods(id: string, data: ReceiveGoodsRequest): Promise<GoodsReceivedNote> {
    const response = await apiClient.post<GoodsReceivedNote>(`/purchase-orders/${id}/receive`, data);
    return response.data;
  },

  /**
   * Get all GRNs
   */
  async getGRNs(params?: {
    from_date?: string;
    to_date?: string;
    supplier_id?: string;
  }): Promise<GoodsReceivedNote[]> {
    const queryParams = new URLSearchParams();
    if (params?.from_date) queryParams.append('from_date', params.from_date);
    if (params?.to_date) queryParams.append('to_date', params.to_date);
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id);

    const url = `/purchase-orders/grn${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<{ grns: GoodsReceivedNote[] }>(url);
    return response.data.grns || [];
  },

  // =====================================================
  // PAYMENT
  // =====================================================

  /**
   * Record payment for purchase order
   */
  async recordPayment(id: string, data: RecordPaymentRequest): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/record-payment`, data);
    return response.data;
  },

  // =====================================================
  // DASHBOARD & STATS
  // =====================================================

  /**
   * Get purchase order statistics
   */
  async getStats(): Promise<PurchaseOrderStats> {
    const response = await apiClient.get<PurchaseOrderStats>('/purchase-orders/dashboard/stats');
    return response.data;
  },
};
