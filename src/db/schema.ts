import Dexie, { Table } from 'dexie';

// TypeScript interfaces for database tables
export interface Order {
  id?: number;
  orderId?: string;
  userId: string;
  status: string;
  createdAt: string;
  items: any[];
  total: number;
  location?: string;
  locationType?: string;
  paymentMethod?: string;
  offline?: boolean;
}

export interface Booking {
  id?: number;
  bookingId?: string;
  userId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  totalPrice: number;
  guestName: string;
  guestEmail: string;
  offline?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  cachedAt: string;
}

export interface CartItem {
  id?: number;
  itemId: string;
  quantity: number;
  customizations?: any;
}

export interface PendingSync {
  id?: number;
  action: string;
  entityType: string;
  data: any;
  timestamp: string;
  priority: number;
  retryCount?: number;
  lastError?: string;
}

export interface Favorite {
  id?: number;
  userId: string;
  itemId: string;
  type: 'menu' | 'room';
}

export interface LoyaltyData {
  id?: number;
  userId: string;
  points: number;
  tier: string;
  rewards: any[];
  transactions: any[];
  cachedAt: string;
}

export interface OrderHistory {
  id?: number;
  orderId: string;
  userId: string;
  createdAt: string;
  items: any[];
  total: number;
  status: string;
  cachedAt: string;
}

export interface BookingHistory {
  id?: number;
  bookingId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  status: string;
  cachedAt: string;
}

export interface StaffActivity {
  id?: number;
  staffId: string;
  activityType: string;
  entityId: string;
  action: string;
  timestamp: string;
  synced: boolean;
}

export interface RoomStatus {
  id?: number;
  roomId: string;
  roomNumber: string;
  status: string;
  priority: string;
  assignedTo?: string;
  lastUpdated: string;
  synced: boolean;
}

export interface CachedResponse {
  key: string;
  data: any;
  timestamp: string;
  expiresAt: string;
}

export interface ConflictLog {
  id?: number;
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  resolution?: string;
  resolvedAt?: string;
  timestamp: string;
}

export interface QueuedNotification {
  id?: number;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'booking' | 'payment' | 'loyalty' | 'promotion' | 'task' | 'maintenance' | 'inventory';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  eventType?: string;
  referenceId?: string;
  data?: any;
  createdAt: string;
  scheduledFor?: string;
  sent: boolean;
  sentAt?: string;
}

export class PremierHotelDB extends Dexie {
  // Declare tables
  orders!: Table<Order>;
  bookings!: Table<Booking>;
  menuItems!: Table<MenuItem>;
  cartItems!: Table<CartItem>;
  pendingSync!: Table<PendingSync>;
  favorites!: Table<Favorite>;
  loyaltyData!: Table<LoyaltyData>;
  orderHistory!: Table<OrderHistory>;
  bookingHistory!: Table<BookingHistory>;
  staffActivities!: Table<StaffActivity>;
  roomStatuses!: Table<RoomStatus>;
  cache!: Table<CachedResponse>;
  conflicts!: Table<ConflictLog>;
  queuedNotifications!: Table<QueuedNotification>;

  constructor() {
    super('PremierHotelDB');

    // Version 2: Expanded schema for comprehensive offline support
    this.version(2).stores({
      // Orders - for offline food ordering
      orders: '++id, orderId, userId, status, createdAt',

      // Bookings - for room reservations
      bookings: '++id, bookingId, userId, status, checkIn, checkOut, roomId',

      // Menu items - cached for offline browsing
      menuItems: 'id, category, name, isAvailable, cachedAt',

      // Cart items - persistent cart
      cartItems: '++id, itemId, quantity',

      // Pending sync queue - for offline changes
      pendingSync: '++id, action, entityType, timestamp, priority, retryCount',

      // User favorites
      favorites: '++id, userId, itemId, type',

      // Loyalty program data - cached for offline access
      loyaltyData: '++id, userId, cachedAt',

      // Order history - cached for offline viewing
      orderHistory: '++id, orderId, userId, createdAt, status, cachedAt',

      // Booking history - cached for offline viewing
      bookingHistory: '++id, bookingId, userId, checkIn, checkOut, status, cachedAt',

      // Staff activities - track all staff actions offline
      staffActivities: '++id, staffId, activityType, entityId, timestamp, synced',

      // Room statuses - for housekeeping offline mode
      roomStatuses: '++id, roomId, roomNumber, status, priority, lastUpdated, synced',

      // Cached API responses
      cache: 'key, timestamp, expiresAt',

      // Conflict resolution log
      conflicts: '++id, entityType, entityId, timestamp, resolvedAt',

      // Queued notifications - for offline delivery
      queuedNotifications: '++id, userId, type, priority, createdAt, scheduledFor, sent, sentAt'
    });
  }
}

// Create database instance
export const db = new PremierHotelDB();

