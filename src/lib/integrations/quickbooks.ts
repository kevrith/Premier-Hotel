/**
 * QuickBooks POS 2013 Integration Service
 * Synchronizes inventory data with QuickBooks POS 2013
 */

import api from '../api/axios';
import type { InventoryItem, StockMovement, PurchaseOrder } from '../api/inventory';

export interface QuickBooksConfig {
  enabled: boolean;
  company_file: string;
  username?: string;
  sync_interval: number; // minutes
  last_sync?: string;
  auto_sync: boolean;
}

export interface SyncResult {
  success: boolean;
  items_synced: number;
  items_failed: number;
  movements_synced: number;
  errors: string[];
  timestamp: string;
}

export interface QuickBooksItem {
  ListID: string;
  Name: string;
  FullName: string;
  BarCodeValue?: string;
  QuantityOnHand: number;
  AverageCost: number;
  Price: number;
  ReorderPoint?: number;
  MaxQuantity?: number;
  IsActive: boolean;
  ItemType: string;
  LastModified: string;
}

export interface QuickBooksPurchaseOrder {
  TxnID: string;
  RefNumber: string;
  VendorRef: string;
  TxnDate: string;
  ExpectedDate?: string;
  ShipAddress?: string;
  Subtotal: number;
  TotalAmount: number;
  IsPending: boolean;
  IsFullyReceived: boolean;
}

class QuickBooksService {
  private syncInProgress = false;

  /**
   * Get QuickBooks configuration
   */
  async getConfig(): Promise<QuickBooksConfig> {
    const response = await api.get<QuickBooksConfig>('/integrations/quickbooks/config');
    return response.data;
  }

  /**
   * Update QuickBooks configuration
   */
  async updateConfig(config: Partial<QuickBooksConfig>): Promise<QuickBooksConfig> {
    const response = await api.patch<QuickBooksConfig>('/integrations/quickbooks/config', config);
    return response.data;
  }

  /**
   * Test QuickBooks connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    const response = await api.get('/integrations/quickbooks/test-connection');
    return response.data;
  }

  /**
   * Sync inventory from QuickBooks to system
   */
  async syncFromQuickBooks(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      const response = await api.post<SyncResult>('/integrations/quickbooks/sync/import');
      return response.data;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync inventory from system to QuickBooks
   */
  async syncToQuickBooks(itemIds?: string[]): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      const response = await api.post<SyncResult>('/integrations/quickbooks/sync/export', {
        item_ids: itemIds
      });
      return response.data;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Bi-directional sync (recommended)
   */
  async syncBidirectional(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      const response = await api.post<SyncResult>('/integrations/quickbooks/sync/bidirectional');
      return response.data;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get items from QuickBooks
   */
  async getQuickBooksItems(params?: {
    modified_since?: string;
    active_only?: boolean;
  }): Promise<QuickBooksItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.modified_since) queryParams.append('modified_since', params.modified_since);
    if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

    const response = await api.get<QuickBooksItem[]>(
      `/integrations/quickbooks/items?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get purchase orders from QuickBooks
   */
  async getQuickBooksPurchaseOrders(params?: {
    start_date?: string;
    end_date?: string;
    pending_only?: boolean;
  }): Promise<QuickBooksPurchaseOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.pending_only !== undefined) queryParams.append('pending_only', params.pending_only.toString());

    const response = await api.get<QuickBooksPurchaseOrder[]>(
      `/integrations/quickbooks/purchase-orders?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Map QuickBooks item to system inventory item
   */
  mapQuickBooksItemToInventory(qbItem: QuickBooksItem): Partial<InventoryItem> {
    return {
      sku: qbItem.BarCodeValue || qbItem.ListID,
      name: qbItem.Name,
      quantity: qbItem.QuantityOnHand,
      unit_cost: qbItem.AverageCost,
      selling_price: qbItem.Price,
      min_quantity: qbItem.ReorderPoint || 0,
      max_quantity: qbItem.MaxQuantity,
      is_active: qbItem.IsActive,
      barcode: qbItem.BarCodeValue
    };
  }

  /**
   * Map system inventory item to QuickBooks item
   */
  mapInventoryToQuickBooksItem(item: InventoryItem): Partial<QuickBooksItem> {
    return {
      Name: item.name,
      BarCodeValue: item.barcode || item.sku,
      QuantityOnHand: item.quantity,
      AverageCost: item.unit_cost,
      Price: item.selling_price || item.unit_cost * 1.3, // 30% markup if no selling price
      ReorderPoint: item.min_quantity,
      MaxQuantity: item.max_quantity,
      IsActive: item.is_active
    };
  }

  /**
   * Send stock adjustment to QuickBooks
   */
  async sendStockAdjustment(movement: StockMovement): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/integrations/quickbooks/stock-adjustment', movement);
    return response.data;
  }

  /**
   * Import purchase order from QuickBooks
   */
  async importPurchaseOrder(qbPoId: string): Promise<PurchaseOrder> {
    const response = await api.post<PurchaseOrder>(`/integrations/quickbooks/import-po/${qbPoId}`);
    return response.data;
  }

  /**
   * Export purchase order to QuickBooks
   */
  async exportPurchaseOrder(poId: string): Promise<{ success: boolean; qb_txn_id: string }> {
    const response = await api.post(`/integrations/quickbooks/export-po/${poId}`);
    return response.data;
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 50): Promise<SyncResult[]> {
    const response = await api.get<SyncResult[]>(`/integrations/quickbooks/sync-history?limit=${limit}`);
    return response.data;
  }

  /**
   * Schedule automatic sync
   */
  async scheduleAutoSync(intervalMinutes: number): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/integrations/quickbooks/schedule-sync', {
      interval_minutes: intervalMinutes
    });
    return response.data;
  }

  /**
   * Cancel automatic sync
   */
  async cancelAutoSync(): Promise<{ success: boolean; message: string }> {
    const response = await api.delete('/integrations/quickbooks/schedule-sync');
    return response.data;
  }

  /**
   * Get mapping conflicts (items that exist in both systems with differences)
   */
  async getMappingConflicts(): Promise<Array<{
    item_id: string;
    qb_list_id: string;
    conflicts: string[];
    local_item: InventoryItem;
    qb_item: QuickBooksItem;
  }>> {
    const response = await api.get('/integrations/quickbooks/mapping-conflicts');
    return response.data;
  }

  /**
   * Resolve mapping conflict
   */
  async resolveConflict(
    itemId: string,
    qbListId: string,
    resolution: 'use_local' | 'use_qb' | 'merge'
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/integrations/quickbooks/resolve-conflict', {
      item_id: itemId,
      qb_list_id: qbListId,
      resolution
    });
    return response.data;
  }

  /**
   * Generate QuickBooks IIF (Intuit Interchange Format) file for import
   */
  async generateIIFFile(itemIds?: string[]): Promise<Blob> {
    const response = await api.post(
      '/integrations/quickbooks/generate-iif',
      { item_ids: itemIds },
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Parse and import QuickBooks IIF file
   */
  async importIIFFile(file: File): Promise<SyncResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<SyncResult>('/integrations/quickbooks/import-iif', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}

export const quickbooksService = new QuickBooksService();
