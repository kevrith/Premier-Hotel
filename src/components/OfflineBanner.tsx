/**
 * Offline Banner — Shows connectivity status and pending sync info
 */
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, manualSync } = useOfflineStatus();

  if (isOnline && pendingCount === 0) return null; // Nothing to show when fully online + synced

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2 text-sm font-medium ${
      !isOnline
        ? 'bg-red-600 text-white'
        : 'bg-orange-500 text-white'
    }`}>
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <><WifiOff className="h-4 w-4" />Offline — changes will sync when connection is restored</>
        ) : isSyncing ? (
          <><RefreshCw className="h-4 w-4 animate-spin" />Syncing {pendingCount} pending action(s)...</>
        ) : (
          <><AlertCircle className="h-4 w-4" />{pendingCount} action(s) waiting to sync</>
        )}
      </div>
      {isOnline && !isSyncing && (
        <Button size="sm" variant="outline" className="text-white border-white hover:bg-white/20 h-6 text-xs" onClick={manualSync}>
          <RefreshCw className="h-3 w-3 mr-1" />Sync Now
        </Button>
      )}
    </div>
  );
}
