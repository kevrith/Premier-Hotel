/**
 * localDatabase.ts — compatibility shim
 *
 * Previously opened its own Dexie instance ("PremierHotelDB" v1) which
 * conflicted with the canonical v2 database in src/db/schema.ts.
 *
 * Now this file is a thin adapter:
 *  • Re-exports `db` from the single canonical database (schema.ts)
 *  • Provides cacheUser / cacheMenuItems with the same signatures that
 *    authStore.secure.ts expects
 *  • All other helpers delegate to the canonical db so there is only
 *    ever ONE IndexedDB instance open at a time.
 */

import { db, dbHelpers } from '@/db/schema';

// Re-export the canonical db so legacy imports (e.g. syncService.ts) still compile
export { db };

// ── Compatibility interfaces (kept so TypeScript doesn't break callers) ───────

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

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  token: string;
  cached_at: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simple online check */
export const isOnline = () => navigator.onLine;

/**
 * Cache user profile for offline recognition.
 * Auth tokens are in httpOnly cookies; Zustand already persists user state to
 * localStorage — so we only store a lightweight profile snapshot here.
 */
export async function cacheUser(user: Omit<LocalUser, 'cached_at'>) {
  try {
    localStorage.setItem(
      'cached-user-profile',
      JSON.stringify({ ...user, cached_at: Date.now() })
    );
  } catch { /* non-fatal */ }
}

/** Get cached user profile (offline fallback) */
export async function getCachedUser(userId: string): Promise<LocalUser | undefined> {
  try {
    const raw = localStorage.getItem('cached-user-profile');
    if (!raw) return undefined;
    const parsed: LocalUser = JSON.parse(raw);
    return parsed.id === userId ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cache menu items — delegates to the canonical schema.ts dbHelpers so data
 * lands in the same IndexedDB table used by offlineService.ts.
 */
export async function cacheMenuItems(items: any[]) {
  try {
    await dbHelpers.cacheMenuItems(
      items.map(item => ({
        id:              item.id,
        name:            item.name,
        description:     item.description   ?? '',
        price:           item.base_price     ?? item.price ?? 0,
        category:        item.category,
        imageUrl:        item.image_url      ?? item.imageUrl,
        isAvailable:     item.is_available   ?? item.isAvailable ?? true,
        preparationTime: item.preparation_time ?? item.preparationTime,
        cachedAt:        new Date().toISOString(),
      }))
    );
  } catch { /* non-fatal */ }
}

/** Get cached menu items from the canonical table */
export async function getCachedMenuItems() {
  return db.menuItems.orderBy('category').toArray();
}

/** Save an order locally (offline) */
export async function saveOrderLocally(order: any): Promise<number> {
  return db.orders.add({ ...order, offline: true, createdAt: new Date().toISOString() });
}

/** Queue an action for sync — writes to pendingSync (canonical table) */
export async function queueAction(type: string, payload: any) {
  return db.pendingSync.add({
    action:     type.startsWith('create') ? 'create' : type.startsWith('delete') ? 'delete' : 'update',
    entityType: payload.entityType ?? 'generic',
    data:       payload,
    timestamp:  new Date().toISOString(),
    priority:   5,
    retryCount: 0,
  });
}

/** Get all pending sync items */
export async function getPendingActions() {
  return db.pendingSync.orderBy('priority').toArray();
}

/** Remove a pending sync item by id */
export async function removeAction(id: number) {
  return db.pendingSync.delete(id);
}

/** Clear user-specific cached data on logout (keeps menu cache) */
export async function clearLocalDatabase() {
  try {
    localStorage.removeItem('cached-user-profile');
    await db.orderHistory.clear();
    await db.bookingHistory.clear();
    await db.loyaltyData.clear();
  } catch { /* non-fatal */ }
}
