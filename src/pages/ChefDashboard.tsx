import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Timer,
  Package,
  BarChart3,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useOrderUpdates, Order } from '@/hooks/useOrderUpdates';
import { ordersApi } from '@/lib/api/orders';
import OfflineService from '@/services/offlineService';
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
import { InventoryManager } from '@/components/Chef/InventoryManager';
import { DailyReporting } from '@/components/Chef/DailyReporting';
import { RecipeReference } from '@/components/Chef/RecipeReference';

// Item prep time database (in minutes)
const ITEM_PREP_TIMES: Record<string, number> = {
  // Fast items (5-10 min)
  'salad': 8,
  'caesar salad': 8,
  'soup': 10,
  'sandwich': 10,
  'club sandwich': 10,
  'fries': 8,
  'coffee': 5,
  'tea': 5,
  'juice': 3,

  // Medium items (12-18 min)
  'burger': 12,
  'pasta': 15,
  'carbonara': 15,
  'spaghetti': 15,
  'omelette': 12,
  'breakfast': 15,

  // Slower items (20-30 min)
  'pizza': 20,
  'steak': 20,
  'salmon': 15,
  'grilled salmon': 15,
  'chicken': 18,
  'grilled chicken': 18,
  'seafood': 20,

  // Default fallback
  'default': 15
};

