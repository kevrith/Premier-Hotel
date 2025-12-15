import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  ChefHat,
  Truck,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import PaymentModal from '@/components/PaymentModal';
import OrderStatusTracker from '@/components/OrderStatusTracker';

export default function MyOrders() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      toast.error('Please login to view your orders');
      navigate('/login', { state: { from: '/my-orders' } });
      return;
    }

    // TODO: Fetch orders from API
    // For now, using mock data
    setIsLoading(false);
  }, [isAuthenticated, navigate, user]);

  if (!isAuthenticated) {
    return null;
  }

  const handlePayClick = (order) => {
    setPaymentOrder(order);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (payment) => {
    toast.success('Payment completed successfully!');
    setIsPaymentModalOpen(false);
    setPaymentOrder(null);
    // TODO: Refresh orders to get updated payment status
  };

  const handlePaymentError = (error) => {
    toast.error(error);
  };

  const handleTrackClick = (order) => {
    setTrackedOrder(order);
    setIsTrackerOpen(true);
  };

  const handleStatusUpdate = (newStatus) => {
    // Update order status in local state
    setOrders((prev) =>
      prev.map((order) =>
        order.id === trackedOrder?.id ? { ...order, status: newStatus } : order
      )
    );
  };

  const needsPayment = (order) => {
    return order.paymentStatus !== 'paid' && order.status !== 'cancelled';
  };

  const canTrack = (order) => {
    return ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(order.status);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', label: 'Pending', icon: Clock },
      confirmed: { color: 'bg-blue-500', label: 'Confirmed', icon: CheckCircle },
      preparing: { color: 'bg-purple-500', label: 'Preparing', icon: ChefHat },
      ready: { color: 'bg-green-500', label: 'Ready', icon: CheckCircle },
      delivering: { color: 'bg-indigo-500', label: 'Delivering', icon: Truck },
      delivered: { color: 'bg-gray-500', label: 'Delivered', icon: CheckCircle },
      cancelled: { color: 'bg-red-500', label: 'Cancelled', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const OrderCard = ({ order }) => {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order #{order.id.slice(0, 8)}
              </CardTitle>
              <CardDescription>
                {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
              </CardDescription>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Order Items */}
          <div className="space-y-2">
            <p className="font-medium text-sm text-muted-foreground">Items</p>
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>KES {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Location */}
          {order.deliveryLocation && (
            <>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Delivery Location</p>
                <p className="font-medium">{order.deliveryLocation}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Special Instructions */}
          {order.specialInstructions && (
            <>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Special Instructions</p>
                <p>{order.specialInstructions}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Pricing */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>KES {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>KES {order.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">KES {order.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'destructive'}>
                {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <Separator />
          <div className="flex gap-2">
            {canTrack(order) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTrackClick(order)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Track Order
              </Button>
            )}
            {needsPayment(order) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handlePayClick(order)}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}
          </div>

          {/* Estimated Time */}
          {order.status === 'preparing' && order.estimatedReadyTime && (
            <>
              <Separator />
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                <p className="text-blue-900 dark:text-blue-100">
                  Estimated ready time: {format(new Date(order.estimatedReadyTime), 'h:mm a')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ title, description }) => (
    <div className="text-center py-12">
      <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Button onClick={() => navigate('/menu')}>
        Browse Menu
      </Button>
    </div>
  );

  // Filter orders by status
  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track your food orders</p>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No Orders Yet"
            description="You haven't placed any food orders. Start by browsing our menu!"
          />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="all">
                All ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelledOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              {activeOrders.length === 0 ? (
                <EmptyState
                  title="No Active Orders"
                  description="You don't have any orders in progress."
                />
              ) : (
                activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              {completedOrders.length === 0 ? (
                <EmptyState
                  title="No Completed Orders"
                  description="Your completed orders will appear here."
                />
              ) : (
                completedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-6">
              {cancelledOrders.length === 0 ? (
                <EmptyState
                  title="No Cancelled Orders"
                  description="Your cancelled orders will appear here."
                />
              ) : (
                cancelledOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Payment Modal */}
      {paymentOrder && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          referenceType="order"
          referenceId={paymentOrder.id}
          amount={paymentOrder.total}
          description={`Payment for Order #${paymentOrder.id.slice(0, 8)}`}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}

      {/* Order Tracker Dialog */}
      <Dialog open={isTrackerOpen} onOpenChange={setIsTrackerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Track Your Order</DialogTitle>
            <DialogDescription>
              Order #{trackedOrder?.id.slice(0, 8)} - Real-time status updates
            </DialogDescription>
          </DialogHeader>

          {trackedOrder && (
            <div className="py-4">
              <OrderStatusTracker
                orderId={trackedOrder.id}
                currentStatus={trackedOrder.status}
                estimatedTime={trackedOrder.estimatedReadyTime ? format(new Date(trackedOrder.estimatedReadyTime), 'h:mm a') : undefined}
                onStatusUpdate={handleStatusUpdate}
                autoRefresh={true}
                refreshInterval={30000}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
