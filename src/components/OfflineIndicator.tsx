import { useOffline } from '@/contexts/OfflineContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator({ className, showDetails = false }) {
  const { 
    isOnline, 
    isOfflineMode, 
    syncStatus, 
    pendingSyncCount, 
    syncOfflineData, 
    toggleOfflineMode 
  } = useOffline();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-destructive';
    if (isOfflineMode) return 'bg-warning';
    if (syncStatus === 'syncing') return 'bg-primary animate-pulse';
    if (syncStatus === 'error') return 'bg-destructive';
    return 'bg-success';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (isOfflineMode) return <Settings className="h-3 w-3" />;
    if (syncStatus === 'syncing') return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (syncStatus === 'error') return <AlertCircle className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isOfflineMode) return 'Offline Mode';
    if (syncStatus === 'syncing') return 'Syncing...';
    if (syncStatus === 'error') return 'Sync Error';
    return 'Online';
  };

  const getTooltipContent = () => {
    let content = getStatusText();
    
    if (pendingSyncCount > 0) {
      content += ` • ${pendingSyncCount} items pending sync`;
    }
    
    if (!isOnline) {
      content += ' • Limited functionality available';
    } else if (isOfflineMode) {
      content += ' • Manual offline mode enabled';
    }
    
    return content;
  };

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white',
              getStatusColor(),
              'transition-all duration-200'
            )}>
              {getStatusIcon()}
              <span className="hidden sm:inline">{getStatusText()}</span>
            </div>
            
            {pendingSyncCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingSyncCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white',
        getStatusColor()
      )}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {pendingSyncCount > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{pendingSyncCount} pending</span>
          </div>
        )}
        
        {syncStatus === 'error' && (
          <div className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Sync failed</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {isOnline && syncStatus !== 'syncing' && pendingSyncCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={syncOfflineData}
            className="h-8 px-3"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </Button>
        )}
        
        {isOnline && (
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleOfflineMode}
            className="h-8 px-3"
          >
            {isOfflineMode ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Go Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Go Offline
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact version for navbar
export function CompactOfflineIndicator() {
  return <OfflineIndicator className="ml-2" showDetails={false} />;
}

// Detailed version for admin panels
export function DetailedOfflineIndicator() {
  return <OfflineIndicator showDetails={true} />;
}