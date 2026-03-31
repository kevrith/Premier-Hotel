// @ts-nocheck
import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

interface RoomStats {
  occupied: number;
  available: number;
  cleaning: number;
  maintenance: number;
}

interface KitchenStats {
  pendingOrders: number;
  inProgress: number;
  completedToday: number;
  avgPrepTime: number;
}

interface OperationsData {
  roomStats: RoomStats;
  kitchenStats: KitchenStats;
}

export function useOperationsData() {
  const [data, setData] = useState<OperationsData>({
    roomStats: {
      occupied: 0,
      available: 0,
      cleaning: 0,
      maintenance: 0
    },
    kitchenStats: {
      pendingOrders: 0,
      inProgress: 0,
      completedToday: 0,
      avgPrepTime: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const fetchOperationsData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching operations data...');
      
      // Fetch both room and kitchen data in parallel with shorter timeout
      const [roomData, kitchenData] = await Promise.all([
        fetchRoomStats(),
        fetchKitchenStats()
      ]);

      console.log('Operations data fetched:', { roomData, kitchenData });
      setData({
        roomStats: roomData,
        kitchenStats: kitchenData
      });
    } catch (error: any) {
      console.error('Operations data error:', error);
      toast.error('Failed to load operations data');
      // Set fallback values on error
      setData({
        roomStats: { occupied: 0, available: 0, cleaning: 0, maintenance: 0 },
        kitchenStats: { pendingOrders: 0, inProgress: 0, completedToday: 0, avgPrepTime: 0 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomStats = async (): Promise<RoomStats> => {
    try {
      // Fetch real room status from housekeeping endpoint
      const response = await api.get('/housekeeping/stats/room-status');
      const data = response.data || {};

      const total = data.total_rooms || 0;
      const clean = data.clean_rooms || 0;
      const dirty = data.dirty_rooms || 0;
      const inProgress = data.in_progress_rooms || 0;
      const maintenance = data.maintenance_required || 0;

      // Map to dashboard stats: occupied = dirty (guests checked in), available = clean
      const roomStats = {
        occupied: dirty,
        available: clean,
        cleaning: inProgress,
        maintenance: maintenance
      };

      return roomStats;
    } catch (error) {
      console.error('Room stats error:', error);
      return { occupied: 0, available: 0, cleaning: 0, maintenance: 0 };
    }
  };

  const fetchKitchenStats = async (): Promise<KitchenStats> => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch manager order stats for today (has completed count and avg time)
      const [kitchenResponse, statsResponse] = await Promise.all([
        api.get('/orders/kitchen').catch(() => ({ data: [] })),
        api.get(`/orders/manager/stats?start_date=${today}&end_date=${today}`).catch(() => ({ data: {} }))
      ]);

      const kitchenData = kitchenResponse.data || [];
      const statsData = statsResponse.data || {};

      const pendingOrders = kitchenData.filter((order: any) =>
        order.status === 'pending' || order.status === 'confirmed'
      ).length;
      const inProgress = kitchenData.filter((order: any) =>
        order.status === 'preparing' || order.status === 'in_progress'
      ).length;
      const completedToday = statsData.completed_orders || 0;
      const avgPrepTime = statsData.avg_completion_time || 0;

      return {
        pendingOrders,
        inProgress,
        completedToday,
        avgPrepTime
      };
    } catch (error) {
      console.error('Kitchen stats error:', error);
      return { pendingOrders: 0, inProgress: 0, completedToday: 0, avgPrepTime: 0 };
    }
  };

  return { 
    data, 
    isLoading, 
    refetch: fetchOperationsData,
    roomStats: data.roomStats,
    kitchenStats: data.kitchenStats
  };
}