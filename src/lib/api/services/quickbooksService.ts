/**
 * QuickBooks API Service
 *
 * Handles all QuickBooks POS integration API calls with full TypeScript support.
 * Provides methods for configuration management, sync control, and mapping operations.
 *
 * @module api/services/quickbooksService
 */

import { api } from '../client';
import type { ApiResponse } from '@/types';
import type {
  QBConfig,
  QBConfigUpdate,
  QBTestConnectionResponse,
  QBManualSyncRequest,
  QBManualSyncResponse,
  QBSyncStatus,
  QBSyncLog,
  QBPaginatedSyncLogs,
  QBSyncLogFilters,
  QBItemMapping,
  QBItemMappingCreate,
  QBCustomerMapping,
} from '@/types/quickbooks';

/**
 * QuickBooks Service
 * Provides methods for QuickBooks POS integration management
 */
const quickbooksService = {
  // ==================== Configuration Methods ====================

  /**
   * Get QuickBooks configuration
   * @returns Promise with current QB configuration
   * @throws {Error} If configuration not found or fetch fails
   *
   * @example
   * ```typescript
   * const result = await quickbooksService.getConfig();
   * console.log(result.company_file_path);
   * ```
   */
  getConfig: async (): Promise<ApiResponse<QBConfig>> => {
    const response = await api.get<QBConfig>('/quickbooks/config');
    return response.data;
  },

  /**
   * Update QuickBooks configuration
   * @param config - Configuration data to update
   * @returns Promise with updated configuration
   * @throws {Error} If update fails or validation errors
   *
   * @example
   * ```typescript
   * const result = await quickbooksService.updateConfig({
   *   sync_enabled: true,
   *   sync_sales: true,
   *   sync_inventory: true
   * });
   * console.log('Config updated:', result.sync_enabled);
   * ```
   */
  updateConfig: async (config: QBConfigUpdate): Promise<ApiResponse<QBConfig>> => {
    const response = await api.post<QBConfig>('/quickbooks/config', config);
    return response.data;
  },

  /**
   * Test QuickBooks connection
   * Verifies that QuickBooks is accessible with current configuration
   * @returns Promise with connection test result
   * @throws {Error} If test fails
   *
   * @example
   * ```typescript
   * const result = await quickbooksService.testConnection();
   * if (result.success) {
   *   console.log('Connected:', result.message);
   * }
   * ```
   */
  testConnection: async (): Promise<ApiResponse<QBTestConnectionResponse>> => {
    const response = await api.post<QBTestConnectionResponse>('/quickbooks/test-connection');
    return response.data;
  },

  // ==================== Sync Management Methods ====================

  /**
   * Trigger manual synchronization
   * @param syncType - Type of sync: 'sales', 'inventory', or 'all'
   * @returns Promise with sync trigger result
   * @throws {Error} If sync trigger fails
   *
   * @example
   * ```typescript
   * const result = await quickbooksService.manualSync('inventory');
   * console.log('Triggered syncs:', result.triggered_syncs);
   * ```
   */
  manualSync: async (syncType: 'sales' | 'inventory' | 'all'): Promise<ApiResponse<QBManualSyncResponse>> => {
    const request: QBManualSyncRequest = { sync_type: syncType };
    const response = await api.post<QBManualSyncResponse>('/quickbooks/sync/manual', request);
    return response.data;
  },

  /**
   * Get current sync status and statistics
   * @returns Promise with sync status summary
   * @throws {Error} If fetch fails
   *
   * @example
   * ```typescript
   * const status = await quickbooksService.getSyncStatus();
   * console.log('Pending syncs:', status.total_pending);
   * console.log('Failed syncs:', status.total_failed);
   * ```
   */
  getSyncStatus: async (): Promise<ApiResponse<QBSyncStatus>> => {
    const response = await api.get<QBSyncStatus>('/quickbooks/sync/status');
    return response.data;
  },

  /**
   * Get paginated sync history logs
   * @param filters - Optional filters for logs (page, page_size, status, sync_type)
   * @returns Promise with paginated sync logs
   * @throws {Error} If fetch fails
   *
   * @example
   * ```typescript
   * const logs = await quickbooksService.getSyncLogs({
   *   page: 1,
   *   page_size: 20,
   *   status: 'failed'
   * });
   * console.log('Total logs:', logs.total);
   * ```
   */
  getSyncLogs: async (filters?: QBSyncLogFilters): Promise<ApiResponse<QBPaginatedSyncLogs>> => {
    const params = new URLSearchParams();

    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sync_type) params.append('sync_type', filters.sync_type);

    const queryString = params.toString();
    const url = `/quickbooks/sync/logs${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<QBPaginatedSyncLogs>(url);
    return response.data;
  },

  /**
   * Retry a failed sync transaction
   * @param logId - UUID of the failed sync log
   * @returns Promise with updated sync log
   * @throws {Error} If retry fails or log not found
   *
   * @example
   * ```typescript
   * const log = await quickbooksService.retrySync('123e4567-e89b-12d3-a456-426614174000');
   * console.log('Retry count:', log.retry_count);
   * ```
   */
  retrySync: async (logId: string): Promise<ApiResponse<QBSyncLog>> => {
    const response = await api.post<QBSyncLog>(`/quickbooks/sync/retry/${logId}`);
    return response.data;
  },

  // ==================== Mapping Methods ====================

  /**
   * Get all QuickBooks item mappings
   * @returns Promise with all item mappings
   * @throws {Error} If fetch fails
   *
   * @example
   * ```typescript
   * const mappings = await quickbooksService.getItemMappings();
   * mappings.forEach(m => {
   *   console.log(`${m.hotel_item_name} → ${m.qb_item_full_name}`);
   * });
   * ```
   */
  getItemMappings: async (): Promise<ApiResponse<QBItemMapping[]>> => {
    const response = await api.get<QBItemMapping[]>('/quickbooks/mappings/items');
    return response.data;
  },

  /**
   * Create a new QuickBooks item mapping
   * @param mapping - Item mapping data
   * @returns Promise with created mapping
   * @throws {Error} If creation fails or validation errors
   *
   * @example
   * ```typescript
   * const mapping = await quickbooksService.createItemMapping({
   *   hotel_item_id: 'abc123',
   *   hotel_item_type: 'menu_item',
   *   qb_item_list_id: 'QB123',
   *   qb_item_full_name: 'Food:Breakfast:Pancakes',
   *   sync_inventory: true
   * });
   * console.log('Mapping created:', mapping.id);
   * ```
   */
  createItemMapping: async (mapping: QBItemMappingCreate): Promise<ApiResponse<QBItemMapping>> => {
    const response = await api.post<QBItemMapping>('/quickbooks/mappings/items', mapping);
    return response.data;
  },

  /**
   * Delete a QuickBooks item mapping
   * @param mappingId - UUID of the mapping to delete
   * @returns Promise resolving when deletion is complete
   * @throws {Error} If deletion fails or mapping not found
   *
   * @example
   * ```typescript
   * await quickbooksService.deleteItemMapping('mapping-id-123');
   * console.log('Mapping deleted');
   * ```
   */
  deleteItemMapping: async (mappingId: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete<{ message: string }>(`/quickbooks/mappings/items/${mappingId}`);
    return response.data;
  },

  /**
   * Get all QuickBooks customer mappings
   * @returns Promise with all customer mappings
   * @throws {Error} If fetch fails
   *
   * @example
   * ```typescript
   * const mappings = await quickbooksService.getCustomerMappings();
   * mappings.forEach(m => {
   *   console.log(`${m.user_email} → ${m.qb_customer_name}`);
   * });
   * ```
   */
  getCustomerMappings: async (): Promise<ApiResponse<QBCustomerMapping[]>> => {
    const response = await api.get<QBCustomerMapping[]>('/quickbooks/mappings/customers');
    return response.data;
  },

  // ==================== Helper Methods ====================

  /**
   * Get failed syncs that need attention
   * Convenience method to fetch only failed sync logs
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 20)
   * @returns Promise with failed sync logs
   *
   * @example
   * ```typescript
   * const failedLogs = await quickbooksService.getFailedSyncs();
   * console.log(`${failedLogs.total} failed syncs need attention`);
   * ```
   */
  getFailedSyncs: async (page = 1, pageSize = 20): Promise<ApiResponse<QBPaginatedSyncLogs>> => {
    return quickbooksService.getSyncLogs({
      page,
      page_size: pageSize,
      status: 'failed',
    });
  },

  /**
   * Get recent sync history
   * Convenience method to fetch recent sync logs
   * @param limit - Number of recent logs to fetch (default: 10)
   * @returns Promise with recent sync logs
   *
   * @example
   * ```typescript
   * const recentLogs = await quickbooksService.getRecentSyncs(5);
   * ```
   */
  getRecentSyncs: async (limit = 10): Promise<ApiResponse<QBPaginatedSyncLogs>> => {
    return quickbooksService.getSyncLogs({
      page: 1,
      page_size: limit,
    });
  },

  /**
   * Check if QuickBooks is configured and connected
   * @returns Promise with boolean indicating if QB is ready
   *
   * @example
   * ```typescript
   * const isReady = await quickbooksService.isQuickBooksReady();
   * if (isReady) {
   *   console.log('QuickBooks is configured and connected');
   * }
   * ```
   */
  isQuickBooksReady: async (): Promise<boolean> => {
    try {
      const configResponse = await quickbooksService.getConfig();
      const config = configResponse.data;

      if (!config) return false;

      return (
        config.sync_enabled &&
        config.connection_status === 'connected' &&
        !!config.company_file_path &&
        !!config.web_connector_url
      );
    } catch (error) {
      return false;
    }
  },

  /**
   * Calculate sync success rate
   * @returns Promise with success rate percentage (0-100)
   *
   * @example
   * ```typescript
   * const successRate = await quickbooksService.getSyncSuccessRate();
   * console.log(`Success rate: ${successRate}%`);
   * ```
   */
  getSyncSuccessRate: async (): Promise<number> => {
    try {
      const statusResponse = await quickbooksService.getSyncStatus();
      const status = statusResponse.data;

      if (!status) return 0;

      const total = status.total_completed + status.total_failed;
      if (total === 0) return 100; // No syncs yet

      return Math.round((status.total_completed / total) * 100);
    } catch (error) {
      return 0;
    }
  },

  /**
   * Get unmapped menu items
   * Returns menu items that haven't been mapped to QuickBooks
   * Note: This requires fetching both mappings and menu items
   * @returns Promise with unmapped menu item IDs
   *
   * @example
   * ```typescript
   * const unmappedItems = await quickbooksService.getUnmappedMenuItems();
   * console.log(`${unmappedItems.length} items need mapping`);
   * ```
   */
  getUnmappedMenuItems: async (): Promise<string[]> => {
    try {
      const mappingsResponse = await quickbooksService.getItemMappings();
      const mappings = mappingsResponse.data || [];

      const mappedMenuItemIds = mappings
        .filter((m) => m.hotel_item_type === 'menu_item')
        .map((m) => m.hotel_item_id);

      // In a real implementation, you would fetch all menu items and filter
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to get unmapped menu items:', error);
      return [];
    }
  },

  /**
   * Bulk retry failed syncs
   * Retries multiple failed syncs at once
   * @param logIds - Array of failed sync log IDs
   * @returns Promise with retry results
   *
   * @example
   * ```typescript
   * const results = await quickbooksService.bulkRetryFailedSyncs([
   *   'log-id-1',
   *   'log-id-2',
   *   'log-id-3'
   * ]);
   * console.log(`${results.length} syncs retried`);
   * ```
   */
  bulkRetryFailedSyncs: async (logIds: string[]): Promise<QBSyncLog[]> => {
    const retryPromises = logIds.map((logId) =>
      quickbooksService.retrySync(logId).catch((error) => {
        console.error(`Failed to retry sync ${logId}:`, error);
        return null;
      })
    );

    const results = await Promise.all(retryPromises);
    return results.filter((r) => r !== null).map((r) => r!.data!);
  },
};

export default quickbooksService;
