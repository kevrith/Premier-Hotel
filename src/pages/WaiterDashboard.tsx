import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Plus,
  Volume2,
  VolumeX,
  ArrowRightLeft,
  WifiOff,
  Receipt,
  RefreshCw,
  Wifi
} from 'lucide-react';
import { BillsManagement } from '@/components/Bills';
import { toast } from 'react-hot-toast';
import { ordersApi, Order } from '@/lib/api/orders';
import { useOrderUpdates } from '@/hooks/useOrderUpdates';
import { formatDistanceToNow } from 'date-fns';
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
import { orderPaymentsApi, OrderPaymentRequest } from '@/lib/api/orderPayments';
import { combinedCheckoutApi, CombinedCheckoutRequest } from '@/lib/api/combinedCheckout';
import { Textarea } from '@/components/ui/textarea';
import { Smartphone, Banknote } from 'lucide-react';

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState('tables');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Real-time order updates
  const {
    orders,
    newOrderCount,
    isConnected,
    clearNewOrderCount,
    setAllOrders
  } = useOrderUpdates({
    playSound: true,
    showNotifications: true,
    showToasts: true
  });

  // Sound notifications
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create new order dialog
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    type: 'table' as 'table' | 'room',
    location: '',
    guests: 2,
    customerName: '',
    customerPhone: ''
  });

  // Table transfer dialog
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferForm, setTransferForm] = useState({
    orderId: '',
    currentLocation: '',
    newLocation: ''
  });

  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [processing, setProcessing] = useState(false);

  // Combined checkout dialog
  const [showCombinedCheckoutDialog, setShowCombinedCheckoutDialog] = useState(false);
  const [selectedRoomForCheckout, setSelectedRoomForCheckout] = useState<string>('');

  // Offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!isAuthenticated || (role !== 'waiter' && role !== 'admin' && role !== 'manager')) {
      toast.error('Access denied. Waiter privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  // Load initial orders
  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        // Get all active orders (pending, confirmed, preparing, ready)
        const data = await ordersApi.getAll({ limit: 100 });
        console.log('All orders loaded:', data);
        
        // Filter to show active orders only (including served orders with unpaid bills)
        const activeOrders = data.filter(o =>
          ['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status)
        );
        
        console.log('Active orders after filtering:', activeOrders);
        
        setAllOrders(activeOrders);
      } catch (error) {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && (role === 'waiter' || role === 'admin' || role === 'manager')) {
      loadOrders();
    }
  }, [isAuthenticated, role, setAllOrders]);

  // Sound notification setup
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Offline/online detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isAuthenticated || (role !== 'waiter' && role !== 'admin' && role !== 'manager')) {
    return null;
  }

  // Toggle sound
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    toast.success(soundEnabled ? 'Sound alerts disabled' : 'Sound alerts enabled');
  };

  // Refresh orders
  const refreshOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getAll({ limit: 100 });
      const activeOrders = data.filter(o =>
        ['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status)
      );
      setAllOrders(activeOrders);
      toast.success('Orders refreshed');
    } catch (error) {
      console.error('Failed to refresh orders:', error);
      toast.error('Failed to refresh orders');
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(orderId);
      await ordersApi.updateStatus(orderId, { status: newStatus as any });
      toast.success(`Order updated to ${newStatus}`);
      // Refresh orders to get latest state
      refreshOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  // Navigate to menu to create order
  const handleCreateNewOrder = () => {
    // Navigate to menu page with order context
    const locationType = newOrderForm.type;
    const location = newOrderForm.location;

    if (!location) {
      toast.error('Please enter a location');
      return;
    }

    // Store order context and navigate to menu
    const orderContext = {
      location_type: locationType,
      location: locationType === 'table' ? `Table ${location}` : `Room ${location}`,
      customer_name: newOrderForm.customerName,
      customer_phone: newOrderForm.customerPhone
    };
    
    console.log('WaiterDashboard: Storing orderContext:', orderContext);
    sessionStorage.setItem('orderContext', JSON.stringify(orderContext));

    setShowNewOrderDialog(false);
    navigate('/menu');
  };

  const resetNewOrderForm = () => {
    setNewOrderForm({
      type: 'table',
      location: '',
      guests: 2,
      customerName: '',
      customerPhone: ''
    });
  };

  // Table transfer handlers
  const handleTransferTable = async () => {
    try {
      // Update the order's location
      await ordersApi.update(transferForm.orderId, {
        notes: `Transferred from ${transferForm.currentLocation} to ${transferForm.newLocation}`
      });
      toast.success(`Order transferred to ${transferForm.newLocation}`);
      setShowTransferDialog(false);
      resetTransferForm();
      refreshOrders();
    } catch (error) {
      console.error('Failed to transfer order:', error);
      toast.error('Failed to transfer order');
    }
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

  // Handle payment click
  const handlePaymentClick = (order: Order) => {
    setSelectedOrderForPayment(order);
    setShowPaymentDialog(true);
  };

  // Handle payment completion
  const handlePaymentComplete = async (paymentMethod: string, amount: number, mpesaPhone?: string, cardRef?: string, notes?: string, roomNumber?: string) => {
    if (!selectedOrderForPayment) return;

    try {
      setProcessing(true);
      
      const paymentData: OrderPaymentRequest = {
        order_id: selectedOrderForPayment.id,
        payment_method: paymentMethod as 'cash' | 'mpesa' | 'card' | 'room_charge',
        amount: amount,
        mpesa_phone: mpesaPhone,
        card_reference: cardRef,
        notes: notes,
        room_number: roomNumber
      };
      
      const result = await orderPaymentsApi.processPayment(paymentData);
      
      if (result.success) {
        toast.success(result.message);
        
        // Refresh orders to reflect the change
        try {
          await refreshOrders();
        } catch (refreshError) {
          console.error('Failed to refresh orders:', refreshError);
        }
        
        // Close dialog
        setShowPaymentDialog(false);
        setSelectedOrderForPayment(null);
      } else {
        toast.error('Payment processing failed');
      }
    } catch (error: any) {
      console.error('Payment completion failed:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  // Get time since order
  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  // Filter orders by location type
  const tableOrders = orders.filter(o => o.location_type === 'table');
  const roomOrders = orders.filter(o => o.location_type === 'room');

  // Orders needing attention (ready for pickup)
  const needsAttention = orders.filter(o => o.status === 'ready');
  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));

  // Order Card Component
  const OrderCard = ({ order }: { order: Order }) => {
    const isReady = order.status === 'ready';
    const isPending = order.status === 'pending' || order.status === 'confirmed';
    const isPreparing = order.status === 'preparing';
    const isServed = order.status === 'served';
    const isMyOrder = !order.assigned_waiter_id || order.assigned_waiter_id === user?.id;
    const isOtherWaiterOrder = role === 'waiter' && order.assigned_waiter_id && order.assigned_waiter_id !== user?.id;

    return (
      <Card className={`${isReady ? 'border-green-500 border-2' : ''} ${isOtherWaiterOrder ? 'opacity-60' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {order.location}
                {isReady && (
                  <Bell className="h-4 w-4 text-green-500 animate-bounce" />
                )}
                {isOtherWaiterOrder && (
                  <Badge variant="outline" className="text-xs">
                    👤 {order.assigned_waiter?.full_name || 'Another waiter'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {getTimeSince(order.created_at)}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">{order.order_number}</Badge>
              <Badge variant={
                isReady ? 'default' :
                isPreparing ? 'secondary' :
                isServed ? 'outline' :
                'secondary' as any
              }>
                {order.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Items */}
          <div className="space-y-2">
            <div className="text-sm space-y-1">
              {order.items.map((item: any, idx: number) => (
                <p key={idx} className="flex justify-between">
                  <span>• {item.name}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </p>
              ))}
            </div>
          </div>

          {order.special_instructions && (
            <div className="p-2 bg-yellow-50 rounded text-sm text-yellow-800">
              <span className="font-medium">Note:</span> {order.special_instructions}
            </div>
          )}

          {/* Chef Assignment Info */}
          {order.assigned_chef && (
            <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
              <span className="font-medium">👨🍳 Chef:</span> {order.assigned_chef.full_name}
            </div>
          )}

          <Separator />

          {/* Bill */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Bill</span>
            <span className="text-lg font-bold text-primary">
              KES {order.total_amount.toLocaleString()}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {isReady && (
                <Button
                  className="flex-1"
                  onClick={() => handleStatusUpdate(order.id, 'served')}
                  disabled={updating === order.id || isOtherWaiterOrder}
                >
                  {updating === order.id ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Utensils className="h-4 w-4 mr-2" />
                  )}
                  {isOtherWaiterOrder ? 'Assigned to Another Waiter' : 'Serve Order'}
                </Button>
              )}
              {isServed && (
                <>
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => handlePaymentClick(order)}
                    disabled={updating === order.id || isOtherWaiterOrder}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isOtherWaiterOrder ? 'Not Your Order' : 'Process Payment'}
                  </Button>
                  {order.location_type === 'room' && (
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        setSelectedRoomForCheckout(order.location);
                        setShowCombinedCheckoutDialog(true);
                      }}
                      disabled={updating === order.id}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Full Checkout
                    </Button>
                  )}
                </>
              )}
              {(isPending || isPreparing) && (
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {isPreparing ? 'In Kitchen' : 'Pending'}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => openTransferDialog(order.id, order.location)}
            >
              <ArrowRightLeft className="h-3 w-3 mr-2" />
              Transfer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
                <Utensils className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Waiter Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.full_name || user?.email}!</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {/* Connection Status */}
              {isConnected ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-green-500" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3 text-red-500" />
                  Offline
                </Badge>
              )}

              {/* New Orders Badge */}
              {newOrderCount > 0 && (
                <Badge
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={clearNewOrderCount}
                >
                  {newOrderCount} new
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
                variant="outline"
                size="sm"
                onClick={refreshOrders}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              <Button onClick={() => setShowNewOrderDialog(true)}>
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
              <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needsAttention.length}</div>
              <p className="text-xs text-muted-foreground">Orders ready to serve</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Kitchen</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
              <p className="text-xs text-muted-foreground">Being prepared</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Table Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tableOrders.length}</div>
              <p className="text-xs text-muted-foreground">Active tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Room Service</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roomOrders.length}</div>
              <p className="text-xs text-muted-foreground">Room orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tables">
              Tables ({tableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="room-service">
              Room Service ({roomOrders.length})
            </TabsTrigger>
            <TabsTrigger value="bills">
              <Receipt className="h-4 w-4 mr-2" />
              Bills & Payments
            </TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : tableOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Utensils className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Active Table Orders</h3>
                  <p className="text-muted-foreground">Orders will appear here when customers place them</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Ready Orders Section */}
                {tableOrders.filter(o => o.status === 'ready').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Bell className="h-5 w-5 text-green-500" />
                      Ready for Pickup
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {tableOrders.filter(o => o.status === 'ready').map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {/* In Progress Orders */}
                {tableOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Progress
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {tableOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Served Orders */}
                {tableOrders.filter(o => o.status === 'served').length > 0 && (
                  <div className="pb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      Awaiting Payment
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-8">
                      {tableOrders.filter(o => o.status === 'served').map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Room Service Tab */}
          <TabsContent value="room-service" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            ) : roomOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Room Service Orders</h3>
                  <p className="text-muted-foreground">Room service orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Ready for Delivery */}
                {roomOrders.filter(o => o.status === 'ready').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Ready for Delivery
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roomOrders.filter(o => o.status === 'ready').map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Served Orders - Awaiting Payment */}
                {roomOrders.filter(o => o.status === 'served').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      Awaiting Payment
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roomOrders.filter(o => o.status === 'served').map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {/* In Kitchen */}
                {roomOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length > 0 && (
                  <div className="pb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Kitchen
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-8">
                      {roomOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).map(order => (
                        <OrderCard key={order.id} order={order} />
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
              Set up order details, then you'll be taken to the menu to add items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select
                value={newOrderForm.type}
                onValueChange={(value: 'table' | 'room') => setNewOrderForm({ ...newOrderForm, type: value })}
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

            <div className="space-y-2">
              <Label>Customer Name (optional)</Label>
              <Input
                placeholder="e.g., John Doe"
                value={newOrderForm.customerName}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer Phone (optional)</Label>
              <Input
                placeholder="e.g., 0712345678"
                value={newOrderForm.customerPhone}
                onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewOrderDialog(false); resetNewOrderForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewOrder}
              disabled={!newOrderForm.location}
            >
              Continue to Menu
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
              <Label>New Location</Label>
              <Input
                placeholder="e.g., Table 15 or Room 402"
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              {selectedOrderForPayment && (
                <>Order {selectedOrderForPayment.order_number} - KES {selectedOrderForPayment.total_amount.toLocaleString()}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <PaymentMethodSelector
            totalAmount={selectedOrderForPayment?.total_amount || 0}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setShowPaymentDialog(false)}
            isRoomService={selectedOrderForPayment?.location_type === 'room'}
            roomNumber={selectedOrderForPayment?.location}
          />
        </DialogContent>
      </Dialog>

      {/* Combined Checkout Dialog */}
      <CombinedCheckoutDialog
        open={showCombinedCheckoutDialog}
        onOpenChange={setShowCombinedCheckoutDialog}
        roomNumber={selectedRoomForCheckout}
        onCheckoutComplete={refreshOrders}
      />
    </div>
  );
}

// Payment Method Selector Component
function PaymentMethodSelector({ 
  totalAmount, 
  onPaymentComplete, 
  onCancel,
  isRoomService = false,
  roomNumber
}: { 
  totalAmount: number;
  onPaymentComplete: (method: string, amount: number, mpesaPhone?: string, cardRef?: string, notes?: string, roomNumber?: string) => void;
  onCancel: () => void;
  isRoomService?: boolean;
  roomNumber?: string;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'room_charge'>(
    isRoomService ? 'room_charge' : 'cash'
  );
  const [amount, setAmount] = useState(() => totalAmount.toString());
  
  // Update amount when totalAmount prop changes
  useEffect(() => {
    setAmount(totalAmount.toString());
  }, [totalAmount]);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }

    if (paymentMethod === 'card' && !cardRef) {
      toast.error('Please enter card transaction reference');
      return;
    }

    if (paymentMethod === 'room_charge' && !roomNumber) {
      toast.error('Room number is required for room charge');
      return;
    }

    const validPaymentMethods = ['cash', 'mpesa', 'card', 'room_charge'] as const;
    const isValidMethod = (method: string): method is typeof validPaymentMethods[number] => {
      return validPaymentMethods.includes(method as any);
    };
    
    if (!isValidMethod(paymentMethod)) {
      toast.error('Invalid payment method selected');
      return;
    }

    setProcessing(true);

    try {
      await onPaymentComplete(paymentMethod, paymentAmount, mpesaPhone, cardRef, notes, roomNumber);
    } catch (error) {
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const parsedAmount = useMemo(() => parseFloat(amount || '0'), [amount]);
  
  return (
    <div className="space-y-4 py-4">
      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount to Pay</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>

      {/* Payment Method Tabs */}
      <Tabs value={paymentMethod} onValueChange={(value) => {
        const validMethods = ['cash', 'mpesa', 'card', 'room_charge'] as const;
        const isValidMethod = (method: string): method is typeof validMethods[number] => {
          return validMethods.includes(method as any);
        };
        
        if (isValidMethod(value)) {
          setPaymentMethod(value);
        }
      }}>
        <TabsList className={`grid w-full ${isRoomService ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {isRoomService && (
            <TabsTrigger value="room_charge" className="flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              Room
            </TabsTrigger>
          )}
          <TabsTrigger value="cash" className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            Cash
          </TabsTrigger>
          <TabsTrigger value="mpesa" className="flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            M-Pesa
          </TabsTrigger>
          <TabsTrigger value="card" className="flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            Card
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room_charge" className="space-y-2">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Charge to Room {roomNumber}
            </p>
            <p className="text-xs text-blue-700">
              This charge will be added to the guest's room bill and paid at checkout.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="cash" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Accept cash payment from the customer.
          </p>
        </TabsContent>

        <TabsContent value="mpesa" className="space-y-2">
          <Label htmlFor="mpesa_phone">M-Pesa Phone Number</Label>
          <Input
            id="mpesa_phone"
            type="tel"
            placeholder="254712345678"
            value={mpesaPhone}
            onChange={(e) => setMpesaPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Customer will receive STK push to their phone.
          </p>
        </TabsContent>

        <TabsContent value="card" className="space-y-2">
          <Label htmlFor="card_ref">Card Transaction Reference</Label>
          <Input
            id="card_ref"
            placeholder="Enter card transaction ref"
            value={cardRef}
            onChange={(e) => setCardRef(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the reference from your card terminal.
          </p>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any payment notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={processing} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handlePayment} disabled={processing} className="flex-1">
          {processing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay KES ${parsedAmount.toLocaleString()}`
          )}
        </Button>
      </div>
    </div>
  );
}

// Combined Checkout Dialog Component
function CombinedCheckoutDialog({
  open,
  onOpenChange,
  roomNumber,
  onCheckoutComplete
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomNumber: string;
  onCheckoutComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [folio, setFolio] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && roomNumber) {
      loadFolio();
    }
  }, [open, roomNumber]);

  const loadFolio = async () => {
    try {
      setLoading(true);
      const data = await combinedCheckoutApi.getRoomFolio(roomNumber);
      setFolio(data);
    } catch (error: any) {
      console.error('Failed to load folio:', error);
      toast.error('Failed to load room charges');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!folio) return;

    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }

    if (paymentMethod === 'card' && !cardRef) {
      toast.error('Please enter card transaction reference');
      return;
    }

    try {
      setProcessing(true);
      
      const checkoutData: CombinedCheckoutRequest = {
        room_number: roomNumber,
        payment_method: paymentMethod,
        mpesa_phone: mpesaPhone,
        card_reference: cardRef,
        notes: notes
      };

      const result = await combinedCheckoutApi.processCombinedCheckout(checkoutData);
      
      toast.success(result.message);
      onOpenChange(false);
      onCheckoutComplete();
    } catch (error: any) {
      console.error('Checkout failed:', error);
      toast.error(error.response?.data?.detail || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Combined Checkout - {roomNumber}</DialogTitle>
          <DialogDescription>
            Process payment for both room and food/beverage charges
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : folio && folio.total_amount > 0 ? (
          <div className="space-y-4 py-4">
            {/* Charges Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Charges Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {folio.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <Badge variant="outline" className="mt-1">
                        {item.type === 'room' ? 'Room Charge' : 'F&B Charge'}
                      </Badge>
                    </div>
                    <span className="font-bold">KES {item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    KES {folio.total_amount.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cash">
                  <Banknote className="h-3 w-3 mr-1" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value="mpesa">
                  <Smartphone className="h-3 w-3 mr-1" />
                  M-Pesa
                </TabsTrigger>
                <TabsTrigger value="card">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Card
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Accept cash payment from the guest.
                </p>
              </TabsContent>

              <TabsContent value="mpesa" className="space-y-2">
                <Label>M-Pesa Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="254712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                />
              </TabsContent>

              <TabsContent value="card" className="space-y-2">
                <Label>Card Transaction Reference</Label>
                <Input
                  placeholder="Enter card transaction ref"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                />
              </TabsContent>
            </Tabs>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Info Box */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Room charges will be updated in the booking, and F&B charges will be attributed to you as the serving waiter.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-semibold mb-2">No Outstanding Charges</p>
            <p className="text-sm text-muted-foreground mb-4">
              Room {roomNumber} has no unpaid charges at this time.
            </p>
            <div className="text-left max-w-md mx-auto p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">To use Combined Checkout:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Guest must have an active booking (checked-in)</li>
                <li>Or have unpaid F&B bills charged to room</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={processing || !folio || folio.total_amount <= 0}>
            {processing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Process Payment - KES ${folio?.total_amount.toLocaleString() || 0}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
