/**
 * Sync Service — Drains the pending actions queue when connectivity is restored
 */
import { db, getPendingActions, removeAction, isOnline } from './localDatabase';
import { api } from '../api/client';

let syncInProgress = false;

export async function syncPendingActions(): Promise<{ synced: number; failed: number }> {
  if (!isOnline() || syncInProgress) return { synced: 0, failed: 0 };

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    const actions = await getPendingActions();

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_order':
            await api.post('/orders/', action.payload);
            break;
          case 'update_order':
            await api.patch(`/orders/${action.payload.id}`, action.payload.data);
            break;
          case 'update_order_status':
            await api.patch(`/orders/${action.payload.id}/status`, { status: action.payload.status });
            break;
          case 'process_payment':
            await api.post('/bills/payments', action.payload);
            break;
        }
        await removeAction(action.id!);
        synced++;
      } catch (error: any) {
        // Increment retry count
        await db.pendingActions.update(action.id!, {
          retry_count: action.retry_count + 1,
          last_error: error?.message || 'Unknown error',
        });
        // Remove if too many retries
        if (action.retry_count >= 5) {
          await removeAction(action.id!);
        }
        failed++;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return { synced, failed };
}

// Start background sync listener
export function startSyncListener(onSync?: (result: { synced: number; failed: number }) => void) {
  const handleOnline = async () => {
    console.log('[Sync] Back online — syncing pending actions...');
    const result = await syncPendingActions();
    if (result.synced > 0 || result.failed > 0) {
      console.log(`[Sync] Synced ${result.synced}, failed ${result.failed}`);
      onSync?.(result);
    }
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => window.removeEventListener('online', handleOnline);
}
