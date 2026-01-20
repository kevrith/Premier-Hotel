import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Check, GitMerge, Server, Smartphone } from 'lucide-react';
import OfflineService from '@/services/offlineService';
import { toast } from 'react-hot-toast';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  onResolved
}: ConflictResolutionDialogProps) {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (open) {
      loadConflicts();
    }
  }, [open]);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const unresolvedConflicts = await OfflineService.getConflicts();
      setConflicts(unresolvedConflicts);
      if (unresolvedConflicts.length > 0) {
        setSelectedConflict(unresolvedConflicts[0]);
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error);
      toast.error('Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (strategy: 'use_local' | 'use_server' | 'merge') => {
    if (!selectedConflict) return;

    setResolving(true);
    try {
      await OfflineService.resolveConflict(selectedConflict.id, strategy);

      toast.success(`Conflict resolved using ${strategy.replace('_', ' ')} strategy`);

      // Reload conflicts
      await loadConflicts();

      if (onResolved) {
        onResolved();
      }

      // Close if no more conflicts
      if (conflicts.length <= 1) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  const formatData = (data: any) => {
    if (!data) return 'No data';
    return JSON.stringify(data, null, 2);
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      'order': 'Order',
      'booking': 'Booking',
      'room_status': 'Room Status',
      'staff_activity': 'Staff Activity'
    };
    return labels[entityType] || entityType;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Conflicts...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              No Conflicts
            </DialogTitle>
            <DialogDescription>
              All data has been synchronized successfully. No conflicts to resolve.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Resolve Data Conflicts ({conflicts.length})
          </DialogTitle>
          <DialogDescription>
            Changes were made offline while the server data was updated. Choose how to resolve each conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Conflict Selector */}
          {conflicts.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {conflicts.map((conflict, index) => (
                <Button
                  key={conflict.id}
                  variant={selectedConflict?.id === conflict.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedConflict(conflict)}
                  className="flex-shrink-0"
                >
                  Conflict {index + 1}
                  <Badge variant="secondary" className="ml-2">
                    {getEntityTypeLabel(conflict.entityType)}
                  </Badge>
                </Button>
              ))}
            </div>
          )}

          {selectedConflict && (
            <div className="space-y-4">
              {/* Conflict Info */}
              <Card className="border-orange-500 border-2 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Conflict Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Entity Type:</span>{' '}
                      {getEntityTypeLabel(selectedConflict.entityType)}
                    </div>
                    <div>
                      <span className="font-medium">Entity ID:</span>{' '}
                      {selectedConflict.entityId}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Detected:</span>{' '}
                      {new Date(selectedConflict.timestamp).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Version Comparison */}
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="comparison">Comparison</TabsTrigger>
                  <TabsTrigger value="local">Local Version</TabsTrigger>
                  <TabsTrigger value="server">Server Version</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Local Version */}
                    <Card className="border-blue-500">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-blue-600" />
                          Your Changes (Local)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                          {formatData(selectedConflict.localVersion)}
                        </pre>
                      </CardContent>
                    </Card>

                    {/* Server Version */}
                    <Card className="border-green-500">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Server className="h-4 w-4 text-green-600" />
                          Server Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                          {formatData(selectedConflict.serverVersion)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="local">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Local Version (Your Changes)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                        {formatData(selectedConflict.localVersion)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="server">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Server Version (Latest Data)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                        {formatData(selectedConflict.serverVersion)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {conflicts.length > 1 && (
                <span>
                  Showing conflict {conflicts.findIndex(c => c.id === selectedConflict?.id) + 1} of {conflicts.length}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={resolving}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolve('use_server')}
                disabled={resolving || !selectedConflict}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <Server className="h-4 w-4 mr-2" />
                Use Server Version
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolve('merge')}
                disabled={resolving || !selectedConflict}
                className="border-purple-500 text-purple-700 hover:bg-purple-50"
              >
                <GitMerge className="h-4 w-4 mr-2" />
                Merge Both
              </Button>
              <Button
                onClick={() => handleResolve('use_local')}
                disabled={resolving || !selectedConflict}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Use My Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionDialog;
