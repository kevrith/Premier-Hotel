// @ts-nocheck
import { db, dbHelpers } from '@/db/schema';
import { toast } from 'react-hot-toast';

/**
 * Comprehensive offline service for data caching, retrieval, and synchronization
 */
export class OfflineService {

  // ==================== CUSTOMER OFFLINE CAPABILITIES ====================

  /**
   * Cache menu items for offline browsing
   */
  static async cacheMenuItems(items: any[]) {
    try {
      await dbHelpers.cacheMenuItems(items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.image_url,
        isAvailable: item.available,
        preparationTime: item.preparation_time,
        cachedAt: new Date().toISOString()
      })));
      console.log(`✅ Cached ${items.length} menu items for offline use`);
    } catch (error) {
      console.error('Failed to cache menu items:', error);
    }
  }

  /**
   * Get menu items from cache (offline mode)
   */
  static async getCachedMenuItems(): Promise<any[]> {
    try {
      const items = await db.menuItems.toArray();
      return items;
    } catch (error) {
      console.error('Failed to get cached menu items:', error);
      return [];
    }
  }

  /**
   * Cache user's order history for offline viewing
   */
  static async cacheUserOrders(userId: string, orders: any[]) {
    try {
      await dbHelpers.cacheOrderHistory(orders.map(order => ({
        ...order,
        userId
      })));
      console.log(`✅ Cached ${orders.length} orders for offline viewing`);
    } catch (error) {
      console.error('Failed to cache orders:', error);
    }
  }

  /**
   * Get user's order history from cache
   */
  static async getCachedOrders(userId: string): Promise<any[]> {
    try {
      const orders = await db.orderHistory
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('createdAt');
      return orders;
    } catch (error) {
      console.error('Failed to get cached orders:', error);
      return [];
    }
  }

  /**
   * Cache user's booking history for offline viewing
   */
  static async cacheUserBookings(userId: string, bookings: any[]) {
    try {
      await dbHelpers.cacheBookingHistory(bookings.map(booking => ({
        ...booking,
        userId
      })));
      console.log(`✅ Cached ${bookings.length} bookings for offline viewing`);
    } catch (error) {
      console.error('Failed to cache bookings:', error);
    }
  }

  /**
   * Get user's booking history from cache
   */
  static async getCachedBookings(userId: string): Promise<any[]> {
    try {
      const bookings = await db.bookingHistory
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('checkIn');
      return bookings;
    } catch (error) {
      console.error('Failed to get cached bookings:', error);
      return [];
    }
  }

  /**
   * Cache loyalty program data for offline access
   */
  static async cacheLoyaltyData(userId: string, loyaltyData: any) {
    try {
      await dbHelpers.cacheLoyaltyData(userId, loyaltyData);
      console.log('✅ Cached loyalty program data for offline access');
    } catch (error) {
      console.error('Failed to cache loyalty data:', error);
    }
  }

  /**
   * Get loyalty program data from cache
   */
  static async getCachedLoyaltyData(userId: string): Promise<any | null> {
    try {
      const data = await db.loyaltyData
        .where('userId')
        .equals(userId)
        .first();
      return data || null;
    } catch (error) {
      console.error('Failed to get cached loyalty data:', error);
      return null;
    }
  }

  /**
   * Place order offline (cash payment only)
   */
  static async placeOfflineOrder(orderData: any) {
    try {
      // Save order to IndexedDB
      const orderId = await db.orders.add({
        ...orderData,
        offline: true,
        createdAt: new Date().toISOString()
      });

      // Add to sync queue with high priority
      await db.pendingSync.add({
        action: 'create',
        entityType: 'order',
        data: orderData,
        timestamp: new Date().toISOString(),
        priority: 1, // High priority for orders
        retryCount: 0
      });

      console.log(`✅ Offline order queued: ${orderId}`);
      return orderId;
    } catch (error) {
      console.error('Failed to create offline order:', error);
      throw error;
    }
  }

  // ==================== STAFF OFFLINE CAPABILITIES ====================

  /**
   * Cache room statuses for housekeeping staff
   */
  static async cacheRoomStatuses(rooms: any[]) {
    try {
      await db.roomStatuses.clear();
      await db.roomStatuses.bulkAdd(rooms.map(room => ({
        roomId: room.id,
        roomNumber: room.number || room.room_number,
        status: room.status,
        priority: room.priority || 'medium',
        assignedTo: room.assigned_to || room.assignedTo,
        lastUpdated: new Date().toISOString(),
        synced: true
      })));
      console.log(`✅ Cached ${rooms.length} room statuses for offline use`);
    } catch (error) {
      console.error('Failed to cache room statuses:', error);
    }
  }

  /**
   * Get cached room statuses
   */
  static async getCachedRoomStatuses(): Promise<any[]> {
    try {
      return await db.roomStatuses.toArray();
    } catch (error) {
      console.error('Failed to get cached room statuses:', error);
      return [];
    }
  }

  /**
   * Update room status offline
   */
  static async updateRoomStatusOffline(roomId: string, updates: any) {
    try {
      // Update in IndexedDB
      await db.roomStatuses
        .where('roomId')
        .equals(roomId)
        .modify({
          ...updates,
          lastUpdated: new Date().toISOString(),
          synced: false
        });

      // Add to sync queue
      await db.pendingSync.add({
        action: 'update',
        entityType: 'room_status',
        data: { roomId, ...updates },
        timestamp: new Date().toISOString(),
        priority: 3,
        retryCount: 0
      });

      console.log(`✅ Room status update queued: ${roomId}`);
    } catch (error) {
      console.error('Failed to update room status offline:', error);
      throw error;
    }
  }

  /**
   * Track staff activity offline
   */
  static async trackStaffActivity(staffId: string, activityType: string, entityId: string, action: string) {
    try {
      await db.staffActivities.add({
        staffId,
        activityType,
        entityId,
        action,
        timestamp: new Date().toISOString(),
        synced: false
      });

      // Add to sync queue with low priority
      await db.pendingSync.add({
        action: 'create',
        entityType: 'staff_activity',
        data: { staffId, activityType, entityId, action },
        timestamp: new Date().toISOString(),
        priority: 5,
        retryCount: 0
      });

      console.log(`✅ Staff activity tracked: ${activityType} - ${action}`);
    } catch (error) {
      console.error('Failed to track staff activity:', error);
    }
  }

  /**
   * Process order update offline (for chef/waiter)
   */
  static async processOrderUpdateOffline(orderId: string, status: string, updates: any = {}) {
    try {
      // Add to sync queue
      await db.pendingSync.add({
        action: 'update',
        entityType: 'order',
        data: { orderId, status, ...updates },
        timestamp: new Date().toISOString(),
        priority: 2, // High priority for order updates
        retryCount: 0
      });

      console.log(`✅ Order update queued: ${orderId} -> ${status}`);
    } catch (error) {
      console.error('Failed to queue order update:', error);
      throw error;
    }
  }

  // ==================== SYNCHRONIZATION SYSTEM ====================

  /**
   * Get prioritized sync queue
   */
  static async getSyncQueue(): Promise<any[]> {
    try {
      return await db.pendingSync
        .orderBy('priority')
        .toArray();
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Process sync queue — replays each queued mutation against the live API.
   * Items that used _url (queued by the API client interceptor) are re-issued
   * on their exact original endpoint. Older items without _url fall back to
   * the entity-type → endpoint map.
   */
  static async processSyncQueue(apiClient: any): Promise<{
    success: number;
    failed: number;
    conflicts: number;
  }> {
    const queue = await this.getSyncQueue();
    let success = 0, failed = 0, conflicts = 0;

    for (const item of queue) {
      try {
        const result = await this.syncItem(item, apiClient);

        if (result.conflict) {
          conflicts++;
          await dbHelpers.logConflict(
            item.entityType,
            item.data.id || item.data.orderId || item.data.roomId,
            item.data,
            result.serverVersion
          );
        } else {
          success++;
          await db.pendingSync.delete(item.id!);
        }
      } catch (error: any) {
        failed++;
        const httpStatus = error?.response?.status;

        // 401/403 means auth failed even after the interceptor's refresh attempt —
        // abort the entire sync pass and let the auth:session-expired event handle it.
        // Don't drop queued items so they can be replayed after re-login.
        if (httpStatus === 401 || httpStatus === 403) {
          console.warn(`[Sync] Auth error (${httpStatus}) during sync — stopping queue processing`);
          break;
        }

        // Drop other client errors (4xx) immediately — retrying won't help
        if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
          console.warn(`[Sync] Dropping item ${item.id} — server returned ${httpStatus}`);
          await db.pendingSync.delete(item.id!);
          continue;
        }

        const retries = (item.retryCount || 0) + 1;
        await db.pendingSync.update(item.id!, { retryCount: retries, lastError: error.message });

        if (retries >= 5) {
          console.error(`Max retries reached for item ${item.id}, dropping from queue`);
          await db.pendingSync.delete(item.id!);
        }
      }
    }

    return { success, failed, conflicts };
  }

  /**
   * Sync a single queued item.
   * Priority: use the stored _url/_method if present (set by client.ts),
   * otherwise fall back to entity-type routing.
   */
  private static async syncItem(item: any, apiClient: any): Promise<{
    success: boolean;
    conflict?: boolean;
    serverVersion?: any;
  }> {
    const { action, entityType, data } = item;

    // If the client stored the exact URL, replay it directly
    if (data._url && data._method) {
      const { _url: url, _method: method, ...payload } = data;
      switch (method) {
        case 'post':   await apiClient.post(url, payload);   break;
        case 'put':    await apiClient.put(url, payload);    break;
        case 'patch':  await apiClient.patch(url, payload);  break;
        case 'delete': await apiClient.delete(url);          break;
      }
      return { success: true };
    }

    // Legacy items: derive endpoint from entity type
    const endpoint = this.getApiEndpoint(entityType);
    const entityId = data.id || data.orderId || data.roomId;

    switch (action) {
      case 'create':
        await apiClient.post(endpoint, data);
        break;

      case 'update': {
        // Light conflict check: compare server's updated_at with local timestamp
        try {
          const res = await apiClient.get(`${endpoint}/${entityId}`);
          const serverData = res.data?.data ?? res.data;
          if (serverData?.updated_at && serverData.updated_at > item.timestamp) {
            return { success: false, conflict: true, serverVersion: serverData };
          }
        } catch { /* server unreachable — skip conflict check */ }

        await apiClient.patch(`${endpoint}/${entityId}`, data);
        break;
      }

      case 'delete':
        await apiClient.delete(`${endpoint}/${entityId}`);
        break;

      default:
        throw new Error(`Unknown sync action: ${action}`);
    }

    return { success: true };
  }

  /**
   * Entity type → API endpoint mapping.
   * Paths are relative to the Axios baseURL (e.g. /orders not /api/v1/orders).
   */
  private static getApiEndpoint(entityType: string): string {
    const map: Record<string, string> = {
      order:          '/orders',
      booking:        '/bookings',
      room_status:    '/housekeeping/tasks',
      payment:        '/payments',
      staff_activity: '/staff/activities',
      menu_item:      '/menu/items',
    };
    return map[entityType] ?? `/${entityType}s`;
  }

  // ==================== CONFLICT RESOLUTION ====================

  /**
   * Get all unresolved conflicts
   */
  static async getConflicts() {
    return await dbHelpers.getUnresolvedConflicts();
  }

  /**
   * Resolve conflict with strategy
   */
  static async resolveConflict(
    conflictId: number,
    strategy: 'use_local' | 'use_server' | 'merge'
  ) {
    try {
      const conflict = await db.conflicts.get(conflictId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      let resolvedData;

      switch (strategy) {
        case 'use_local':
          resolvedData = conflict.localVersion;
          break;

        case 'use_server':
          resolvedData = conflict.serverVersion;
          break;

        case 'merge':
          // Simple merge strategy - prefer server for metadata, local for content
          resolvedData = {
            ...conflict.serverVersion,
            ...conflict.localVersion,
            merged_at: new Date().toISOString()
          };
          break;

        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }

      // Mark conflict as resolved
      await dbHelpers.resolveConflict(conflictId, strategy);

      // Re-queue for sync with merged data
      await db.pendingSync.add({
        action: 'update',
        entityType: conflict.entityType,
        data: resolvedData,
        timestamp: new Date().toISOString(),
        priority: 1,
        retryCount: 0
      });

      console.log(`✅ Conflict ${conflictId} resolved using: ${strategy}`);
      return resolvedData;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  // ==================== DATA INTEGRITY ====================

  /**
   * Validate data integrity before sync
   */
  static validateData(entityType: string, data: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    switch (entityType) {
      case 'order':
        if (!data.userId && !data.customer_id) {
          errors.push('Missing user ID');
        }
        if (!data.items || data.items.length === 0) {
          errors.push('Order must have at least one item');
        }
        if (data.total <= 0) {
          errors.push('Order total must be positive');
        }
        break;

      case 'booking':
        if (!data.userId && !data.user_id) {
          errors.push('Missing user ID');
        }
        if (!data.roomId && !data.room_id) {
          errors.push('Missing room ID');
        }
        if (new Date(data.checkOut) <= new Date(data.checkIn)) {
          errors.push('Check-out must be after check-in');
        }
        break;

      case 'room_status':
        if (!data.roomId) {
          errors.push('Missing room ID');
        }
        if (!['pending', 'in-progress', 'completed', 'inspected'].includes(data.status)) {
          errors.push('Invalid room status');
        }
        break;

      default:
        // Generic validation
        if (!data.timestamp) {
          errors.push('Missing timestamp');
        }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean up old cached data
   */
  static async cleanupOldCache(daysOld: number = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoff = cutoffDate.toISOString();

      // Clean old order history
      await db.orderHistory.where('cachedAt').below(cutoff).delete();

      // Clean old booking history
      await db.bookingHistory.where('cachedAt').below(cutoff).delete();

      // Clean old menu cache
      await db.menuItems.where('cachedAt').below(cutoff).delete();

      // Clean expired cache entries
      await db.cache.where('expiresAt').below(new Date().toISOString()).delete();

      console.log(`✅ Cleaned up cache data older than ${daysOld} days`);
    } catch (error) {
      console.error('Failed to cleanup old cache:', error);
    }
  }

  /**
   * Get offline storage statistics
   */
  static async getStorageStats() {
    try {
      const stats = {
        orders: await db.orders.count(),
        bookings: await db.bookings.count(),
        menuItems: await db.menuItems.count(),
        cartItems: await db.cartItems.count(),
        pendingSync: await db.pendingSync.count(),
        orderHistory: await db.orderHistory.count(),
        bookingHistory: await db.bookingHistory.count(),
        conflicts: await db.conflicts.where('resolvedAt').equals(undefined as any).count(),
        totalSize: 'N/A' // Would need IndexedDB storage estimation API
      };
      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }
}

export default OfflineService;
