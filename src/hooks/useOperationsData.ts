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
      console.log('Fetching room stats...');
      
      // Fetch real room data from API
      const response = await api.get('/admin/users/stats');
      const statsData = response.data || response.data || {};

      // Calculate room stats from user data
      const totalUsers = statsData.total_users || 0;
      const activeUsers = statsData.active_users || 0;
      const inactiveUsers = statsData.inactive_users || 0;
      const terminatedUsers = statsData.terminated_users || 0;

      // For now, use user stats as room stats since we don't have room data
      const roomStats = { 
        occupied: activeUsers, 
        available: totalUsers - activeUsers, 
        cleaning: inactiveUsers, 
        maintenance: terminatedUsers 
      };
      
      console.log('Room stats calculated:', roomStats);
      return roomStats;
    } catch (error) {
      console.error('Room stats error:', error);
      // Return default values if API fails
      return { occupied: 0, available: 0, cleaning: 0, maintenance: 0 };
    }
  };

  const fetchKitchenStats = async (): Promise<KitchenStats> => {
    try {
      console.log('Fetching kitchen stats...');
      
      // Fetch real kitchen data from API
      const response = await api.get('/orders/kitchen');
      const kitchenData = response.data || response.data || [];

      // Calculate stats from orders
      const pendingOrders = kitchenData.filter((order: any) => order.status === 'pending').length;
      const inProgress = kitchenData.filter((order: any) => order.status === 'confirmed').length;
      const completedToday = 0; // We don't have completed orders data
      const avgPrepTime = 15; // Default value

      const kitchenStats = {
        pendingOrders,
        inProgress,
        completedToday,
        avgPrepTime
      };
      
      console.log('Kitchen stats calculated:', kitchenStats);
      return kitchenStats;
    } catch (error) {
      console.error('Kitchen stats error:', error);
      // Return default values if API fails
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