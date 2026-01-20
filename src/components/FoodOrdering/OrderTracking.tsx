import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, ChefHat, PackageCheck, TruckIcon } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  items: any[];
  total_amount: number;
  estimated_time?: number;
  location: string;
  location_type: string;
  created_at: string;
}

interface OrderTrackingProps {
  orders: Order[];
}

export function OrderTracking({ orders }: OrderTrackingProps) {
  const getStatusConfig = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Order Received',
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          progress: 25
        };
      case 'confirmed':
        return {
          label: 'Confirmed',
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          progress: 40
        };
      case 'preparing':
        return {
          label: 'Being Prepared',
          icon: ChefHat,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          progress: 60
        };
      case 'ready':
        return {
          label: 'Ready for Delivery',
          icon: PackageCheck,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          progress: 80
        };
      case 'delivered':
        return {
          label: 'Delivered',
          icon: TruckIcon,
          color: 'text-green-700',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          progress: 100
        };
    }
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const statusConfig = getStatusConfig(order.status);
        const StatusIcon = statusConfig.icon;

        return (
          <Card key={order.id} className="overflow-hidden animate-in slide-in-from-left duration-300">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.location_type} {order.location}
                  </p>
                </div>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-none`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <Progress value={statusConfig.progress} className="h-2" />
              </div>

              {/* Order Items Summary */}
              <div className="text-sm text-muted-foreground mb-2">
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'} •
                KES {order.total_amount.toLocaleString()}
                {order.estimated_time && order.status !== 'delivered' && (
                  <> • Est. {order.estimated_time} min</>
                )}
              </div>

              {/* Status Timeline */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                {['pending', 'preparing', 'ready', 'delivered'].map((status, index) => {
                  const isCurrent = order.status === status;
                  const isPast = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']
                    .indexOf(order.status) >= index;

                  return (
                    <div key={status} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isPast
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      >
                        {isPast ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                      <span className="text-xs mt-1 text-center capitalize">
                        {status === 'pending' ? 'Received' : status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
