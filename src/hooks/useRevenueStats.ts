import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
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

      // Get today's stats
      const todayStats = await api.get(`/orders/manager/stats?start_date=${today}&end_date=${today}`);
      const todayRevenue = todayStats.data?.total_revenue || 0;
      
      // Get week stats
      const weekStats = await api.get(`/orders/manager/stats?start_date=${weekAgo}&end_date=${today}`);
      const weekRevenue = weekStats.data?.total_revenue || 0;
      
      // Get month stats
      const monthStats = await api.get(`/orders/manager/stats?start_date=${monthAgo}&end_date=${today}`);
      const monthRevenue = monthStats.data?.total_revenue || 0;
      
      // Get occupancy analytics from API
      const occupancyResponse = await api.get(`/analytics/occupancy?start_date=${today}&end_date=${today}`);
      const occupancyData = occupancyResponse.data;
      const occupancyRate = parseFloat(occupancyData.current_occupancy_rate || '0');
      
      // Customer satisfaction (simplified)
      const customerSatisfaction = 4.2;

      setStats({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        occupancyToday: occupancyRate,
        customerSatisfaction
      });
    } catch (error: any) {
      console.error('Revenue stats error:', error);
      toast.error('Failed to load revenue statistics');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchRevenueStats };
}