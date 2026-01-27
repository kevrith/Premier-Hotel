import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface KitchenStats {
  pendingOrders: number;
  inProgress: number;
  completedToday: number;
  avgPrepTime: number;
}

export function useKitchenStats() {
  const [stats, setStats] = useState<KitchenStats>({
    pendingOrders: 0,
    inProgress: 0,
    completedToday: 0,
    avgPrepTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchKitchenStats();
  }, []);

  const fetchKitchenStats = async () => {
    try {
      setIsLoading(true);
      
      // Get all orders first to see what we have
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*');

      console.log('All orders found:', allOrders?.length, allOrders);

      if (!allOrders || allOrders.length === 0) {
        setStats({ pendingOrders: 0, inProgress: 0, completedToday: 0, avgPrepTime: 0 });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Simple counts - just show all orders for now
      const pendingCount = allOrders.filter(order => 
        order.status && ['pending', 'placed', 'received', 'confirmed'].includes(order.status.toLowerCase())
      ).length;
      
      const inProgressCount = allOrders.filter(order => 
        order.status && ['preparing', 'cooking', 'ready', 'in_progress'].includes(order.status.toLowerCase())
      ).length;
      
      const completedTodayCount = allOrders.filter(order => {
        if (!order.status || !['completed', 'delivered', 'served'].includes(order.status.toLowerCase())) {
          return false;
        }
        const orderDate = new Date(order.updated_at || order.created_at).toISOString().split('T')[0];
        return orderDate === today;
      }).length;

      console.log('Order counts:', { pendingCount, inProgressCount, completedTodayCount });

      setStats({
        pendingOrders: pendingCount,
        inProgress: inProgressCount,
        completedToday: completedTodayCount,
        avgPrepTime: 15 // Default for now
      });
    } catch (error: any) {
      console.error('Kitchen stats error:', error);
      toast.error('Failed to load kitchen statistics');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchKitchenStats };
}