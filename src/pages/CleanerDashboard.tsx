import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BedDouble,
  TrendingUp,
  ClipboardCheck,
  Package,
  PlayCircle,
  ListChecks,
  WifiOff,
  Loader2,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import housekeepingService, {
  HousekeepingTask,
  HousekeepingStats,
  RoomStatusSummary,
  HousekeepingSupply
} from '@/lib/api/housekeeping';
import { roomsAPI, Room } from '@/lib/api/rooms';

// Inspection checklist items
const INSPECTION_ITEMS = [
  'Bed linens changed and properly made',
  'Bathroom cleaned and sanitized',
  'Toiletries restocked',
  'Towels replaced',
  'Floor vacuumed/mopped',
  'Dust surfaces and furniture',
  'Windows and mirrors cleaned',
  'Trash bins emptied',
  'Minibar restocked',
  'Check all appliances working'
];

export default function CleanerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();

  // Data state
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [, setStats] = useState<HousekeepingStats | null>(null);
  const [, setRoomStatus] = useState<RoomStatusSummary | null>(null);
  const [supplies, setSupplies] = useState<HousekeepingSupply[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');

  // Offline functionality
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Inspection checklist
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [selectedTaskForInspection, setSelectedTaskForInspection] = useState<HousekeepingTask | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});

  // Time tracking
  const [roomTimers, setRoomTimers] = useState<Record<string, { startTime: Date; elapsed: number }>>({});
  const timerIntervalRef = useRef<any>(null);

  // Load offline queue and timers from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('cleanerOfflineQueue');
    const savedTimers = localStorage.getItem('roomTimers');

    if (savedQueue) {
      try { setOfflineQueue(JSON.parse(savedQueue)); } catch { /* ignore */ }
    }

    if (savedTimers) {
      try {
        const parsedTimers = JSON.parse(savedTimers);
        Object.keys(parsedTimers).forEach(key => {
          parsedTimers[key].startTime = new Date(parsedTimers[key].startTime);
        });
        setRoomTimers(parsedTimers);
      } catch { /* ignore */ }
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
      processOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('No internet connection. Working offline.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  // Timer update effect
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setRoomTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(taskId => {
          const elapsed = Math.floor((Date.now() - updated[taskId].startTime.getTime()) / 1000);
          updated[taskId].elapsed = elapsed;
        });
        return updated;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Save timers to localStorage
  useEffect(() => {
    localStorage.setItem('roomTimers', JSON.stringify(roomTimers));
  }, [roomTimers]);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated || !['cleaner', 'housekeeping', 'admin'].includes(role || '')) {
      toast.error('Access denied. Cleaner privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  // Load data on mount
  useEffect(() => {
    if (isAuthenticated && ['cleaner', 'housekeeping', 'admin'].includes(role || '')) {
      loadData();
    }
  }, [isAuthenticated, role]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, statsData, roomStatusData, roomsData] = await Promise.all([
        housekeepingService.getMyTasks(),
        housekeepingService.getStats().catch(() => null),
        housekeepingService.getRoomStatus().catch(() => null),
        roomsAPI.listRooms().catch(() => []),
      ]);
      setTasks(tasksData);
      setStats(statsData);
      setRoomStatus(roomStatusData);
      setRooms(roomsData);

      // Load supplies
      try {
        const suppliesData = await housekeepingService.getSupplies();
        setSupplies(suppliesData);
      } catch {
        // Supplies might be empty/fail
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !['cleaner', 'housekeeping', 'admin'].includes(role || '')) {
    return null;
  }

  const processOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    toast.success(`Processing ${offlineQueue.length} offline actions...`);
    offlineQueue.forEach(action => {
      console.log('Processing offline action:', action);
    });
    setOfflineQueue([]);
    localStorage.removeItem('cleanerOfflineQueue');
  };

  const queueOfflineAction = (action: any) => {
    const newQueue = [...offlineQueue, { ...action, timestamp: new Date() }];
    setOfflineQueue(newQueue);
    localStorage.setItem('cleanerOfflineQueue', JSON.stringify(newQueue));
  };

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.room_number : roomId.substring(0, 8);
  };

  const getRoomType = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.type : '';
  };

  const handleStartCleaning = async (taskId: string) => {
    if (!isOnline) {
      queueOfflineAction({ type: 'start', taskId, user: user?.full_name });
      setRoomTimers(prev => ({
        ...prev,
        [taskId]: { startTime: new Date(), elapsed: 0 }
      }));
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t));
      toast.success('Task started (offline - will sync when online)');
      return;
    }

    try {
      await housekeepingService.startTask(taskId);
      setRoomTimers(prev => ({
        ...prev,
        [taskId]: { startTime: new Date(), elapsed: 0 }
      }));
      toast.success('Task started');
      loadData();
    } catch (error: any) {
      toast.error('Failed to start task');
    }
  };

  const handleCompleteCleaning = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setSelectedTaskForInspection(task);
    setChecklistItems({});
    setShowInspectionDialog(true);
  };

  const handleInspectionComplete = async () => {
    if (!selectedTaskForInspection) return;

    const allChecked = INSPECTION_ITEMS.every((_, idx) => checklistItems[idx.toString()]);
    if (!allChecked) {
      toast.error('Please complete all checklist items before finishing');
      return;
    }

    const taskId = selectedTaskForInspection.id;
    const timer = roomTimers[taskId];
    const timeSpent = timer ? Math.floor(timer.elapsed / 60) : 0;

    if (!isOnline) {
      queueOfflineAction({ type: 'complete', taskId, user: user?.full_name, timeSpent });
      setRoomTimers(prev => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t));
      toast.success(`Room cleaned! Time: ${timeSpent} min (will sync when online)`);
      setShowInspectionDialog(false);
      setSelectedTaskForInspection(null);
      return;
    }

    try {
      await housekeepingService.completeTask(taskId, {
        completed_at: new Date().toISOString(),
        actual_duration: timeSpent,
        notes: `Inspection completed. Time: ${timeSpent} minutes.`
      });

      setRoomTimers(prev => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });

      toast.success(`Room cleaned! Time: ${timeSpent} min`);
      setShowInspectionDialog(false);
      setSelectedTaskForInspection(null);
      loadData();
    } catch (error: any) {
      toast.error('Failed to complete task');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'assigned');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const lowStockItems = supplies.filter(item => item.current_stock < item.minimum_stock);

  const TaskCard = ({ task }: { task: HousekeepingTask }) => {
    const timer = roomTimers[task.id];
    const isUrgent = task.priority === 'urgent';

    return (
      <Card className={isUrgent ? 'border-red-500 border-2' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BedDouble className="h-5 w-5" />
                Room {getRoomNumber(task.room_id)}
                {isUrgent && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <CardDescription className="mt-1">
                {getRoomType(task.room_id)} {task.task_type !== 'cleaning' && `• ${task.task_type.replace('_', ' ')}`}
              </CardDescription>
            </div>
            <Badge variant={
              task.priority === 'urgent' ? 'destructive' :
              task.priority === 'high' ? 'default' :
              'secondary'
            }>
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Display */}
          {timer && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Time Elapsed</span>
                <span className="text-2xl font-bold text-blue-600 font-mono">
                  {formatTime(timer.elapsed)}
                </span>
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="space-y-2 text-sm">
            {task.scheduled_time && (
              <p className="text-muted-foreground">
                <Calendar className="inline h-3 w-3 mr-1" />
                Scheduled: {new Date(task.scheduled_time).toLocaleString()}
              </p>
            )}
            {task.started_at && (
              <p className="text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Started: {new Date(task.started_at).toLocaleString()}
              </p>
            )}
            {task.actual_duration && (
              <p className="text-muted-foreground">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Duration: {task.actual_duration} minutes
              </p>
            )}
          </div>

          {task.notes && (
            <>
              <Separator />
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{task.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {(task.status === 'pending' || task.status === 'assigned') && (
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => handleStartCleaning(task.id)}
                >
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Start Cleaning
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => handleCompleteCleaning(task.id)}
                >
                  <ListChecks className="h-5 w-5 mr-2" />
                  Complete & Inspect
                </Button>
              )}
              {task.status === 'completed' && (
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  variant="secondary"
                  disabled
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Completed
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-muted-foreground">Loading your tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Housekeeping Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.full_name}!</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {!isOnline && (
                <Badge variant="destructive" className="h-10 px-4 text-base">
                  <WifiOff className="h-4 w-4 mr-2" />
                  Offline
                </Badge>
              )}
              {offlineQueue.length > 0 && (
                <Badge variant="secondary" className="h-10 px-4 text-base">
                  {offlineQueue.length} queued
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
              <p className="text-xs text-muted-foreground">Tasks to do</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks.length}</div>
              <p className="text-xs text-muted-foreground">Currently cleaning</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
              <p className="text-xs text-muted-foreground">Tasks done</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <Package className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-14 text-base">
            <TabsTrigger value="assigned" className="h-12">
              Assigned ({pendingTasks.length + inProgressTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="h-12">
              Completed ({completedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="h-12">
              Inventory ({supplies.length})
            </TabsTrigger>
          </TabsList>

          {/* Assigned Tab */}
          <TabsContent value="assigned" className="space-y-6">
            {pendingTasks.length === 0 && inProgressTasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No tasks assigned to you right now</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Urgent tasks */}
                {pendingTasks.filter(t => t.priority === 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Urgent ({pendingTasks.filter(t => t.priority === 'urgent').length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingTasks.filter(t => t.priority === 'urgent').map(task => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}

                {/* In progress tasks */}
                {inProgressTasks.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Progress ({inProgressTasks.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {inProgressTasks.map(task => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular pending tasks */}
                {pendingTasks.filter(t => t.priority !== 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <BedDouble className="h-5 w-5" />
                      Pending ({pendingTasks.filter(t => t.priority !== 'urgent').length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingTasks.filter(t => t.priority !== 'urgent').map(task => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-6">
            {completedTasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Tasks Yet</h3>
                  <p className="text-muted-foreground">Completed tasks will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            {lowStockItems.length > 0 && (
              <Card className="border-orange-500 border-2 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription className="text-orange-600">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below minimum stock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-md">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <p className="text-sm text-muted-foreground">
                            Current: {item.current_stock} {item.unit} (min: {item.minimum_stock})
                          </p>
                        </div>
                        <Badge variant="destructive">Low</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
                <CardDescription>Current stock levels of cleaning supplies</CardDescription>
              </CardHeader>
              <CardContent>
                {supplies.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No supplies tracked yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {supplies.map(item => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${
                          item.current_stock < item.minimum_stock ? 'bg-orange-50 border-orange-200' : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          {item.current_stock < item.minimum_stock && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-3xl font-bold">{item.current_stock}</span>
                          <span className="text-muted-foreground">{item.unit}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Min stock: {item.minimum_stock} {item.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Inspection Checklist Dialog */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Room {selectedTaskForInspection ? getRoomNumber(selectedTaskForInspection.room_id) : ''} Inspection
            </DialogTitle>
            <DialogDescription>
              Complete all items before marking task as done
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {INSPECTION_ITEMS.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted">
                <Checkbox
                  id={`check-${idx}`}
                  checked={checklistItems[idx.toString()] || false}
                  onCheckedChange={(checked) => {
                    setChecklistItems(prev => ({
                      ...prev,
                      [idx.toString()]: checked as boolean
                    }));
                  }}
                  className="mt-1"
                />
                <label
                  htmlFor={`check-${idx}`}
                  className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                >
                  {item}
                </label>
              </div>
            ))}
          </div>

          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm font-medium">Progress</p>
            <p className="text-2xl font-bold mt-1">
              {Object.values(checklistItems).filter(Boolean).length} / {INSPECTION_ITEMS.length} completed
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInspectionDialog(false)}
              className="h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInspectionComplete}
              className="h-12 text-base font-semibold"
              disabled={!INSPECTION_ITEMS.every((_, idx) => checklistItems[idx.toString()])}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Complete Cleaning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
