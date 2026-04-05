import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import useAuthStore from '@/stores/authStore.secure';
import { useOffline } from '@/contexts/OfflineContext';

export function OfflineSessionBanner() {
  const isOfflineSession = useAuthStore((state) => state.isOfflineSession);
  const isAuthenticated  = useAuthStore((state) => state.isAuthenticated);
  const { isOnline, isSyncing, syncStatus, pendingSyncCount, syncData } = useOffline();

  if (!isAuthenticated) return null;
  if (isOnline && !isOfflineSession && pendingSyncCount === 0 && syncStatus === 'idle') return null;

  // Syncing in progress
  if (isSyncing || syncStatus === 'syncing') {
    return (
      <div className="bg-blue-500 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
        <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
        <span>Syncing {pendingSyncCount} pending action{pendingSyncCount !== 1 ? 's' : ''}…</span>
      </div>
    );
  }

  // Just finished syncing — success
  if (syncStatus === 'success') {
    return (
      <div className="bg-green-500 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>All actions synced successfully</span>
      </div>
    );
  }

  // Sync failed
  if (syncStatus === 'error') {
    return (
      <div className="bg-red-500 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>Some actions failed to sync.</span>
        <button
          onClick={() => syncData()}
          className="underline font-semibold ml-1 hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  // Online but has pending items queued (e.g. just came back online, sync not triggered yet)
  if (isOnline && pendingSyncCount > 0) {
    return (
      <div className="bg-blue-500 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
        <RefreshCw className="h-4 w-4 flex-shrink-0" />
        <span>{pendingSyncCount} action{pendingSyncCount !== 1 ? 's' : ''} waiting to sync.</span>
        <button
          onClick={() => syncData()}
          className="underline font-semibold ml-1 hover:opacity-80"
        >
          Sync now
        </button>
      </div>
    );
  }

  // Offline — no pending or with pending
  return (
    <div className="bg-yellow-500 text-yellow-950 text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>
        {pendingSyncCount > 0
          ? `Working offline — ${pendingSyncCount} action${pendingSyncCount !== 1 ? 's' : ''} will sync when reconnected.`
          : 'You are working offline. Changes will sync when you reconnect.'}
      </span>
    </div>
  );
}
