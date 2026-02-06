/**
 * Order Updates Hook
 * Manages real-time order updates via WebSocket
 */
import { useEffect, useState, useCallback } from 'react';
import { useWebSocket, WS_EVENTS } from './useWebSocket';
import { toast } from 'react-hot-toast';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  location: string;
  location_type: string;
  status: string;
  items: any[];
  subtotal: number;
  tax: number;
  total_amount: number;
  priority: string;
  special_instructions?: string;
  notes?: string;
  assigned_waiter_id?: string;
  assigned_chef_id?: string;
  estimated_ready_time?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  preparing_started_at?: string;
  ready_at?: string;
  served_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

interface OrderUpdatesOptions {
  playSound?: boolean;
  showNotifications?: boolean;
  showToasts?: boolean;
}

export function useOrderUpdates(options: OrderUpdatesOptions = {}) {
  const {
    playSound = true,
    showNotifications = true,
    showToasts = true
  } = options;

  const { isConnected, on } = useWebSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrderCount, setNewOrderCount] = useState(0);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!playSound) return;

    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn('Could not play notification sound:', err);
      });
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }, [playSound]);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!showNotifications) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/logo.png',
          badge: '/logo.png',
          tag: 'premier-hotel-order',
          requireInteraction: true
        });
      } catch (error) {
        console.warn('Could not show browser notification:', error);
      }
    }
  }, [showNotifications]);

  // Handle new order created
  useEffect(() => {
    const unsubscribe = on(WS_EVENTS.ORDER_CREATED, (data) => {
      console.log('New order created:', data);

      // Add to orders list if it's not already there
      setOrders(prev => {
        const exists = prev.some(o => o.id === data.order_id);
        if (exists) return prev;

        const newOrder: Order = {
          id: data.order_id,
          order_number: data.order_number,
          customer_id: data.customer_id || '',
          location: data.location,
          location_type: data.location_type,
          status: 'pending',
          items: data.items || [],
          subtotal: 0,
          tax: 0,
          total_amount: 0,
          priority: data.priority || 'medium',
          special_instructions: data.special_instructions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        return [newOrder, ...prev];
      });

      // Increment new order count
      setNewOrderCount(prev => prev + 1);

      // Show notifications
      if (showToasts) {
        toast.success(data.message || `New order from ${data.location}`, {
          icon: '🔔',
          duration: 8000
        });
      }

      playNotificationSound();
      showBrowserNotification(
        'New Order Received!',
        data.message || `Order ${data.order_number} from ${data.location}`,
        '🔔'
      );
    });

    return unsubscribe;
  }, [on, playNotificationSound, showBrowserNotification, showToasts]);

  // Handle order status changed
  useEffect(() => {
    const unsubscribe = on(WS_EVENTS.ORDER_STATUS_CHANGED, (data) => {
      console.log('Order status changed:', data);

      // Update order in list
      setOrders(prev =>
        prev.map(order =>
          order.id === data.order_id
            ? { ...order, status: data.new_status, updated_at: new Date().toISOString() }
            : order
        )
      );

      // Show notifications
      if (showToasts) {
        const statusEmojis: Record<string, string> = {
          confirmed: '✅',
          preparing: '👨‍🍳',
          ready: '🎉',
          served: '🍽️',
          completed: '✅',
          cancelled: '❌'
        };

        toast.success(data.message || `Order ${data.order_number} is now ${data.new_status}`, {
          icon: statusEmojis[data.new_status] || 'ℹ️',
          duration: 5000
        });
      }
    });

    return unsubscribe;
  }, [on, showToasts]);

  // Handle order ready
  useEffect(() => {
    const unsubscribe = on(WS_EVENTS.ORDER_READY, (data) => {
      console.log('Order ready:', data);

      // Update order status
      setOrders(prev =>
        prev.map(order =>
          order.id === data.order_id
            ? { ...order, status: 'ready', ready_at: new Date().toISOString() }
            : order
        )
      );

      // Show notifications
      if (showToasts) {
        toast.success(data.message || `Order ${data.order_number} is ready!`, {
          icon: '🎉',
          duration: 10000
        });
      }

      playNotificationSound();
      showBrowserNotification(
        'Order Ready!',
        data.message || `Order ${data.order_number} ready at ${data.location}`,
        '🎉'
      );
    });

    return unsubscribe;
  }, [on, playNotificationSound, showBrowserNotification, showToasts]);

  // Handle order delivered
  useEffect(() => {
    const unsubscribe = on(WS_EVENTS.ORDER_DELIVERED, (data) => {
      console.log('Order delivered:', data);

      // Update order status
      setOrders(prev =>
        prev.map(order =>
          order.id === data.order_id
            ? { ...order, status: 'served', served_at: new Date().toISOString() }
            : order
        )
      );

      // Show notifications
      if (showToasts) {
        toast.success(data.message || `Order ${data.order_number} delivered`, {
          icon: '✅',
          duration: 5000
        });
      }
    });

    return unsubscribe;
  }, [on, showToasts]);

  // Clear new order count
  const clearNewOrderCount = useCallback(() => {
    setNewOrderCount(0);
  }, []);

  // Remove order from list (e.g., when cancelled or completed)
  const removeOrder = useCallback((orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // Manually add an order (for initial load)
  const addOrders = useCallback((newOrders: Order[]) => {
    setOrders(prev => {
      const existingIds = new Set(prev.map(o => o.id));
      const uniqueNewOrders = newOrders.filter(o => !existingIds.has(o.id));
      return [...uniqueNewOrders, ...prev];
    });
  }, []);

  // Replace all orders (for full refresh)
  const setAllOrders = useCallback((newOrders: Order[]) => {
    setOrders(newOrders);
  }, []);

  return {
    orders,
    newOrderCount,
    isConnected,
    clearNewOrderCount,
    removeOrder,
    addOrders,
    setAllOrders
  };
}
