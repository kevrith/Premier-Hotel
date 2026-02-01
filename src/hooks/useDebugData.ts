import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';

export function useDebugData() {
  const [debug, setDebug] = useState({
    rooms: { count: 0, sample: [] },
    orders: { count: 0, sample: [] },
    bookings: { count: 0, sample: [] }
  });

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      // Get rooms from API
      const roomsResponse = await api.get('/rooms');
      const rooms = roomsResponse.data.data || [];

      // Get orders from API
      const ordersResponse = await api.get('/orders');
      const orders = ordersResponse.data.data || [];

      // Get bookings from API
      const bookingsResponse = await api.get('/bookings');
      const bookings = bookingsResponse.data.data || [];

      setDebug({
        rooms: { count: rooms.length, sample: rooms.slice(0, 3) },
        orders: { count: orders.length, sample: orders.slice(0, 3) },
        bookings: { count: bookings.length, sample: bookings.slice(0, 3) }
      });

      console.log('=== DATABASE DEBUG ===');
      console.log('Rooms:', rooms.length, rooms.slice(0, 3));
      console.log('Orders:', orders.length, orders.slice(0, 3));
      console.log('Bookings:', bookings.length, bookings.slice(0, 3));
    } catch (error) {
      console.error('Debug data error:', error);
    }
  };

  return debug;
}