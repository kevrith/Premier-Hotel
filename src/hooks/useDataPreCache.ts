/**
 * useDataPreCache
 *
 * Runs once after a user logs in (userId becomes truthy) while online.
 * Pre-populates IndexedDB so the app can serve critical data fully offline:
 *   • Menu items  (24 h TTL via workbox + stored in Dexie)
 *   • Rooms       (for housekeeping / booking screens)
 *   • User's last 50 orders
 *   • User's last 50 bookings
 *
 * All fetches are fire-and-forget — failures are silently logged so they
 * never block login or crash the app.
 */

import { useEffect, useRef } from 'react';
import apiClient from '@/lib/api/client';
import OfflineService from '@/services/offlineService';

// Roles that have access to the general orders/bookings list endpoints
const ROLES_WITH_ORDERS_ACCESS = ['admin', 'manager', 'waiter', 'cashier'];
const ROLES_WITH_BOOKINGS_ACCESS = ['admin', 'manager', 'receptionist'];

export function useDataPreCache(userId: string | undefined, role?: string | null) {
  const cachedForUser = useRef<string | null>(null);

  useEffect(() => {
    // Only run once per user session, and only when online
    if (!userId || !navigator.onLine || cachedForUser.current === userId) return;
    cachedForUser.current = userId;

    const run = async () => {
      console.log('[PreCache] Starting offline data cache for user', userId);

      const fetches: Promise<any>[] = [

        // ── Menu items ──────────────────────────────────────────────────────
        apiClient.get('/menu/items').then(res => {
          const items = res.data?.data ?? res.data ?? [];
          if (Array.isArray(items) && items.length > 0) {
            return OfflineService.cacheMenuItems(items);
          }
        }),

        // ── Rooms (for housekeeping + booking) ───────────────────────────────
        apiClient.get('/rooms/').then(res => {
          const rooms = res.data?.data ?? res.data ?? [];
          if (Array.isArray(rooms) && rooms.length > 0) {
            return OfflineService.cacheRoomStatuses(rooms);
          }
        }),
      ];

      // Only pre-cache orders/bookings for roles that have list-level access
      if (role && ROLES_WITH_ORDERS_ACCESS.includes(role)) {
        fetches.push(
          apiClient.get('/orders/?limit=50').then(res => {
            const orders = res.data?.data ?? res.data ?? [];
            if (Array.isArray(orders) && orders.length > 0) {
              return OfflineService.cacheUserOrders(userId, orders);
            }
          })
        );
      }

      if (role && ROLES_WITH_BOOKINGS_ACCESS.includes(role)) {
        fetches.push(
          apiClient.get('/bookings/?limit=50').then(res => {
            const bookings = res.data?.data ?? res.data ?? [];
            if (Array.isArray(bookings) && bookings.length > 0) {
              return OfflineService.cacheUserBookings(userId, bookings);
            }
          })
        );
      }

      const results = await Promise.allSettled(fetches);

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        failed.forEach(r => console.warn('[PreCache] Partial failure (non-fatal):', (r as PromiseRejectedResult).reason));
      }

      // Register for periodic background sync if supported
      if ('serviceWorker' in navigator && 'periodicSync' in (await navigator.serviceWorker.ready)) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await (reg as any).periodicSync.register('premier-hotel-sync', {
            minInterval: 15 * 60 * 1000, // every 15 minutes
          });
          console.log('[PreCache] Periodic background sync registered');
        } catch { /* not supported or permission denied — fine */ }
      }

      console.log('[PreCache] Offline data cache complete');
    };

    run();
  }, [userId]);
}
