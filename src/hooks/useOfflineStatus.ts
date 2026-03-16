/**
 * Hook to track online/offline status and pending sync queue size
 */
import { useState, useEffect } from 'react';
import { db } from '@/lib/db/localDatabase';
import { syncPendingActions } from '@/lib/db/syncService';
import { useLiveQuery } from 'dexie-react-hooks';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const pendingCount = useLiveQuery(() => db.pendingActions.count(), []) ?? 0;

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (pendingCount > 0) {
        setIsSyncing(true);
        await syncPendingActions();
        setIsSyncing(false);
        setLastSynced(new Date());
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingCount]);

  const manualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    await syncPendingActions();
    setIsSyncing(false);
    setLastSynced(new Date());
  };

  return { isOnline, isSyncing, pendingCount, lastSynced, manualSync };
}
