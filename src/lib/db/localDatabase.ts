/**
 * Local IndexedDB database using Dexie.js
 * Enables offline operation for the Premier Hotel app
 */
import Dexie, { Table } from 'dexie';

export interface LocalMenuItem {
  id: string;
  name: string;
  category: string;
  base_price: number;
  is_available: boolean;
  preparation_time: number;
  image_url?: string;
  synced_at: number;
}

export interface LocalOrder {
  localId?: number;       // auto-increment (IndexedDB primary key)
  serverId?: string;      // UUID from server (null if not synced yet)
  order_number?: string;
  location: string;
  location_type: 'table' | 'room';
  items: any[];
  subtotal: number;
  tax: number;
  total_amount: number;
  status: string;
  payment_status: string;
  customer_name?: string;
  notes?: string;
  created_at: string;
  synced: boolean;        // false = needs to be pushed to server
}

export interface LocalPendingAction {
  id?: number;
  type: 'create_order' | 'update_order' | 'process_payment' | 'update_order_status';
  payload: any;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  token: string;          // JWT for API calls
  cached_at: number;
}

export interface LocalBill {
  id: string;
  bill_number: string;
  total_amount: number;
  payment_status: string;
  table_number?: string;
  room_number?: string;
  location_type: string;
  synced_at: number;
}

class HotelDatabase extends Dexie {
  menuItems!: Table<LocalMenuItem, string>;
  orders!: Table<LocalOrder, number>;
  pendingActions!: Table<LocalPendingAction, number>;
  users!: Table<LocalUser, string>;
  bills!: Table<LocalBill, string>;

  constructor() {
    super('PremierHotelDB');

    this.version(1).stores({
      menuItems: 'id, category, is_available, synced_at',
      orders: '++localId, serverId, location, location_type, status, synced, created_at',
      pendingActions: '++id, type, created_at, retry_count',
      users: 'id, email, role',
      bills: 'id, bill_number, payment_status, synced_at',
    });
  }
}

export const db = new HotelDatabase();

// Helper: check if we're online
export const isOnline = () => navigator.onLine;

// Cache menu items
export async function cacheMenuItems(items: LocalMenuItem[]) {
  const now = Date.now();
  await db.menuItems.bulkPut(items.map(i => ({ ...i, synced_at: now })));
}

// Get cached menu items
export async function getCachedMenuItems(): Promise<LocalMenuItem[]> {
  return db.menuItems.orderBy('category').toArray();
}

// Cache current user credentials
export async function cacheUser(user: Omit<LocalUser, 'cached_at'>) {
  await db.users.put({ ...user, cached_at: Date.now() });
}

// Get cached user
export async function getCachedUser(userId: string): Promise<LocalUser | undefined> {
  return db.users.get(userId);
}

// Save an order (locally if offline)
export async function saveOrderLocally(order: Omit<LocalOrder, 'localId'>): Promise<number> {
  return db.orders.add(order);
}

// Queue an action for sync when back online
export async function queueAction(type: LocalPendingAction['type'], payload: any) {
  return db.pendingActions.add({
    type,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
  });
}

// Get all pending actions
export async function getPendingActions(): Promise<LocalPendingAction[]> {
  return db.pendingActions.orderBy('id').toArray();
}

// Mark action as completed (remove from queue)
export async function removeAction(id: number) {
  return db.pendingActions.delete(id);
}

// Clear all cached data (logout)
export async function clearLocalDatabase() {
  await db.users.clear();
  // Keep menu items cached for next login
}
