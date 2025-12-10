import { create } from 'zustand';
import { db } from '@/db/schema';

const useOfflineStore = create((set, get) => ({
  // State
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  syncQueue: [],
  pendingChanges: [],
  isSyncing: false,
  lastSyncTime: null,

  // Actions
  setOnlineStatus: (status) => {
    set({ isOnline: status });

    // Automatically trigger sync when coming online
    if (status && get().syncQueue.length > 0) {
      get().syncData();
    }
  },

  addToQueue: async (action) => {
    const queueItem = {
      id: Date.now().toString(),
      ...action,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    };

    // Add to in-memory queue
    set((state) => ({
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

  removeFromQueue: async (id) => {
    set((state) => ({
      syncQueue: state.syncQueue.filter((item) => item.id !== id),
      pendingChanges: state.pendingChanges.filter((item) => item.id !== id)
    }));

    // Remove from IndexedDB
    try {
      await db.pendingSync.delete(id);
    } catch (error) {
      console.error('Failed to remove from IndexedDB:', error);
    }
  },

  syncData: async () => {
    const { isOnline, syncQueue, isSyncing } = get();

    if (!isOnline || isSyncing || syncQueue.length === 0) {
      return;
    }

    set({ isSyncing: true });

    const failedItems = [];

    for (const item of syncQueue) {
      try {
        // Mock API call - replace with actual API implementation
        console.log('Syncing item:', item);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Remove successfully synced item
        await get().removeFromQueue(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item, error);

        // Increment retry count
        const updatedItem = {
          ...item,
          retryCount: item.retryCount + 1,
          lastError: error.message
        };

        if (updatedItem.retryCount >= updatedItem.maxRetries) {
          // Max retries reached, remove from queue
          console.error('Max retries reached for item:', item);
          await get().removeFromQueue(item.id);
        } else {
          failedItems.push(updatedItem);
        }
      }
    }

    // Update queue with failed items
    if (failedItems.length > 0) {
      set((state) => ({
        syncQueue: failedItems
      }));
    }

    set({
      isSyncing: false,
      lastSyncTime: new Date().toISOString()
    });
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
        syncQueue: items.map((item, index) => ({
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
