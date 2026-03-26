import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, ChefHat, CheckCircle, Truck, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const statusSteps = [
  { 
    key: 'received', 
    label: 'Order Received', 
    description: 'We have received your order',
    icon: CheckCircle,
    color: 'text-blue-500'
  },
  { 
    key: 'confirmed', 
    label: 'Order Confirmed', 
    description: 'Your order has been confirmed',
    icon: CheckCircle,
    color: 'text-green-500'
  },
  { 
    key: 'preparing', 
    label: 'Preparing', 
    description: 'Our chef is preparing your meal',
    icon: ChefHat,
    color: 'text-orange-500'
  },
  { 
    key: 'ready', 
    label: 'Ready for Delivery', 
    description: 'Your order is ready',
    icon: Clock,
    color: 'text-purple-500'
  },
  { 
    key: 'delivering', 
    label: 'Out for Delivery', 
    description: 'Your order is on the way',
    icon: Truck,
    color: 'text-blue-600'
  },
  { 
    key: 'delivered', 
    label: 'Delivered', 
    description: 'Enjoy your meal!',
    icon: MapPin,
    color: 'text-green-600'
  }
];

export default function OrderTracker({ orderId, className }) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderStatus();
      subscribeToOrderUpdates();
    }
  }, [orderId]);

  const fetchOrderStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        setError('Failed to fetch order status');
        console.error('Error fetching order:', error);
      } else {
        setOrder(data);
      }
    } catch (err) {
      setError('An error occurred while fetching order status');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToOrderUpdates = () => {
    const subscription = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          setOrder(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    return statusSteps.findIndex(step => step.key === order.order_status);
  };

  const getProgressPercentage = () => {
    const currentIndex = getCurrentStepIndex();
    return ((currentIndex + 1) / statusSteps.length) * 100;
  };

  const getEstimatedDeliveryTime = () => {
    if (!order?.estimated_delivery_time) return null;
    
    const estimatedTime = new Date(order.estimated_delivery_time);
    const now = new Date();
    const minutesRemaining = Math.max(0, Math.round((estimatedTime - now) / 60000));
    
    if (minutesRemaining === 0) return 'Soon';
    if (minutesRemaining < 60) return `${minutesRemaining} min`;
    
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !order) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-destructive text-center">{error || 'Order not found'}</p>
        </CardContent>
      </Card>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const estimatedTime = getEstimatedDeliveryTime();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Order Tracking</CardTitle>
          <Badge variant="outline" className="text-sm">
            Order #{order.order_number || order.id.slice(0, 8)}
          </Badge>
        </div>
        {estimatedTime && order.order_status !== 'delivered' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Estimated: {estimatedTime}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={getProgressPercentage()} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Step {currentStepIndex + 1} of {statusSteps.length}
          </p>
        </div>

        {/* Status Steps */}
        <div className="space-y-4">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg transition-all duration-300",
                  isCurrent && "bg-primary/10 ring-2 ring-primary/20",
                  isCompleted && !isCurrent && "opacity-60"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    isCurrent && "text-primary"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {isCompleted && (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Order Details */}
        {order.location_notes && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Delivery Location</p>
            <p className="text-sm text-muted-foreground">{order.location_notes}</p>
          </div>
        )}

        {order.special_instructions && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Special Instructions</p>
            <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}