import { create } from 'zustand';
import { db } from '@/db/schema';
import OfflineService from '@/services/offlineService';
import apiClient from '@/lib/api/client';

const useOfflineStore = create((set, get) => ({
  // State
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  syncQueue: [] as any[],
  pendingChanges: [] as any[],
  isSyncing: false,
  lastSyncTime: null as string | null,
  isOfflineMode: false,
  syncStatus: 'idle' as 'idle' | 'syncing' | 'error' | 'success',

  // Actions
  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status });

    // Automatically trigger sync when coming online
    if (status && !get().isOfflineMode && get().syncQueue.length > 0) {
      get().syncData();
    }
  },

  toggleOfflineMode: () => {
    set((state: any) => ({ isOfflineMode: !state.isOfflineMode }));
  },

  addToQueue: async (action: any) => {
    const queueItem = {
      id: Date.now().toString(),
      ...action,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    };

    // Add to in-memory queue
    set((state: any) => ({
      syncQueue: [...state.syncQueue, queueItem],
      pendingChanges: [...state.pendingChanges, queueItem]
    }));

    // Persist to IndexedDB
    try {
      await db.pendingSync.add({
        action: queueItem.action,
        entityType: queueItem.entityType,
        data: queueItem.data,
        timestamp: queueItem.timestamp,
        priority: queueItem.priority || 5
      });
    } catch (error) {
      console.error('Failed to persist to IndexedDB:', error);
    }
  },

  removeFromQueue: async (id: string) => {
    set((state: any) => ({
      syncQueue: state.syncQueue.filter((item: any) => item.id !== id),
      pendingChanges: state.pendingChanges.filter((item: any) => item.id !== id)
    }));

    // Remove from IndexedDB
    try {
      await db.pendingSync.delete(id);
    } catch (error) {
      console.error('Failed to remove from IndexedDB:', error);
    }
  },

  syncData: async () => {
    const { isOnline, syncQueue, isSyncing, isOfflineMode } = get();

    if (!isOnline || isOfflineMode || isSyncing || syncQueue.length === 0) {
      return;
    }

    set({ isSyncing: true, syncStatus: 'syncing' });

    try {
      const result = await OfflineService.processSyncQueue(apiClient);

      // Reload the queue from IndexedDB (successfully synced items already removed)
      await get().loadQueueFromStorage();

      set({
        isSyncing: false,
        syncStatus: result.failed > 0 ? 'error' : 'success',
        lastSyncTime: new Date().toISOString(),
      });

      // Reset status back to idle after a delay
      setTimeout(() => set({ syncStatus: 'idle' }), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      set({ isSyncing: false, syncStatus: 'error' });

      // Reset error status after a delay
      setTimeout(() => set({ syncStatus: 'idle' }), 5000);
    }
  },

  clearQueue: () => {
    set({ syncQueue: [], pendingChanges: [] });
    // Clear IndexedDB
    db.pendingSync.clear().catch(console.error);
  },

  loadQueueFromStorage: async () => {
    try {
      const items = await db.pendingSync.orderBy('priority').reverse().toArray();
      set({
        syncQueue: items.map((item) => ({
          id: item.id,
          ...item,
          retryCount: 0,
          maxRetries: 3
        })),
        pendingChanges: items
      });
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
    }
  }
}));

// Initialize online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });

  // Load queue on init
  useOfflineStore.getState().loadQueueFromStorage();
}

export default useOfflineStore;
