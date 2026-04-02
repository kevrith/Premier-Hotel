/**
 * Hook to track online/offline status and pending sync queue size
 */
import { useState, useEffect, useRef } from 'react';
import { db } from '@/db/schema';
import OfflineService from '@/services/offlineService';
import apiClient from '@/lib/api/client';
import { useLiveQuery } from 'dexie-react-hooks';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  // Live count from pendingSync table — updates instantly when items are queued/removed
  const pendingCount = useLiveQuery(() => db.pendingSync.count(), []) ?? 0;

  const runSync = async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await OfflineService.processSyncQueue(apiClient);
      setLastSynced(new Date());
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => setIsOnline(false);

    // Trigger sync when a new item is queued and we're already online,
    // but only if not already syncing (avoids rapid re-trigger loops)
    const handleQueued = () => {
      if (navigator.onLine && !syncingRef.current) runSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline:queued', handleQueued);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline:queued', handleQueued);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const manualSync = () => runSync();

  return { isOnline, isSyncing, pendingCount, lastSynced, manualSync };
}
