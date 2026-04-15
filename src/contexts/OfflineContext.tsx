// @ts-nocheck
import { createContext, useContext, useEffect } from 'react';
import useOfflineStore from '@/stores/offlineStore';
import useAuthStore from '@/stores/authStore.secure';
import { toastManager as toast } from '@/lib/toastManager';

const OfflineContext = createContext<any>(undefined);

export function OfflineProvider({ children }: { children: any }) {
  const {
    isOnline,
    syncQueue,
    pendingChanges,
    isSyncing,
    lastSyncTime,
    isOfflineMode,
    syncStatus,
    setOnlineStatus,
    addToQueue,
    syncData,
    clearQueue,
    toggleOfflineMode,
    loadQueueFromStorage
  } = useOfflineStore();

  useEffect(() => {
    loadQueueFromStorage();

    const handleOnline = async () => {
      setOnlineStatus(true);

      const { isAuthenticated, refreshAccessToken } = useAuthStore.getState();

      // If the user is logged in, refresh the token before replaying queued requests.
      // Skipping this caused "session expired" errors because sync fired with a
      // stale JWT before the refresh cycle had a chance to run.
      if (isAuthenticated) {
        const tokenValid = await refreshAccessToken();
        if (!tokenValid) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          return;
        }
      }

      toast.success('Connection restored. Syncing data...', { id: 'connection-restored' });
      syncData();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      // Single deduped toast — id prevents stacking
      toast.error('Connection lost. Working offline...', { id: 'connection-lost' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setOnlineStatus(navigator.onLine);

    if (navigator.onLine) {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
      if (apiBase) {
        const healthUrl = apiBase.replace('/api/v1', '') + '/health';
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        fetch(healthUrl, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' })
          .then(r => { if (!r.ok && r.status !== 404) setOnlineStatus(false); })
          .catch(() => { setOnlineStatus(false); })
          .finally(() => clearTimeout(t));
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync periodically when online
  useEffect(() => {
    if (!isOnline || isOfflineMode || syncQueue.length === 0) return;

    const syncInterval = setInterval(
      () => {
        if (syncQueue.length > 0) {
          syncData();
        }
      },
      30000 // Sync every 30 seconds
    );

    return () => clearInterval(syncInterval);
  }, [isOnline, isOfflineMode, syncQueue.length]);

  const value = {
    isOnline,
    syncQueue,
    pendingChanges,
    isSyncing,
    lastSyncTime,
    hasPendingChanges: syncQueue.length > 0,
    addToQueue,
    syncData,
    clearQueue,
    isOfflineMode,
    syncStatus,
    pendingSyncCount: syncQueue.length,
    syncOfflineData: syncData,
    toggleOfflineMode,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export default OfflineContext;
