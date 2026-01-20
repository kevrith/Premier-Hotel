import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  GitMerge,
  Trash2
} from 'lucide-react';
import OfflineService from '@/services/offlineService';
import { useOffline } from '@/contexts/OfflineContext';
import { toast } from 'react-hot-toast';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

export function OfflineStatusDashboard() {
  const {
    isOnline,
    syncQueue,
    isSyncing,
    lastSyncTime,
    syncData
  } = useOffline();

  const [stats, setStats] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadConflicts();

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      loadStats();
      loadConflicts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const storageStats = await OfflineService.getStorageStats();
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConflicts = async () => {
    try {
      const unresolvedConflicts = await OfflineService.getConflicts();
      setConflicts(unresolvedConflicts);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const handleCleanup = async () => {
    try {
      await OfflineService.cleanupOldCache(7);
      toast.success('Old cache data cleaned up');
      await loadStats();
    } catch (error) {
      console.error('Failed to cleanup:', error);
      toast.error('Failed to cleanup cache');
    }
  };

  const handleSync = async () => {
    try {
      await syncData();
      toast.success('Sync initiated');
      await loadStats();
      await loadConflicts();
    } catch (error) {
      console.error('Failed to sync:', error);
      toast.error('Sync failed');
    }
  };

  const getSyncProgress = () => {
    if (!isSyncing || syncQueue.length === 0) return 0;
    // This is a placeholder - would need actual progress tracking
    return 50;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Connection Status */}
        <Card className={isOnline ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <Wifi className="h-6 w-6 text-green-600" />
                ) : (
                  <WifiOff className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <CardTitle className="text-xl">
                    {isOnline ? 'Online' : 'Offline'}
                  </CardTitle>
                  <CardDescription>
                    {isOnline
                      ? 'Connected to server'
                      : 'Working offline - changes will sync when connection is restored'}
                  </CardDescription>
                </div>
              </div>
              {isOnline && (
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              )}
            </div>
          </CardHeader>

          {isSyncing && (
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Syncing {syncQueue.length} items...</span>
                  <span>{getSyncProgress()}%</span>
                </div>
                <Progress value={getSyncProgress()} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Sync Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Sync
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{syncQueue.length}</div>
              <p className="text-xs text-muted-foreground">
                {syncQueue.length === 0 ? 'All synced' : 'Items waiting to sync'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conflicts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {conflicts.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {conflicts.length === 0 ? 'No conflicts' : 'Need resolution'}
              </p>
              {conflicts.length > 0 && (
                <Button
                  onClick={() => setShowConflictDialog(true)}
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                >
                  Resolve Conflicts
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Sync
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastSyncTime
                  ? `${Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000)} min ago`
                  : 'No sync yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Storage Statistics */}
        {stats && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  <CardTitle>Offline Storage</CardTitle>
                </div>
                <Button
                  onClick={handleCleanup}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cleanup Old Data
                </Button>
              </div>
              <CardDescription>
                Data cached for offline access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Orders</p>
                  <p className="text-2xl font-bold">{stats.orders}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Bookings</p>
                  <p className="text-2xl font-bold">{stats.bookings}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Menu Items</p>
                  <p className="text-2xl font-bold">{stats.menuItems}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cart Items</p>
                  <p className="text-2xl font-bold">{stats.cartItems}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Order History</p>
                  <p className="text-2xl font-bold">{stats.orderHistory}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Booking History</p>
                  <p className="text-2xl font-bold">{stats.bookingHistory}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Pending Sync</p>
                  <p className="text-2xl font-bold">{stats.pendingSync}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Unresolved Conflicts</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.conflicts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Queue Details */}
        {syncQueue.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>Sync Queue</CardTitle>
              </div>
              <CardDescription>
                Items waiting to be synchronized with the server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncQueue.slice(0, 10).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        Priority {item.priority}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {item.action} {item.entityType.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {item.retryCount > 0 && (
                      <Badge variant="destructive">
                        Retry {item.retryCount}/3
                      </Badge>
                    )}
                  </div>
                ))}
                {syncQueue.length > 10 && (
                  <p className="text-sm text-center text-muted-foreground py-2">
                    + {syncQueue.length - 10} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Offline Capabilities</CardTitle>
            <CardDescription>
              Features available without internet connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Customer Features</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                    <li>• Browse menu</li>
                    <li>• Place orders (cash payment)</li>
                    <li>• View order history</li>
                    <li>• View bookings</li>
                    <li>• Access loyalty program</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Staff Features</p>
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                    <li>• Process orders</li>
                    <li>• Update order status</li>
                    <li>• Manage room status</li>
                    <li>• Track activities</li>
                    <li>• Send messages</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        onResolved={() => {
          loadConflicts();
          loadStats();
        }}
      />
    </>
  );
}

export default OfflineStatusDashboard;
