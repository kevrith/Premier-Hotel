/**
 * Inventory Management API Client - v2.0 UPDATED
 */

import apiClient from './client';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  rating?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  max_quantity?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  unit_cost: number;
  selling_price?: number;
  location?: string;
  barcode?: string;
  expiry_tracking: boolean;
  is_active: boolean;
  last_restocked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return' | 'damage' | 'expired';
  quantity: number;
  previous_quantity?: number;
  new_quantity?: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  reason?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_terms?: string;
  delivery_address?: string;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  tax_rate: number;
  discount_percent: number;
  line_total: number;
  notes?: string;
  created_at: string;
}

export interface StockAlert {
  id: string;
  item_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring_soon' | 'expired';
  alert_level: 'info' | 'warning' | 'critical';
  message: string;
  current_quantity?: number;
  threshold_quantity?: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface InventoryStatistics {
  total_items: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  expiring_soon_items: number;
  expired_items: number;
  by_category: Record<string, { count: number; value: number }>;
  recent_movements: StockMovement[];
}

export interface LowStockItem {
  item_id: string;
  sku: string;
  name: string;
  current_quantity: number;
  min_quantity: number;
  reorder_point?: number;
  unit: string;
  category?: string;
  supplier?: string;
}

export interface InventoryValuation {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
  category?: string;
}

export interface TurnoverRate {
  item_id: string;
  sku: string;
  name: string;
  category?: string;
  total_sold: number;
  avg_inventory: number;
  turnover_ratio: number;
  days_in_stock: number;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

export interface SeasonalVariation {
  item_id: string;
  sku: string;
  name: string;
  month: number;
  year: number;
  avg_quantity: number;
  peak_quantity: number;
  low_quantity: number;
  usage_trend: 'increasing' | 'decreasing' | 'stable';
  seasonal_index: number;
}

export interface InventoryAnalytics {
  turnover_rates: TurnoverRate[];
  seasonal_variations: SeasonalVariation[];
  slow_moving_items: LowStockItem[];
  fast_moving_items: LowStockItem[];
  stock_accuracy: number;
  carrying_cost: number;
  stockout_rate: number;
}

export interface HistoricalStockItem {
  id: string;
  sku: string;
  name: string;
  category_id?: string;
  category_name: string;
  unit: string;
  current_quantity: number;
  historical_quantity: number;
  quantity_change: number;
  unit_cost: number;
  historical_value: number;
  movements_since: number;
}

export interface HistoricalStockSummary {
  total_items: number;
  total_historical_value: number;
  total_current_value: number;
  value_change: number;
  items_with_changes: number;
}

export interface HistoricalStockResponse {
  as_of_date: string;
  items: HistoricalStockItem[];
  summary: HistoricalStockSummary;
}

// =====================================================
// INVENTORY SERVICE CLASS
// =====================================================

class InventoryService {
  // ----- SUPPLIERS -----

  async getSuppliers(isActive?: boolean): Promise<Supplier[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('is_active', isActive.toString());

    const response = await apiClient.get<Supplier[]>(`/inventory/suppliers?${params.toString()}`);
    return response.data;
  }

  async getSupplier(supplierId: string): Promise<Supplier> {
    const response = await apiClient.get<Supplier>(`/inventory/suppliers/${supplierId}`);
    return response.data;
  }

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const response = await apiClient.post<Supplier>('/inventory/suppliers', data);
    return response.data;
  }

  async updateSupplier(supplierId: string, data: Partial<Supplier>): Promise<Supplier> {
    const response = await apiClient.patch<Supplier>(`/inventory/suppliers/${supplierId}`, data);
    return response.data;
  }

  // ----- CATEGORIES -----

  async getCategories(isActive?: boolean): Promise<InventoryCategory[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('is_active', isActive.toString());

    const response = await apiClient.get<InventoryCategory[]>(`/inventory/categories?${params.toString()}`);
    return response.data;
  }

  async createCategory(data: Partial<InventoryCategory>): Promise<InventoryCategory> {
    const response = await apiClient.post<InventoryCategory>('/inventory/categories', data);
    return response.data;
  }

  async updateCategory(categoryId: string, data: Partial<InventoryCategory>): Promise<InventoryCategory> {
    const response = await apiClient.patch<InventoryCategory>(`/inventory/categories/${categoryId}`, data);
    return response.data;
  }

  // ----- INVENTORY ITEMS -----

  async getItems(params?: {
    category_id?: string;
    is_active?: boolean;
    low_stock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<InventoryItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.category_id) queryParams.append('category_id', params.category_id);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.low_stock !== undefined) queryParams.append('low_stock', params.low_stock.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<InventoryItem[]>(`/inventory/items?${queryParams.toString()}`);
    return response.data;
  }

  async getItem(itemId: string): Promise<InventoryItem> {
    const response = await apiClient.get<InventoryItem>(`/inventory/items/${itemId}`);
    return response.data;
  }

  async createItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await apiClient.post<InventoryItem>('/inventory/items', data);
    return response.data;
  }

  async updateItem(itemId: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await apiClient.patch<InventoryItem>(`/inventory/items/${itemId}`, data);
    return response.data;
  }

  async deleteItem(itemId: string): Promise<void> {
    await apiClient.delete(`/inventory/items/${itemId}`);
  }

  // ----- STOCK MOVEMENTS -----

