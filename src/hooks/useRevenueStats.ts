// @ts-nocheck
import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

interface RevenueStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  roomRevenue: number;
  occupancyToday: number;
  customerSatisfaction: number;
}

export function useRevenueStats() {
  const [stats, setStats] = useState<RevenueStats>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    roomRevenue: 0,
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

      // Get today's F&B stats (restaurant/bar orders)
      const todayStats = await api.get(`/orders/manager/stats?start_date=${today}&end_date=${today}`);
      const todayRevenue = todayStats.data?.total_revenue || 0;

      // Get week F&B stats
      const weekStats = await api.get(`/orders/manager/stats?start_date=${weekAgo}&end_date=${today}`);
      const weekRevenue = weekStats.data?.total_revenue || 0;

      // Get month F&B stats
      const monthStats = await api.get(`/orders/manager/stats?start_date=${monthAgo}&end_date=${today}`);
      const monthRevenue = monthStats.data?.total_revenue || 0;

      // Get room/booking revenue from reports overview
      let roomRevenue = 0;
      try {
        const overviewResponse = await api.get(`/reports/overview?start_date=${monthAgo}&end_date=${today}`);
        const bookingRevenue = overviewResponse.data?.revenue?.total || 0;
        // Booking revenue includes orders, so subtract order revenue to get rooms-only
        roomRevenue = Math.max(0, bookingRevenue - monthRevenue);
      } catch {
        // Overview endpoint might fail, that's ok
      }

      // Get occupancy analytics from API
      let occupancyRate = 0;
      try {
        const occupancyResponse = await api.get(`/analytics/occupancy?start_date=${today}&end_date=${today}`);
        const occupancyData = occupancyResponse.data;
        occupancyRate = parseFloat(occupancyData.current_occupancy_rate || '0');
      } catch {
        // Occupancy might fail
      }

      // Customer satisfaction from real reviews
      let customerSatisfaction = 0;
      try {
        const reviewsResponse = await api.get('/reviews/stats/overview');
        customerSatisfaction = parseFloat(reviewsResponse.data?.average_rating || '0');
      } catch {
        // Reviews endpoint might fail
      }

      setStats({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        roomRevenue,
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