export default function ChefDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
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

  // Preparation time management
  const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [customPrepTime, setCustomPrepTime] = useState('15');

  // Active tab for main view
  const [activeTab, setActiveTab] = useState('orders');

  // Auth check
  useEffect(() => {
    if (!isAuthenticated || (role !== 'chef' && role !== 'admin' && role !== 'manager')) {
      toast.error('Access denied. Chef privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  // Load initial orders
  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const data = await ordersApi.getKitchenOrders();
        setAllOrders(data);
      } catch (error) {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && (role === 'chef' || role === 'admin' || role === 'manager')) {
      loadOrders();
    }
  }, [isAuthenticated, role, setAllOrders]);

  if (!isAuthenticated || (role !== 'chef' && role !== 'admin' && role !== 'manager')) {
    return null;
  }

  // Refresh orders from API
  const refreshOrders = async () => {
    try {
      const data = await ordersApi.getKitchenOrders();
      console.log('[DEBUG] Refreshed orders:', data.map(o => ({ id: o.id, status: o.status, order_number: o.order_number })));
      setAllOrders(data);
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    }
  };

  // Update order status
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(orderId);
      console.log(`[DEBUG] Updating order ${orderId} to status: ${newStatus}`);
      const updatedOrder = await ordersApi.updateStatus(orderId, { status: newStatus as any });
      console.log('[DEBUG] API returned updated order:', updatedOrder);
      toast.success(`Order updated to ${newStatus}`);
      // Refresh orders to reflect the change
      await refreshOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  // Calculate prep time for an item based on name
  const getItemPrepTime = (itemName: string): number => {
    const nameLower = itemName.toLowerCase();

    // Check for exact match
    if (ITEM_PREP_TIMES[nameLower]) {
      return ITEM_PREP_TIMES[nameLower];
    }

    // Check for partial matches (e.g., "Grilled Salmon with Vegetables" matches "salmon")
    for (const [key, time] of Object.entries(ITEM_PREP_TIMES)) {
      if (nameLower.includes(key)) {
        return time;
      }
    }

    return ITEM_PREP_TIMES['default'];
  };

  // Calculate total prep time for an order based on items
  const calculateOrderPrepTime = (order: Order): number => {
    if (!order.items || order.items.length === 0) {
      return 15; // Default
    }

    // Get max prep time among all items (parallel cooking)
    const maxItemTime = Math.max(
      ...order.items.map((item: any) => {
        const baseTime = getItemPrepTime(item.name);
        const quantity = item.quantity || 1;

        // Add 30% time for quantities > 1 (not linear, some parallelization)
        const quantityMultiplier = 1 + ((quantity - 1) * 0.3);
        return Math.ceil(baseTime * quantityMultiplier);
      })
    );

    return maxItemTime;
  };

  // Calculate cumulative wait time considering kitchen workload
  const calculateCumulativeWaitTime = (order: Order): number => {
    const orderPrepTime = calculateOrderPrepTime(order);

    // Calculate workload from orders ahead in queue
    const ordersAhead = orders.filter(o =>
      (o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing') &&
      new Date(o.created_at) < new Date(order.created_at)
    );

    // Sum up remaining prep time for orders ahead
    const workloadTime = ordersAhead.reduce((total, o) => {
      const oPrepTime = prepTimes[o.id] || calculateOrderPrepTime(o);

      if (o.status === 'preparing') {
        // Estimate 50% time remaining for preparing orders
        return total + (oPrepTime * 0.5);
      } else {
        // Full time for pending/confirmed
        return total + oPrepTime;
      }
    }, 0);

    // Total wait = workload ahead + this order's prep time
    const totalTime = Math.ceil(workloadTime + orderPrepTime);

    // Cap at 120 minutes for sanity
    return Math.min(totalTime, 120);
  };

  // Auto-calculate prep times for new orders
  useEffect(() => {
    orders.forEach(order => {
      if (!prepTimes[order.id]) {
        const estimatedTime = calculateCumulativeWaitTime(order);
        setPrepTimes(prev => ({ ...prev, [order.id]: estimatedTime }));
      }
    });
  }, [orders]);

  // Prep time management
  const openTimeDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCustomPrepTime(prepTimes[orderId]?.toString() || '15');
    setShowTimeDialog(true);
  };

  const handleSetPrepTime = () => {
    if (selectedOrderId) {
      const time = parseInt(customPrepTime);
      if (time > 0 && time <= 120) {
        setPrepTimes({ ...prepTimes, [selectedOrderId]: time });
        toast.success(`Prep time set to ${time} minutes`);
        setShowTimeDialog(false);
      } else {
        toast.error('Please enter a time between 1 and 120 minutes');
      }
    }
  };

  const getEstimatedCompletionTime = (orderId: string) => {
    const prepTime = prepTimes[orderId] || 15;
    const completionTime = new Date(Date.now() + prepTime * 60 * 1000);
    return completionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  // Get time since order
  const getTimeSince = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  // Order Card Component - Kitchen optimized with larger buttons
  const OrderCard = ({ order }: { order: Order }) => (
    <Card className={`${order.priority === 'urgent' ? 'border-red-500 border-2' : ''}`}>
      <CardHeader className="bg-muted/30">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              {order.location}
              <Badge variant={getPriorityVariant(order.priority)} className="text-sm px-2 py-1">
                {order.priority}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-2 text-base">
              <Clock className="h-4 w-4" />
              {getTimeSince(order.created_at)}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">{order.order_number}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Order Items */}
        <div className="space-y-3">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">{item.name}</span>
                <Badge variant="outline" className="text-base px-3 py-1">x{item.quantity}</Badge>
              </div>
              {item.customizations && Object.keys(item.customizations).length > 0 && (
                <div className="text-sm text-muted-foreground pl-4 space-y-1">
                  {Object.entries(item.customizations).map(([key, value], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span className="font-medium">{key}: {String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.special_instructions && (
                <div className="text-sm bg-yellow-50 text-yellow-800 p-2 rounded">
                  <span className="font-bold">Note:</span> {item.special_instructions}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prep Time Estimate - AUTO-CALCULATED */}
        {prepTimes[order.id] && (
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Est. Ready:</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {getEstimatedCompletionTime(order.id)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                {prepTimes[order.id]} min total wait
              </span>
              <span className="text-blue-600 font-medium">
                ({calculateOrderPrepTime(order)} min prep + queue)
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-2 italic">
              Auto-calculated based on items & kitchen workload
            </p>
          </div>
        )}

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <p className="text-sm font-bold text-yellow-900 mb-1">⚠️ Special Instructions:</p>
            <p className="text-base font-semibold text-yellow-800">{order.special_instructions}</p>
          </div>
        )}

        {/* Action Buttons - LARGE & TOUCH-FRIENDLY */}
        <div className="flex flex-col gap-3 pt-2">
          {order.status === 'pending' && (
            <Button
              onClick={() => handleStatusUpdate(order.id, 'confirmed')}
              disabled={updating === order.id}
              className="h-14 text-lg font-bold"
              size="lg"
            >
              {updating === order.id ? (
                <>
                  <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Accept Order
                </>
              )}
            </Button>
          )}

          {order.status === 'confirmed' && (
            <>
              <Button
                onClick={() => handleStatusUpdate(order.id, 'preparing')}
                disabled={updating === order.id}
                className="h-14 text-lg font-bold"
                size="lg"
              >
                {updating === order.id ? (
                  <>
                    <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <ChefHat className="h-6 w-6 mr-2" />
                    Start Preparing
                  </>
                )}
              </Button>
              <Button
                onClick={() => openTimeDialog(order.id)}
                variant="outline"
                className="h-12 text-base font-semibold"
              >
                <Timer className="h-5 w-5 mr-2" />
                Set Prep Time {prepTimes[order.id] ? `(${prepTimes[order.id]}m)` : ''}
              </Button>
            </>
          )}

          {order.status === 'preparing' && (
            <>
              <Button
                onClick={() => handleStatusUpdate(order.id, 'ready')}
                disabled={updating === order.id}
                className="h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {updating === order.id ? (
                  <>
                    <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    Mark as Ready
                  </>
                )}
              </Button>
              <Button
                onClick={() => openTimeDialog(order.id)}
                variant="outline"
                className="h-12 text-base font-semibold"
              >
                <Timer className="h-5 w-5 mr-2" />
                Adjust Time {prepTimes[order.id] ? `(${prepTimes[order.id]}m)` : ''}
              </Button>
            </>
          )}

          {order.status === 'ready' && (
            <Button
              variant="outline"
              disabled
              className="h-14 text-lg font-bold bg-green-50 border-green-500"
              size="lg"
            >
              <CheckCircle2 className="h-6 w-6 mr-2 text-green-600" />
              Ready for Pickup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
              <ChefHat className="h-10 w-10" />
              Kitchen Dashboard
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Manage orders and kitchen operations
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* WebSocket Status */}
            {isConnected ? (
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-base">
                <Wifi className="h-5 w-5 text-green-500" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-base">
                <WifiOff className="h-5 w-5 text-red-500" />
                Offline
              </Badge>
            )}

            {/* New Orders Badge */}
            {newOrderCount > 0 && (
              <Badge
                variant="destructive"
                className="cursor-pointer px-4 py-2 text-base font-bold"
                onClick={clearNewOrderCount}
              >
                {newOrderCount} new order{newOrderCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Tabs - Kitchen View */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14">
            <TabsTrigger value="orders" className="text-base font-semibold">
              <ChefHat className="h-5 w-5 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-base font-semibold">
              <Package className="h-5 w-5 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-base font-semibold">
              <BarChart3 className="h-5 w-5 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="recipes" className="text-base font-semibold">
              <BookOpen className="h-5 w-5 mr-2" />
              Recipes
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="text-base">Pending</CardDescription>
                  <CardTitle className="text-4xl font-bold">{pendingOrders.length}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="text-base">In Progress</CardDescription>
                  <CardTitle className="text-4xl font-bold text-blue-600">{preparingOrders.length}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="text-base">Ready</CardDescription>
                  <CardTitle className="text-4xl font-bold text-green-600">{readyOrders.length}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="text-base">Total Active</CardDescription>
                  <CardTitle className="text-4xl font-bold">{orders.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Orders Sections */}
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="pending" className="text-base">
                  Pending ({pendingOrders.length})
                </TabsTrigger>
                <TabsTrigger value="preparing" className="text-base">
                  Preparing ({preparingOrders.length})
                </TabsTrigger>
                <TabsTrigger value="ready" className="text-base">
                  Ready ({readyOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">Loading orders...</p>
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">No pending orders</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {pendingOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preparing" className="space-y-4">
                {preparingOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">No orders in progress</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {preparingOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ready" className="space-y-4">
                {readyOrders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">No orders ready</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6">
                    {readyOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <InventoryManager />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <DailyReporting />
          </TabsContent>

          {/* Recipes Tab */}
          <TabsContent value="recipes">
            <RecipeReference />
          </TabsContent>
        </Tabs>
      </div>

      {/* Prep Time Dialog */}
      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Set Preparation Time</DialogTitle>
            <DialogDescription className="text-base">
              How long will this order take to prepare?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Minutes</Label>
              <Input
                type="number"
                value={customPrepTime}
                onChange={(e) => setCustomPrepTime(e.target.value)}
                className="text-2xl h-16 text-center font-bold"
                min="1"
                max="120"
              />
              <p className="text-sm text-muted-foreground">
                Enter preparation time between 1 and 120 minutes
              </p>
            </div>

            {customPrepTime && parseInt(customPrepTime) > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-base font-medium">Estimated completion:</p>
                <p className="text-3xl font-bold mt-2">
                  {new Date(Date.now() + parseInt(customPrepTime) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeDialog(false)} className="h-12 text-base">
              Cancel
            </Button>
            <Button onClick={handleSetPrepTime} className="h-12 text-base font-semibold">
              Set Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