  async getMovements(params?: {
    item_id?: string;
    movement_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<StockMovement[]> {
    const queryParams = new URLSearchParams();
    if (params?.item_id) queryParams.append('item_id', params.item_id);
    if (params?.movement_type) queryParams.append('movement_type', params.movement_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<StockMovement[]>(`/inventory/movements?${queryParams.toString()}`);
    return response.data;
  }

  async createMovement(data: Partial<StockMovement>): Promise<StockMovement> {
    const response = await apiClient.post<StockMovement>('/inventory/movements', data);
    return response.data;
  }

  // ----- PURCHASE ORDERS -----

  async getPurchaseOrders(params?: {
    supplier_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<PurchaseOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<PurchaseOrder[]>(`/inventory/purchase-orders?${queryParams.toString()}`);
    return response.data;
  }

  async getPurchaseOrder(poId: string): Promise<PurchaseOrder> {
    const response = await apiClient.get<PurchaseOrder>(`/inventory/purchase-orders/${poId}`);
    return response.data;
  }

  async createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const response = await apiClient.post<PurchaseOrder>('/inventory/purchase-orders', data);
    return response.data;
  }

  async updatePurchaseOrder(poId: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const response = await apiClient.patch<PurchaseOrder>(`/inventory/purchase-orders/${poId}`, data);
    return response.data;
  }

  async approvePurchaseOrder(poId: string): Promise<PurchaseOrder> {
    const response = await apiClient.patch<PurchaseOrder>(`/inventory/purchase-orders/${poId}/approve`, {});
    return response.data;
  }

  // ----- PURCHASE ORDER ITEMS -----

  async getPOItems(poId: string): Promise<PurchaseOrderItem[]> {
    const response = await apiClient.get<PurchaseOrderItem[]>(`/inventory/purchase-orders/${poId}/items`);
    return response.data;
  }

  async addPOItem(poId: string, data: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem> {
    const response = await apiClient.post<PurchaseOrderItem>(`/inventory/purchase-orders/${poId}/items`, data);
    return response.data;
  }

  async updatePOItem(poId: string, itemId: string, data: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem> {
    const response = await apiClient.patch<PurchaseOrderItem>(
      `/inventory/purchase-orders/${poId}/items/${itemId}`,
      data
    );
    return response.data;
  }

  async deletePOItem(poId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/inventory/purchase-orders/${poId}/items/${itemId}`);
  }

  // ----- STOCK ALERTS -----

  async getAlerts(params?: {
    item_id?: string;
    alert_type?: string;
    is_acknowledged?: boolean;
    limit?: number;
  }): Promise<StockAlert[]> {
    const queryParams = new URLSearchParams();
    if (params?.item_id) queryParams.append('item_id', params.item_id);
    if (params?.alert_type) queryParams.append('alert_type', params.alert_type);
    if (params?.is_acknowledged !== undefined) queryParams.append('is_acknowledged', params.is_acknowledged.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<StockAlert[]>(`/inventory/alerts?${queryParams.toString()}`);
    return response.data;
  }

  async acknowledgeAlert(alertId: string): Promise<StockAlert> {
    const response = await apiClient.patch<StockAlert>(`/inventory/alerts/${alertId}/acknowledge`, {});
    return response.data;
  }

  // ----- STATISTICS & REPORTS -----

  async getStatistics(): Promise<InventoryStatistics> {
    const response = await apiClient.get<InventoryStatistics>('/inventory/statistics');
    return response.data;
  }

  async getLowStockReport(): Promise<LowStockItem[]> {
    const response = await apiClient.get<LowStockItem[]>('/inventory/reports/low-stock');
    return response.data;
  }

  async getValuationReport(): Promise<InventoryValuation[]> {
    const response = await apiClient.get<InventoryValuation[]>('/inventory/reports/valuation');
    return response.data;
  }

  async getTurnoverRates(params?: {
    start_date?: string;
    end_date?: string;
    category_id?: string;
  }): Promise<TurnoverRate[]> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.category_id) queryParams.append('category_id', params.category_id);

    const response = await apiClient.get<TurnoverRate[]>(`/inventory/reports/turnover?${queryParams.toString()}`);
    return response.data;
  }

  async getSeasonalVariations(params?: {
    item_id?: string;
    year?: number;
  }): Promise<SeasonalVariation[]> {
    const queryParams = new URLSearchParams();
    if (params?.item_id) queryParams.append('item_id', params.item_id);
    if (params?.year) queryParams.append('year', params.year.toString());

    const response = await apiClient.get<SeasonalVariation[]>(`/inventory/reports/seasonal?${queryParams.toString()}`);
    return response.data;
  }

  async getInventoryAnalytics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<InventoryAnalytics> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await apiClient.get<InventoryAnalytics>(`/inventory/analytics?${queryParams.toString()}`);
    return response.data;
  }

  // ----- HISTORICAL STOCK -----

  async getHistoricalStock(params: {
    as_of_date: string;
    category_id?: string;
  }): Promise<HistoricalStockResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('as_of_date', params.as_of_date);
    if (params.category_id) queryParams.append('category_id', params.category_id);

    const response = await apiClient.get<HistoricalStockResponse>(`/inventory/reports/historical-stock?${queryParams.toString()}`);
    return response.data;
  }
}

export const inventoryService = new InventoryService();
