import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BedDouble,
  TrendingUp,
  ClipboardCheck,
  Wrench,
  Package,
  MessageSquare,
  Send,
  WifiOff,
  PlayCircle,
  StopCircle,
  ListChecks
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const mockRooms = [
  {
    id: 'R-101',
    number: '101',
    floor: '1',
    type: 'Standard Room',
    status: 'pending',
    priority: 'urgent',
    lastCleaned: null,
    checkoutTime: new Date(Date.now() - 30 * 60 * 1000),
    nextCheckin: new Date(Date.now() + 2 * 60 * 60 * 1000),
    notes: 'Guest checked out 30 mins ago. New guest arriving in 2 hours.',
    availability: 'available'
  },
  {
    id: 'R-205',
    number: '205',
    floor: '2',
    type: 'Deluxe Suite',
    status: 'in-progress',
    priority: 'high',
    lastCleaned: null,
    assignedTo: 'Sarah',
    startedAt: new Date(Date.now() - 15 * 60 * 1000),
    notes: 'Deep cleaning required',
    availability: 'available'
  },
  {
    id: 'R-301',
    number: '301',
    floor: '3',
    type: 'Executive Suite',
    status: 'pending',
    priority: 'medium',
    lastCleaned: new Date(Date.now() - 24 * 60 * 60 * 1000),
    notes: 'Daily turnover - guest staying',
    availability: 'available'
  },
  {
    id: 'R-102',
    number: '102',
    floor: '1',
    type: 'Standard Room',
    status: 'completed',
    priority: 'low',
    lastCleaned: new Date(Date.now() - 45 * 60 * 1000),
    cleanedBy: 'Sarah',
    notes: null,
    availability: 'available'
  }
];

const mockMaintenanceIssues = [
  {
    id: 'M-001',
    room: '203',
    issue: 'Leaking faucet in bathroom',
    priority: 'high',
    reportedAt: new Date(Date.now() - 60 * 60 * 1000),
    status: 'pending'
  },
  {
    id: 'M-002',
    room: '305',
    issue: 'Air conditioning not cooling properly',
    priority: 'medium',
    reportedAt: new Date(Date.now() - 120 * 60 * 1000),
    status: 'in-progress'
  }
];

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

// Inventory items for tracking
const initialInventory = [
  { id: 'S-001', name: 'Bed Linens', quantity: 45, unit: 'sets', minStock: 20 },
  { id: 'S-002', name: 'Bath Towels', quantity: 80, unit: 'pcs', minStock: 30 },
  { id: 'S-003', name: 'Hand Towels', quantity: 60, unit: 'pcs', minStock: 25 },
  { id: 'S-004', name: 'Toilet Paper', quantity: 120, unit: 'rolls', minStock: 50 },
  { id: 'S-005', name: 'Shampoo Bottles', quantity: 35, unit: 'pcs', minStock: 20 },
  { id: 'S-006', name: 'Soap Bars', quantity: 40, unit: 'pcs', minStock: 25 },
  { id: 'S-007', name: 'Cleaning Spray', quantity: 8, unit: 'bottles', minStock: 10 },
  { id: 'S-008', name: 'Trash Bags', quantity: 90, unit: 'pcs', minStock: 40 }
];

