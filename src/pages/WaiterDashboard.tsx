import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Utensils,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Bell,
  MapPin,
  CreditCard,
  Star,
  Plus,
  Volume2,
  VolumeX,
  ArrowRightLeft,
  WifiOff,
  Receipt
} from 'lucide-react';
import { BillsManagement } from '@/components/Bills';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockTables = [
  {
    id: 'T-01',
    number: '12',
    location: 'Main Dining',
    status: 'occupied',
    guests: 4,
    orderStatus: 'in-progress',
    orderTime: new Date(Date.now() - 15 * 60 * 1000),
    totalBill: 4500,
    items: ['Grilled Salmon x2', 'Caesar Salad x2', 'Wine x1']
  },
  {
    id: 'T-02',
    number: '7',
    location: 'Poolside',
    status: 'occupied',
    guests: 2,
    orderStatus: 'ready',
    orderTime: new Date(Date.now() - 25 * 60 * 1000),
    totalBill: 2800,
    items: ['Burger x2', 'Fries x2', 'Soda x2']
  },
  {
    id: 'T-03',
    number: '3',
    location: 'Main Dining',
    status: 'needs-attention',
    guests: 3,
    orderStatus: 'completed',
    orderTime: new Date(Date.now() - 45 * 60 * 1000),
    totalBill: 6200,
    items: ['Steak x1', 'Pizza x2', 'Dessert x3'],
    needsPayment: true
  }
];

