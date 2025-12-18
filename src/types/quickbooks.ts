/**
 * QuickBooks POS Integration Type Definitions
 *
 * Complete TypeScript type definitions for QuickBooks POS 2013 integration.
 * Includes types for configuration, sync logs, mappings, and API responses.
 *
 * @module types/quickbooks
 */

/**
 * Sync operation type
 */
export type SyncType = 'sale' | 'inventory_pull' | 'inventory_push' | 'customer';

/**
 * Sync direction
 */
export type SyncDirection = 'to_qb' | 'from_qb';

/**
 * Sync status
 */
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Reference type for sync transactions
 */
export type ReferenceType = 'order' | 'booking' | 'inventory_item';

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

/**
 * Item type for mappings
 */
export type ItemType = 'menu_item' | 'inventory_item';

/**
 * QuickBooks configuration
 */
export interface QBConfig {
  id: string;
  company_file_path: string;
  web_connector_url: string;
  username: string;
  sync_enabled: boolean;
  sync_sales: boolean;
  sync_inventory: boolean;
  inventory_sync_interval_minutes: number;
  connection_status: ConnectionStatus;
  last_inventory_sync?: string;
  created_at: string;
  updated_at: string;
}

/**
 * QuickBooks configuration update payload
 */
export interface QBConfigUpdate {
  company_file_path?: string;
  web_connector_url?: string;
  username?: string;
  password?: string;
  sync_enabled?: boolean;
  sync_sales?: boolean;
  sync_inventory?: boolean;
  inventory_sync_interval_minutes?: number;
}

/**
 * QuickBooks sync log entry
 */
export interface QBSyncLog {
  id: string;
  sync_type: SyncType;
  sync_direction: SyncDirection;
  reference_type: ReferenceType;
  reference_id: string;
  qb_txn_id?: string;
  qbxml_request?: string;
  qbxml_response?: string;
  status: SyncStatus;
  error_message?: string;
  retry_count: number;
  synced_at?: string;
  created_at: string;
}

/**
 * QuickBooks item mapping
 */
export interface QBItemMapping {
  id: string;
  hotel_item_id: string;
  hotel_item_type: ItemType;
  hotel_item_name?: string;
  qb_item_list_id: string;
  qb_item_full_name: string;
  sync_inventory: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * QuickBooks item mapping creation payload
 */
export interface QBItemMappingCreate {
  hotel_item_id: string;
  hotel_item_type: ItemType;
  qb_item_list_id: string;
  qb_item_full_name: string;
  sync_inventory: boolean;
}

/**
 * QuickBooks customer mapping
 */
export interface QBCustomerMapping {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  qb_customer_list_id: string;
  qb_customer_name: string;
  created_at: string;
}

/**
 * Test connection response
 */
export interface QBTestConnectionResponse {
  success: boolean;
  message: string;
  connection_status: ConnectionStatus;
}

/**
 * Manual sync request
 */
export interface QBManualSyncRequest {
  sync_type: 'sales' | 'inventory' | 'all';
}

/**
 * Manual sync response
 */
export interface QBManualSyncResponse {
  success: boolean;
  message: string;
  triggered_syncs: number;
}

/**
 * Sync status summary
 */
export interface QBSyncStatus {
  sync_enabled: boolean;
  total_pending: number;
  total_processing: number;
  total_completed: number;
  total_failed: number;
  last_successful_sync?: string;
}

/**
 * Sync statistics for dashboard
 */
export interface QBSyncStats {
  total_synced: number;
  total_failed: number;
  total_pending: number;
  last_successful_sync?: string;
  success_rate: number;
}

/**
 * Paginated sync logs response
 */
export interface QBPaginatedSyncLogs {
  logs: QBSyncLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Sync log filters
 */
export interface QBSyncLogFilters {
  page?: number;
  page_size?: number;
  status?: SyncStatus;
  sync_type?: SyncType;
}

/**
 * QuickBooks integration health status
 */
export interface QBHealthStatus {
  is_configured: boolean;
  is_connected: boolean;
  sync_enabled: boolean;
  last_sync?: string;
  pending_syncs: number;
  failed_syncs: number;
}

/**
 * Dashboard widget data
 */
export interface QBDashboardWidget {
  connection_status: ConnectionStatus;
  sync_enabled: boolean;
  total_synced_today: number;
  failed_syncs: number;
  last_sync?: string;
}

/**
 * Sync error details
 */
export interface QBSyncError {
  log_id: string;
  sync_type: SyncType;
  reference_id: string;
  error_message: string;
  retry_count: number;
  created_at: string;
}

/**
 * Item mapping with menu/inventory details
 */
export interface QBItemMappingDetailed extends QBItemMapping {
  hotel_item?: {
    id: string;
    name: string;
    type: ItemType;
    price?: number;
    quantity?: number;
  };
}

/**
 * Sync history entry with reference details
 */
export interface QBSyncLogDetailed extends QBSyncLog {
  reference_details?: {
    order_number?: string;
    booking_number?: string;
    customer_name?: string;
    total_amount?: number;
  };
}

/**
 * Real-time sync notification
 */
export interface QBSyncNotification {
  type: 'sync_started' | 'sync_completed' | 'sync_failed';
  sync_log_id: string;
  sync_type: SyncType;
  message: string;
  timestamp: string;
}

/**
 * QuickBooks setup wizard step
 */
export interface QBSetupStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

/**
 * QuickBooks setup wizard state
 */
export interface QBSetupWizard {
  current_step: number;
  steps: QBSetupStep[];
  is_complete: boolean;
}

/**
 * QBWC file generation request
 */
export interface QBWCFileRequest {
  app_name: string;
  app_description: string;
  app_url: string;
  username: string;
  file_id: string;
  owner_id: string;
}

/**
 * QBWC file generation response
 */
export interface QBWCFileResponse {
  success: boolean;
  qbwc_content: string;
  filename: string;
}

/**
 * Inventory sync result
 */
export interface QBInventorySyncResult {
  item_id: string;
  item_name: string;
  old_quantity: number;
  new_quantity: number;
  synced_at: string;
}

/**
 * Batch sync progress
 */
export interface QBBatchSyncProgress {
  total_items: number;
  completed_items: number;
  failed_items: number;
  current_item?: string;
  percentage: number;
}

/**
 * Export for all types
 */
export type {
  SyncType,
  SyncDirection,
  SyncStatus,
  ReferenceType,
  ConnectionStatus,
  ItemType,
  QBConfig,
  QBConfigUpdate,
  QBSyncLog,
  QBItemMapping,
  QBItemMappingCreate,
  QBCustomerMapping,
  QBTestConnectionResponse,
  QBManualSyncRequest,
  QBManualSyncResponse,
  QBSyncStatus,
  QBSyncStats,
  QBPaginatedSyncLogs,
  QBSyncLogFilters,
  QBHealthStatus,
  QBDashboardWidget,
  QBSyncError,
  QBItemMappingDetailed,
  QBSyncLogDetailed,
  QBSyncNotification,
  QBSetupStep,
  QBSetupWizard,
  QBWCFileRequest,
  QBWCFileResponse,
  QBInventorySyncResult,
  QBBatchSyncProgress,
};
