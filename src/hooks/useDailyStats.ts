import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface DailyStats {
  checkIns: number;
  checkOuts: number;
  mealOrders: number;
  avgRating: number;
}

export function useDailyStats() {
  const [stats, setStats] = useState<DailyStats>({
    checkIns: 0,
    checkOuts: 0,
    mealOrders: 0,
    avgRating: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDailyStats();
  }, []);

  const fetchDailyStats = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date().toISOString().split('T')[0];

      // Get today's check-ins
      const { data: checkIns } = await supabase
        .from('bookings')
        .select('id')
        .eq('check_in', today)
        .eq('status', 'confirmed');

      // Get today's check-outs
      const { data: checkOuts } = await supabase
        .from('bookings')
        .select('id')
        .eq('check_out', today)
        .eq('status', 'completed');

      // Get today's meal orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', today)
        .neq('status', 'cancelled');

      // Get recent reviews for average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .gte('created_at', today);

      const avgRating = reviews?.length ? 
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

      setStats({
        checkIns: checkIns?.length || 0,
        checkOuts: checkOuts?.length || 0,
        mealOrders: orders?.length || 0,
        avgRating: Math.round(avgRating * 10) / 10
      });
    } catch (error: any) {
      toast.error('Failed to load daily statistics');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchDailyStats };
}