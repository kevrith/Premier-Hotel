import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface RevenueStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  occupancyToday: number;
  customerSatisfaction: number;
}

export function useRevenueStats() {
  const [stats, setStats] = useState<RevenueStats>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    occupancyToday: 0,
    customerSatisfaction: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRevenueStats();
  }, []);

  const fetchRevenueStats = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get today's revenue from payments
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', today);

      // Get week's revenue
      const { data: weekPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', weekAgo);

      // Get month's revenue
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthAgo);

      // Get occupancy rate
      const { data: totalRooms } = await supabase.from('rooms').select('id');
      const { data: occupiedRooms } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('status', 'confirmed')
        .lte('check_in', today)
        .gte('check_out', today);

      // Get average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .gte('created_at', monthAgo);

      const todayRevenue = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const weekRevenue = weekPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const monthRevenue = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      const occupancyRate = totalRooms?.length ? 
        Math.round((occupiedRooms?.length || 0) / totalRooms.length * 100) : 0;
      
      const avgRating = reviews?.length ? 
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

      setStats({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        occupancyToday: occupancyRate,
        customerSatisfaction: Math.round(avgRating * 10) / 10
      });
    } catch (error: any) {
      toast.error('Failed to load revenue statistics');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchRevenueStats };
}