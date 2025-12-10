import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import useNotificationStore from '@/stores/notificationStore';

const SocketContext = createContext(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token, isAuthenticated } = useAuth();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect socket if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);

      // Join user-specific room
      if (user) {
        newSocket.emit('join_room', `user_${user.id}`);

        // Join role-specific room
        newSocket.emit('join_room', `role_${user.role}`);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Global notification handler
    newSocket.on('notification', (data) => {
      console.log('Received notification:', data);
      addNotification(data);
    });

    // Order update handler
    newSocket.on('order_update', (data) => {
      console.log('Order update:', data);
      addNotification({
        type: 'order_update',
        title: 'Order Update',
        message: `Your order ${data.orderNumber} is now ${data.status}`,
        data
      });
    });

    // New order handler (for staff)
    newSocket.on('new_order', (data) => {
      console.log('New order:', data);
      if (user && ['chef', 'waiter', 'manager', 'admin'].includes(user.role)) {
        addNotification({
          type: 'new_order',
          title: 'New Order',
          message: `Order #${data.orderNumber} received`,
          data,
          priority: 'high'
        });
      }
    });

    // Booking update handler
    newSocket.on('booking_update', (data) => {
      console.log('Booking update:', data);
      addNotification({
        type: 'booking_update',
        title: 'Booking Update',
        message: `Booking ${data.bookingReference} status: ${data.status}`,
        data
      });
    });

    // Room status handler (for cleaners)
    newSocket.on('room_status_change', (data) => {
      console.log('Room status change:', data);
      if (user && ['cleaner', 'manager', 'admin'].includes(user.role)) {
        addNotification({
          type: 'room_status',
          title: 'Room Status Update',
          message: `Room ${data.roomNumber}: ${data.status}`,
          data
        });
      }
    });

    // Connect socket
    newSocket.connect();
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, token, user?.id, user?.role]);

  // Socket helper methods
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