// Initialize database
db.open().catch((err) => {
  console.error('Failed to open database:', err);
});

// Helper functions for common operations
export const dbHelpers = {
  // Cache menu items for offline browsing
  async cacheMenuItems(items: MenuItem[]) {
    await db.menuItems.clear();
    await db.menuItems.bulkAdd(items.map(item => ({
      ...item,
      cachedAt: new Date().toISOString()
    })));
  },

  // Cache user's order history
  async cacheOrderHistory(orders: any[]) {
    const userId = orders[0]?.userId;
    if (!userId) return;

    await db.orderHistory.where('userId').equals(userId).delete();
    await db.orderHistory.bulkAdd(orders.map(order => ({
      orderId: order.id,
      userId: order.userId || order.customer_id,
      createdAt: order.created_at || order.createdAt,
      items: order.items,
      total: order.total_amount || order.total,
      status: order.status,
      cachedAt: new Date().toISOString()
    })));
  },

  // Cache user's booking history
  async cacheBookingHistory(bookings: any[]) {
    const userId = bookings[0]?.userId;
    if (!userId) return;

    await db.bookingHistory.where('userId').equals(userId).delete();
    await db.bookingHistory.bulkAdd(bookings.map(booking => ({
      bookingId: booking.id,
      userId: booking.userId || booking.user_id,
      checkIn: booking.check_in || booking.checkIn,
      checkOut: booking.check_out || booking.checkOut,
      roomNumber: booking.room_number || booking.roomNumber,
      status: booking.status,
      cachedAt: new Date().toISOString()
    })));
  },

  // Cache loyalty program data
  async cacheLoyaltyData(userId: string, loyaltyInfo: any) {
    await db.loyaltyData.where('userId').equals(userId).delete();
    await db.loyaltyData.add({
      userId,
      points: loyaltyInfo.points,
      tier: loyaltyInfo.tier,
      rewards: loyaltyInfo.rewards || [],
      transactions: loyaltyInfo.transactions || [],
      cachedAt: new Date().toISOString()
    });
  },

  // Get cached data with expiration check
  async getCachedData(key: string): Promise<any | null> {
    const cached = await db.cache.get(key);
    if (!cached) return null;

    const expiresAt = new Date(cached.expiresAt);
    if (expiresAt < new Date()) {
      await db.cache.delete(key);
      return null;
    }

    return cached.data;
  },

  // Set cached data with expiration
  async setCachedData(key: string, data: any, expiresInMinutes: number = 30) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60000);

    await db.cache.put({
      key,
      data,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
  },

  // Log a conflict for resolution
  async logConflict(entityType: string, entityId: string, localVersion: any, serverVersion: any) {
    await db.conflicts.add({
      entityType,
      entityId,
      localVersion,
      serverVersion,
      timestamp: new Date().toISOString()
    });
  },

  // Get unresolved conflicts
  async getUnresolvedConflicts() {
    return await db.conflicts.where('resolvedAt').equals(undefined as any).toArray();
  },

  // Mark conflict as resolved
  async resolveConflict(conflictId: number, resolution: string) {
    await db.conflicts.update(conflictId, {
      resolution,
      resolvedAt: new Date().toISOString()
    });
  },

  // Queue notification for offline delivery
  async queueNotification(notification: Omit<QueuedNotification, 'id'>) {
    const queued: QueuedNotification = {
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString(),
      sent: false
    };
    return await db.queuedNotifications.add(queued);
  },

  // Get pending notifications for a user
  async getPendingNotifications(userId?: string) {
    let query = db.queuedNotifications.where('sent').equals(0);

    if (userId) {
      const all = await query.toArray();
      return all.filter(n => n.userId === userId);
    }

    return await query.toArray();
  },

  // Get pending notifications sorted by priority
  async getPendingNotificationsByPriority(userId?: string) {
    const pending = await this.getPendingNotifications(userId);

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    return pending.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by creation time (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  },

  // Mark notification as sent
  async markNotificationSent(notificationId: number) {
    await db.queuedNotifications.update(notificationId, {
      sent: true,
      sentAt: new Date().toISOString()
    });
  },

  // Delete old sent notifications (cleanup)
  async cleanupSentNotifications(daysOld: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    const oldNotifications = await db.queuedNotifications
      .where('sent').equals(1)
      .and(n => n.sentAt !== undefined && n.sentAt < cutoffISO)
      .toArray();

    const ids = oldNotifications.map(n => n.id!);
    await db.queuedNotifications.bulkDelete(ids);

    return ids.length;
  },

  // Get notification statistics
  async getNotificationQueueStats() {
    const all = await db.queuedNotifications.toArray();
    const pending = all.filter(n => !n.sent);
    const sent = all.filter(n => n.sent);

    return {
      total: all.length,
      pending: pending.length,
      sent: sent.length,
      byType: pending.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: pending.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
};

export default db;
