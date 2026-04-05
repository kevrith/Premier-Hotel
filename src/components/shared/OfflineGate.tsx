import { WifiOff } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';

interface Props {
  children: React.ReactNode;
  /** Message to show when offline. Defaults to a generic one. */
  message?: string;
  /** If true, render children even when offline (useful when data is cached). */
  allowOffline?: boolean;
}

/**
 * Wrap any section that requires a live network connection.
 * When the device is offline it renders a friendly notice instead of crashing.
 *
 * Usage:
 *   <OfflineGate message="Reports require an internet connection.">
 *     <ReportsContent />
 *   </OfflineGate>
 */
export function OfflineGate({ children, message, allowOffline = false }: Props) {
  const { isOnline } = useOffline();

  if (!isOnline && !allowOffline) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-muted-foreground">
        <WifiOff className="h-12 w-12 opacity-40" />
        <div>
          <p className="text-base font-medium text-foreground">You are offline</p>
          <p className="text-sm mt-1 max-w-xs">
            {message ?? 'This feature requires an internet connection. Please reconnect and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
