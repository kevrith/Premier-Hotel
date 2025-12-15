/**
 * Order Status Tracker Component
 * Displays real-time order status with visual progress
 */
import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, ChefHat, Truck, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStatusTrackerProps {
  orderId: string;
  currentStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  estimatedTime?: string;
  onStatusUpdate?: (status: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const orderSteps = [
  {
    id: 'pending',
    label: 'Order Placed',
    icon: Clock,
    description: 'Your order has been received'
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    icon: CheckCircle,
    description: 'Order confirmed by kitchen'
  },
  {
    id: 'preparing',
    label: 'Preparing',
    icon: ChefHat,
    description: 'Your food is being prepared'
  },
  {
    id: 'ready',
    label: 'Ready',
    icon: Package,
    description: 'Your order is ready'
  },
  {
    id: 'delivering',
    label: 'Delivering',
    icon: Truck,
    description: 'On the way to you'
  },
  {
    id: 'delivered',
    label: 'Delivered',
    icon: CheckCircle,
    description: 'Enjoy your meal!'
  }
];

export default function OrderStatusTracker({
  orderId,
  currentStatus,
  estimatedTime,
  onStatusUpdate,
  autoRefresh = false,
  refreshInterval = 30000
}: OrderStatusTrackerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh status
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      setIsRefreshing(true);
      try {
        // TODO: Fetch order status from API
        // const response = await api.get(`/orders/${orderId}`);
        // const newStatus = response.data.status;

        // For now, just keep current status
        // if (newStatus !== status) {
        //   setStatus(newStatus);
        //   if (onStatusUpdate) {
        //     onStatusUpdate(newStatus);
        //   }
        // }
      } catch (error) {
        console.error('Failed to refresh order status:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, orderId, status, onStatusUpdate]);

  // Update status when prop changes
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  if (status === 'cancelled') {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-3 text-red-900 dark:text-red-100">
          <Circle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Order Cancelled</p>
            <p className="text-sm opacity-80">This order has been cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  const currentStepIndex = orderSteps.findIndex((step) => step.id === status);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="relative">
      {/* Refreshing Indicator */}
      {isRefreshing && (
        <div className="absolute top-0 right-0 text-xs text-muted-foreground flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Updating...
        </div>
      )}

      {/* Estimated Time */}
      {estimatedTime && (currentStepIndex < orderSteps.length - 1) && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <Clock className="w-4 h-4 inline mr-2" />
            Estimated {status === 'delivering' ? 'delivery' : 'ready'} time: <span className="font-semibold">{estimatedTime}</span>
          </p>
        </div>
      )}

      {/* Progress Steps */}
      <div className="space-y-4">
        {orderSteps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          const Icon = step.icon;
          const isCompleted = stepStatus === 'completed';
          const isCurrent = stepStatus === 'current';
          const isPending = stepStatus === 'pending';

          return (
            <div key={step.id} className="relative">
              {/* Connecting Line */}
              {index < orderSteps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-5 top-12 w-0.5 h-full -ml-px',
                    isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                  )}
                />
              )}

              {/* Step Content */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    isCompleted && 'bg-green-500 border-green-500',
                    isCurrent && 'bg-blue-500 border-blue-500 animate-pulse',
                    isPending && 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      (isCompleted || isCurrent) && 'text-white',
                      isPending && 'text-gray-400 dark:text-gray-600'
                    )}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 pt-1">
                  <p
                    className={cn(
                      'font-semibold',
                      (isCompleted || isCurrent) && 'text-foreground',
                      isPending && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'text-sm',
                      isCurrent && 'text-blue-600 dark:text-blue-400 font-medium',
                      (isCompleted || isPending) && 'text-muted-foreground'
                    )}
                  >
                    {step.description}
                  </p>

                  {/* Current Step Animation */}
                  {isCurrent && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        In progress
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp (optional) */}
                {isCompleted && (
                  <div className="text-xs text-muted-foreground">
                    {/* TODO: Show actual timestamp from order data */}
                    ✓
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Status Message */}
      {status === 'delivered' && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-900 dark:text-green-100 font-medium">
            🎉 Your order has been delivered. Enjoy your meal!
          </p>
        </div>
      )}
    </div>
  );
}
