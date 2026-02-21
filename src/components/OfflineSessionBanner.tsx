import { WifiOff } from 'lucide-react';
import useAuthStore from '@/stores/authStore.secure';
import { useOffline } from '@/contexts/OfflineContext';

export function OfflineSessionBanner() {
  const isOfflineSession = useAuthStore((state) => state.isOfflineSession);
  const { isOnline } = useOffline();

  // Only show when user is in an offline session or device is offline while authenticated
  if (isOnline && !isOfflineSession) return null;
  if (!useAuthStore.getState().isAuthenticated) return null;

  return (
    <div className="bg-yellow-500 text-yellow-950 text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>
        {isOfflineSession
          ? 'You are working offline. Some features may be unavailable. Changes will sync when you reconnect.'
          : 'No internet connection. Limited functionality available.'}
      </span>
    </div>
  );
}
