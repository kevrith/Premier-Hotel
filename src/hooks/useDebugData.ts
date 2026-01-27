import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
      // Check rooms
      const { data: rooms, count: roomCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact' })
        .limit(3);

      // Check orders
      const { data: orders, count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .limit(3);

      // Check bookings
      const { data: bookings, count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .limit(3);

      setDebug({
        rooms: { count: roomCount || 0, sample: rooms || [] },
        orders: { count: orderCount || 0, sample: orders || [] },
        bookings: { count: bookingCount || 0, sample: bookings || [] }
      });

      console.log('=== DATABASE DEBUG ===');
      console.log('Rooms:', roomCount, rooms);
      console.log('Orders:', orderCount, orders);
      console.log('Bookings:', bookingCount, bookings);
    } catch (error) {
      console.error('Debug data error:', error);
    }
  };

  return debug;
}