export default function CleanerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [rooms, setRooms] = useState(mockRooms);
  const [activeTab, setActiveTab] = useState('assigned');

  // Offline functionality
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Inspection checklist
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [selectedRoomForInspection, setSelectedRoomForInspection] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});

  // Time tracking
  const [roomTimers, setRoomTimers] = useState<Record<string, { startTime: Date; elapsed: number }>>({});
  const timerIntervalRef = useRef<any>(null);

  // Inventory management
  const [inventory, setInventory] = useState(initialInventory);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [restockRequests, setRestockRequests] = useState<any[]>([]);

  // Communication
  const [messages, setMessages] = useState<any[]>([]);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Load offline queue and timers from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('cleanerOfflineQueue');
    const savedTimers = localStorage.getItem('roomTimers');

    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    if (savedTimers) {
      const parsedTimers = JSON.parse(savedTimers);
      // Reconstruct Date objects
      Object.keys(parsedTimers).forEach(key => {
        parsedTimers[key].startTime = new Date(parsedTimers[key].startTime);
      });
      setRoomTimers(parsedTimers);
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
        Object.keys(updated).forEach(roomId => {
          const elapsed = Math.floor((Date.now() - updated[roomId].startTime.getTime()) / 1000);
          updated[roomId].elapsed = elapsed;
        });
        return updated;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Save timers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('roomTimers', JSON.stringify(roomTimers));
  }, [roomTimers]);

  useEffect(() => {
    if (!isAuthenticated || (role !== 'cleaner' && role !== 'admin')) {
      toast.error('Access denied. Cleaner privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'cleaner' && role !== 'admin')) {
    return null;
  }

  const processOfflineQueue = () => {
    if (offlineQueue.length === 0) return;

    toast.success(`Processing ${offlineQueue.length} offline actions...`);
    // Process each queued action
    offlineQueue.forEach(action => {
      // Process action (would normally be API calls)
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

  const handleStartCleaning = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (!isOnline) {
      queueOfflineAction({ type: 'start', roomId, user: user?.firstName });
    }

    // Start timer
    setRoomTimers(prev => ({
      ...prev,
      [roomId]: { startTime: new Date(), elapsed: 0 }
    }));

    setRooms(rooms.map(r =>
      r.id === roomId
        ? { ...r, status: 'in-progress', assignedTo: user?.firstName, startedAt: new Date() }
        : r
    ));
    toast.success(`Started cleaning room ${room.number}`);
  };

  const handleCompleteCleaning = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Open inspection checklist
    setSelectedRoomForInspection(room);
    setChecklistItems({});
    setShowInspectionDialog(true);
  };

  const handleInspectionComplete = () => {
    if (!selectedRoomForInspection) return;

    const allChecked = INSPECTION_ITEMS.every((_, idx) => checklistItems[idx.toString()]);

    if (!allChecked) {
      toast.error('Please complete all checklist items before finishing');
      return;
    }

    const roomId = selectedRoomForInspection.id;
    const timer = roomTimers[roomId];
    const timeSpent = timer ? Math.floor(timer.elapsed / 60) : 0;

    if (!isOnline) {
      queueOfflineAction({
        type: 'complete',
        roomId,
        user: user?.firstName,
        timeSpent
      });
    }

    // Stop timer
    setRoomTimers(prev => {
      const updated = { ...prev };
      delete updated[roomId];
      return updated;
    });

    setRooms(rooms.map(r =>
      r.id === roomId
        ? { ...r, status: 'completed', lastCleaned: new Date(), cleanedBy: user?.firstName, timeSpent }
        : r
    ));

    toast.success(`Room ${selectedRoomForInspection.number} marked as clean! Time: ${timeSpent} min`);
    setShowInspectionDialog(false);
    setSelectedRoomForInspection(null);
  };

  const handleUpdateRoomAvailability = (roomId: string, availability: string) => {
    if (!isOnline) {
      queueOfflineAction({ type: 'availability', roomId, availability });
    }

    setRooms(rooms.map(r =>
      r.id === roomId ? { ...r, availability } : r
    ));
    toast.success(`Room availability updated to: ${availability}`);
  };

  const handleRequestRestock = (item: any) => {
    const request = {
      id: `REQ-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      requestedQuantity: item.minStock * 2,
      requestedBy: user?.firstName,
      requestedAt: new Date(),
      status: 'pending'
    };

    if (!isOnline) {
      queueOfflineAction({ type: 'restock', request });
    }

    setRestockRequests([...restockRequests, request]);
    toast.success(`Restock request submitted for ${item.name}`);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: `MSG-${Date.now()}`,
      from: user?.firstName,
      to: 'Front Desk',
      content: newMessage,
      timestamp: new Date(),
      status: isOnline ? 'sent' : 'queued'
    };

    if (!isOnline) {
      queueOfflineAction({ type: 'message', message });
    }

    setMessages([...messages, message]);
    setNewMessage('');
    toast.success(isOnline ? 'Message sent' : 'Message queued for sending');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeSince = (date: Date | null) => {
    if (!date) return 'Never';
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };

  const getTimeUntil = (date: Date | null) => {
    if (!date) return '';
    const minutes = Math.floor((date.getTime() - Date.now()) / 60000);
    if (minutes < 0) return 'Overdue';
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const pendingRooms = rooms.filter(r => r.status === 'pending');
  const inProgressRooms = rooms.filter(r => r.status === 'in-progress');
  const completedRooms = rooms.filter(r => r.status === 'completed');
  const lowStockItems = inventory.filter(item => item.quantity < item.minStock);

  const RoomCard = ({ room }: { room: any }) => {
    const timer = roomTimers[room.id];

    return (
      <Card className={`${room.priority === 'urgent' ? 'border-red-500 border-2' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BedDouble className="h-5 w-5" />
                Room {room.number}
                {room.priority === 'urgent' && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {room.type} • Floor {room.floor}
              </CardDescription>
            </div>
            <Badge variant={
              room.priority === 'urgent' ? 'destructive' :
              room.priority === 'high' ? 'default' :
              'secondary'
            }>
              {room.priority}
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
            {room.checkoutTime && (
              <p className="text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Checkout: {getTimeSince(room.checkoutTime)}
              </p>
            )}
            {room.nextCheckin && (
              <p className="text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Next check-in: {getTimeUntil(room.nextCheckin)}
              </p>
            )}
            {room.lastCleaned && (
              <p className="text-muted-foreground">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Last cleaned: {getTimeSince(room.lastCleaned)}
              </p>
            )}
            {room.startedAt && (
              <p className="text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" />
                Started: {getTimeSince(room.startedAt)}
              </p>
            )}
            {room.assignedTo && (
              <p className="text-muted-foreground">
                Assigned to: {room.assignedTo}
              </p>
            )}
            {room.timeSpent && (
              <p className="text-muted-foreground">
                Cleaning time: {room.timeSpent} minutes
              </p>
            )}
          </div>

          {room.notes && (
            <>
              <Separator />
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{room.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {room.status === 'pending' && (
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => handleStartCleaning(room.id)}
                >
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Start Cleaning
                </Button>
              )}
              {room.status === 'in-progress' && (
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => handleCompleteCleaning(room.id)}
                >
                  <ListChecks className="h-5 w-5 mr-2" />
                  Complete & Inspect
                </Button>
              )}
              {room.status === 'completed' && (
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

            {/* Availability Toggle */}
            {room.status === 'completed' && (
              <div className="flex gap-2">
                <Button
                  variant={room.availability === 'available' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUpdateRoomAvailability(room.id, 'available')}
                >
                  Available
                </Button>
                <Button
                  variant={room.availability === 'unavailable' ? 'destructive' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUpdateRoomAvailability(room.id, 'unavailable')}
                >
                  Unavailable
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
                <h1 className="text-3xl md:text-4xl font-bold">Cleaner Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.firstName}!</p>
              </div>
            </div>

            <div className="flex gap-2">
              {!isOnline && (
                <Badge variant="destructive" className="h-10 px-4 text-base">
                  <WifiOff className="h-4 w-4 mr-2" />
                  Offline Mode
                </Badge>
              )}
              {offlineQueue.length > 0 && (
                <Badge variant="secondary" className="h-10 px-4 text-base">
                  {offlineQueue.length} queued actions
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
              <div className="text-2xl font-bold">{pendingRooms.length}</div>
              <p className="text-xs text-muted-foreground">Rooms to clean</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressRooms.length}</div>
              <p className="text-xs text-muted-foreground">Currently cleaning</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRooms.length}</div>
              <p className="text-xs text-muted-foreground">Rooms cleaned</p>
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
          <TabsList className="grid w-full grid-cols-5 h-14 text-base">
            <TabsTrigger value="assigned" className="h-12">
              Assigned ({pendingRooms.length + inProgressRooms.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="h-12">
              Completed ({completedRooms.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="h-12">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="messages" className="h-12">
              Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="h-12">
              Maintenance
            </TabsTrigger>
          </TabsList>

          {/* Assigned Tab */}
          <TabsContent value="assigned" className="space-y-6">
            {pendingRooms.length === 0 && inProgressRooms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No rooms need cleaning right now</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {pendingRooms.filter(r => r.priority === 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Urgent ({pendingRooms.filter(r => r.priority === 'urgent').length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingRooms.filter(r => r.priority === 'urgent').map(room => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  </div>
                )}

                {inProgressRooms.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Progress ({inProgressRooms.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {inProgressRooms.map(room => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  </div>
                )}

                {pendingRooms.filter(r => r.priority !== 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <BedDouble className="h-5 w-5" />
                      Pending ({pendingRooms.filter(r => r.priority !== 'urgent').length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingRooms.filter(r => r.priority !== 'urgent').map(room => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-6">
            {completedRooms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Rooms Yet</h3>
                  <p className="text-muted-foreground">Completed rooms will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedRooms.map(room => (
                  <RoomCard key={room.id} room={room} />
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
                            Current: {item.quantity} {item.unit} (min: {item.minStock})
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRequestRestock(item)}
                          disabled={!isOnline}
                        >
                          Request Restock
                        </Button>
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
                <div className="grid gap-4 md:grid-cols-2">
                  {inventory.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.quantity < item.minStock ? 'bg-orange-50 border-orange-200' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{item.name}</h4>
                        {item.quantity < item.minStock && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold">{item.quantity}</span>
                        <span className="text-muted-foreground">{item.unit}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Min stock: {item.minStock} {item.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {restockRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Restock Requests</CardTitle>
                  <CardDescription>Your submitted restock requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {restockRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{req.itemName}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested: {req.requestedQuantity} units • {getTimeSince(req.requestedAt)}
                          </p>
                        </div>
                        <Badge>{req.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send Message to Front Desk
                </CardTitle>
                <CardDescription>Communicate with the front desk team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={handleSendMessage} className="w-full h-12 text-base font-semibold">
                  <Send className="h-5 w-5 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>

            {messages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Message History</CardTitle>
                  <CardDescription>Your recent communications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{msg.from} → {msg.to}</Badge>
                            <Badge variant={msg.status === 'sent' ? 'default' : 'outline'}>
                              {msg.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getTimeSince(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Maintenance Issue</CardTitle>
                <CardDescription>Found a problem? Report it to maintenance team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input
                    type="text"
                    placeholder="e.g., 305"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issue Description</Label>
                  <Textarea
                    placeholder="Describe the maintenance issue..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button className="w-full h-12 text-base font-semibold">
                  <Wrench className="h-5 w-5 mr-2" />
                  Report Issue
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reported Issues</CardTitle>
                <CardDescription>Track maintenance requests you've reported</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMaintenanceIssues.map(issue => (
                    <div key={issue.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-semibold">Room {issue.room}</p>
                        <p className="text-sm text-muted-foreground">{issue.issue}</p>
                        <p className="text-xs text-muted-foreground">
                          Reported {getTimeSince(issue.reportedAt)}
                        </p>
                      </div>
                      <Badge variant={
                        issue.status === 'pending' ? 'default' :
                        issue.status === 'in-progress' ? 'secondary' :
                        'outline'
                      }>
                        {issue.status}
                      </Badge>
                    </div>
                  ))}
                </div>
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
              Room {selectedRoomForInspection?.number} Inspection Checklist
            </DialogTitle>
            <DialogDescription>
              Complete all items before marking room as clean
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