const mockRoomService = [
  {
    id: 'RS-001',
    room: '305',
    guest: 'John Doe',
    items: ['Breakfast Combo x2', 'Coffee x2'],
    status: 'pending',
    orderTime: new Date(Date.now() - 5 * 60 * 1000),
    deliveryTime: new Date(Date.now() + 10 * 60 * 1000),
    totalBill: 1500
  },
  {
    id: 'RS-002',
    room: '201',
    guest: 'Jane Smith',
    items: ['Club Sandwich x1', 'Fresh Juice x1'],
    status: 'ready',
    orderTime: new Date(Date.now() - 20 * 60 * 1000),
    deliveryTime: new Date(),
    totalBill: 950
  }
];

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [tables, setTables] = useState(mockTables);
  const [roomService, setRoomService] = useState(mockRoomService);
  const [activeTab, setActiveTab] = useState('tables');

  // Sound notifications
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef(tables.length + roomService.length);

  // Create new order dialog
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    type: 'table', // 'table' or 'room'
    location: '',
    guests: 2,
    items: ''
  });

  // Table transfer dialog
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferForm, setTransferForm] = useState({
    orderId: '',
    currentLocation: '',
    newLocation: ''
  });

  // Offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || (role !== 'waiter' && role !== 'admin')) {
      toast.error('Access denied. Waiter privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  // Sound notification setup
  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Monitor for new orders and play sound
  useEffect(() => {
    const totalOrders = tables.length + roomService.length;
    if (totalOrders > previousOrderCountRef.current && soundEnabled) {
      playNotificationSound();
      announceNewOrder();
    }
    previousOrderCountRef.current = totalOrders;
  }, [tables.length, roomService.length, soundEnabled]);

  // Offline/online detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
      // Process offline queue
      if (offlineQueue.length > 0) {
        processOfflineQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Orders will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  if (!isAuthenticated || (role !== 'waiter' && role !== 'admin')) {
    return null;
  }

  // Sound notification functions
  const playNotificationSound = () => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const announceNewOrder = () => {
    if ('speechSynthesis' in window && soundEnabled) {
      const utterance = new SpeechSynthesisUtterance('New order received');
      utterance.rate = 1.2;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    toast.success(soundEnabled ? 'Sound alerts disabled' : 'Sound alerts enabled');
  };

  // Process offline queue when connection is restored
  const processOfflineQueue = () => {
    // In production, this would send queued orders to the server
    offlineQueue.forEach(order => {
      if (order.type === 'table') {
        handleCreateTableOrder(order, true);
      } else {
        handleCreateRoomOrder(order, true);
      }
    });
    setOfflineQueue([]);
    toast.success(`${offlineQueue.length} queued orders processed`);
  };

  // Create new order handlers
  const handleCreateNewOrder = () => {
    if (!isOnline) {
      // Add to offline queue
      const order = {
        ...newOrderForm,
        id: `OFFLINE-${Date.now()}`,
        timestamp: new Date()
      };
      setOfflineQueue([...offlineQueue, order]);
      toast.success('Order queued for when connection is restored');
      setShowNewOrderDialog(false);
      resetNewOrderForm();
      return;
    }

    if (newOrderForm.type === 'table') {
      handleCreateTableOrder(newOrderForm);
    } else {
      handleCreateRoomOrder(newOrderForm);
    }
  };

  const handleCreateTableOrder = (orderData: any, fromQueue = false) => {
    const newTable = {
      id: `T-${Date.now()}`,
      number: orderData.location,
      location: 'Main Dining',
      status: 'occupied',
      guests: orderData.guests,
      orderStatus: 'in-progress',
      orderTime: new Date(),
      totalBill: 0,
      items: orderData.items.split(',').map((item: string) => item.trim())
    };
    setTables([...tables, newTable]);
    if (!fromQueue) {
      toast.success(`Table ${orderData.location} order created`);
      setShowNewOrderDialog(false);
      resetNewOrderForm();
    }
  };

  const handleCreateRoomOrder = (orderData: any, fromQueue = false) => {
    const newOrder = {
      id: `RS-${Date.now()}`,
      room: orderData.location,
      guest: 'Guest',
      items: orderData.items.split(',').map((item: string) => item.trim()),
      status: 'pending',
      orderTime: new Date(),
      deliveryTime: new Date(Date.now() + 20 * 60 * 1000),
      totalBill: 0
    };
    setRoomService([...roomService, newOrder]);
    if (!fromQueue) {
      toast.success(`Room ${orderData.location} order created`);
      setShowNewOrderDialog(false);
      resetNewOrderForm();
    }
  };

  const resetNewOrderForm = () => {
    setNewOrderForm({
      type: 'table',
      location: '',
      guests: 2,
      items: ''
    });
  };

  // Table transfer handlers
  const handleTransferTable = () => {
    if (transferForm.orderId.startsWith('T-')) {
      setTables(tables.map(table =>
        table.id === transferForm.orderId
          ? { ...table, number: transferForm.newLocation }
          : table
      ));
      toast.success(`Order transferred to Table ${transferForm.newLocation}`);
    } else {
      setRoomService(roomService.map(order =>
        order.id === transferForm.orderId
          ? { ...order, room: transferForm.newLocation }
          : order
      ));
      toast.success(`Order transferred to Room ${transferForm.newLocation}`);
    }
    setShowTransferDialog(false);
    resetTransferForm();
  };

  const openTransferDialog = (orderId: string, currentLocation: string) => {
    setTransferForm({
      orderId,
      currentLocation,
      newLocation: ''
    });
    setShowTransferDialog(true);
  };

  const resetTransferForm = () => {
    setTransferForm({
      orderId: '',
      currentLocation: '',
      newLocation: ''
    });
  };

  const handleServeOrder = (tableId) => {
    setTables(tables.map(table =>
      table.id === tableId ? { ...table, orderStatus: 'served' } : table
    ));
    toast.success('Order marked as served!');
  };

  const handleProcessPayment = (tableId) => {
    toast.success('Payment processed successfully!');
    setTables(tables.filter(table => table.id !== tableId));
  };

  const handleDeliverRoomService = (orderId) => {
    setRoomService(roomService.map(order =>
      order.id === orderId ? { ...order, status: 'delivered' } : order
    ));
    toast.success('Order delivered!');
  };

  const getTimeSince = (date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return `${minutes} min ago`;
  };

  const needsAttention = tables.filter(t => t.status === 'needs-attention' || t.orderStatus === 'ready');
  const activeOrders = tables.filter(t => t.orderStatus === 'in-progress');

  const TableCard = ({ table }) => (
    <Card className={`${table.status === 'needs-attention' ? 'border-orange-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Table {table.number}
              {table.status === 'needs-attention' && (
                <Bell className="h-4 w-4 text-orange-500 animate-bounce" />
              )}
            </CardTitle>
            <CardDescription>{table.location} • {table.guests} guests</CardDescription>
          </div>
          <Badge variant={
            table.orderStatus === 'ready' ? 'default' :
            table.orderStatus === 'in-progress' ? 'secondary' :
            'outline'
          }>
            {table.orderStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Details */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ordered {getTimeSince(table.orderTime)}
          </p>
          <div className="text-sm space-y-1">
            {table.items.map((item, idx) => (
              <p key={idx}>• {item}</p>
            ))}
          </div>
        </div>

        <Separator />

        {/* Bill */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Bill</span>
          <span className="text-lg font-bold text-primary">KES {table.totalBill.toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {table.orderStatus === 'ready' && (
              <Button
                className="flex-1"
                onClick={() => handleServeOrder(table.id)}
              >
                <Utensils className="h-4 w-4 mr-2" />
                Serve Order
              </Button>
            )}
            {table.needsPayment && (
              <Button
                className="flex-1"
                variant="default"
                onClick={() => handleProcessPayment(table.id)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Process Payment
              </Button>
            )}
            {table.orderStatus === 'in-progress' && (
              <Button
                className="flex-1"
                variant="outline"
                disabled
              >
                <Clock className="h-4 w-4 mr-2" />
                In Kitchen
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => openTransferDialog(table.id, `Table ${table.number}`)}
          >
            <ArrowRightLeft className="h-3 w-3 mr-2" />
            Transfer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const RoomServiceCard = ({ order }) => (
    <Card className={`${order.status === 'ready' ? 'border-green-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Room {order.room}
              {order.status === 'ready' && (
                <Bell className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
            <CardDescription>{order.guest}</CardDescription>
          </div>
          <Badge>{order.id}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ordered {getTimeSince(order.orderTime)}
          </p>
          <div className="text-sm space-y-1">
            {order.items.map((item, idx) => (
              <p key={idx}>• {item}</p>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold text-primary">KES {order.totalBill.toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {order.status === 'ready' ? (
            <Button
              className="w-full"
              onClick={() => handleDeliverRoomService(order.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Deliver to Room
            </Button>
          ) : order.status === 'pending' ? (
            <Button
              className="w-full"
              variant="outline"
              disabled
            >
              <Clock className="h-4 w-4 mr-2" />
              Preparing in Kitchen
            </Button>
          ) : (
            <Button
              className="w-full"
              variant="secondary"
              disabled
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Delivered
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => openTransferDialog(order.id, `Room ${order.room}`)}
          >
            <ArrowRightLeft className="h-3 w-3 mr-2" />
            Transfer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
                <Utensils className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Waiter Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.firstName}!</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isOnline && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleSound}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setShowNewOrderDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <Bell className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needsAttention.length}</div>
              <p className="text-xs text-muted-foreground">Orders ready / payment needed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
              <p className="text-xs text-muted-foreground">In kitchen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Served Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">34</div>
              <p className="text-xs text-muted-foreground">+8 from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tips Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES 3,200</div>
              <p className="text-xs text-muted-foreground">Today's tips</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tables">
              Tables ({tables.length})
            </TabsTrigger>
            <TabsTrigger value="room-service">
              Room Service ({roomService.filter(o => o.status !== 'delivered').length})
            </TabsTrigger>
            <TabsTrigger value="bills">
              <Receipt className="h-4 w-4 mr-2" />
              Bills & Payments
            </TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            {needsAttention.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Needs Attention ({needsAttention.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {needsAttention.map(table => (
                    <TableCard key={table.id} table={table} />
                  ))}
                </div>
              </div>
            )}

            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  In Progress ({activeOrders.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeOrders.map(table => (
                    <TableCard key={table.id} table={table} />
                  ))}
                </div>
              </div>
            )}

            {tables.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Utensils className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Active Tables</h3>
                  <p className="text-muted-foreground">All tables are free</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Room Service Tab */}
          <TabsContent value="room-service" className="space-y-6">
            {roomService.filter(o => o.status !== 'delivered').length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Room Service Orders</h3>
                  <p className="text-muted-foreground">Orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {roomService.filter(o => o.status === 'ready').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Ready for Delivery
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roomService.filter(o => o.status === 'ready').map(order => (
                        <RoomServiceCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {roomService.filter(o => o.status === 'pending').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Kitchen
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roomService.filter(o => o.status === 'pending').map(order => (
                        <RoomServiceCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills" className="space-y-6">
            <BillsManagement />
          </TabsContent>
        </Tabs>
      </div>

      {/* New Order Dialog */}
      <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Add a new order for a table or room service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select
                value={newOrderForm.type}
                onValueChange={(value) => setNewOrderForm({ ...newOrderForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table Service</SelectItem>
                  <SelectItem value="room">Room Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{newOrderForm.type === 'table' ? 'Table Number' : 'Room Number'}</Label>
              <Input
                placeholder={newOrderForm.type === 'table' ? 'e.g., 12' : 'e.g., 305'}
                value={newOrderForm.location}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, location: e.target.value })}
              />
            </div>

            {newOrderForm.type === 'table' && (
              <div className="space-y-2">
                <Label>Number of Guests</Label>
                <Select
                  value={newOrderForm.guests.toString()}
                  onValueChange={(value) => setNewOrderForm({ ...newOrderForm, guests: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Guest</SelectItem>
                    <SelectItem value="2">2 Guests</SelectItem>
                    <SelectItem value="3">3 Guests</SelectItem>
                    <SelectItem value="4">4 Guests</SelectItem>
                    <SelectItem value="5">5+ Guests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Items (comma separated)</Label>
              <Input
                placeholder="e.g., Burger x2, Fries x1, Coffee x2"
                value={newOrderForm.items}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, items: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOrderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewOrder}
              disabled={!newOrderForm.location || !newOrderForm.items}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Order Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Order</DialogTitle>
            <DialogDescription>
              Move this order to a different location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Location</Label>
              <Input
                value={transferForm.currentLocation}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>New {transferForm.orderId.startsWith('T-') ? 'Table' : 'Room'} Number</Label>
              <Input
                placeholder={transferForm.orderId.startsWith('T-') ? 'e.g., 15' : 'e.g., 402'}
                value={transferForm.newLocation}
                onChange={(e) => setTransferForm({ ...transferForm, newLocation: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransferTable}
              disabled={!transferForm.newLocation}
            >
              Transfer Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
