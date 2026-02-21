import React, { createContext, useContext, useEffect } from 'react';
import useOfflineStore from '@/stores/offlineStore';
import useAuthStore from '@/stores/authStore.secure';
import { toast } from 'react-hot-toast';

const OfflineContext = createContext(undefined);

export function OfflineProvider({ children }) {
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
    // Load pending changes from IndexedDB on mount
    loadQueueFromStorage();

    // Setup online/offline event listeners
    const handleOnline = () => {
      setOnlineStatus(true);
      toast.success('Connection restored. Syncing data...');
      syncData();

      // Re-validate auth session after coming back online
      const { isOfflineSession, checkAuth } = useAuthStore.getState();
      if (isOfflineSession) {
        checkAuth().then((valid) => {
          if (!valid) {
            toast.error('Your session has expired. Please log in again.');
          }
        });
      }
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      toast.error('Connection lost. Working offline...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial online status
    setOnlineStatus(navigator.onLine);

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
