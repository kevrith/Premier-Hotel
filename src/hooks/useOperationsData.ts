import { useState, useEffect } from 'react';
import { ordersApi } from '@/lib/api/orders';
import { roomsAPI } from '@/lib/api/rooms';
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
      
      // Fetch both room and kitchen data in parallel
      const [roomData, kitchenData] = await Promise.all([
        fetchRoomStats(),
        fetchKitchenStats()
      ]);

      setData({
        roomStats: roomData,
        kitchenStats: kitchenData
      });
    } catch (error: any) {
      console.error('Operations data error:', error);
      toast.error('Failed to load operations data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomStats = async (): Promise<RoomStats> => {
    try {
      // Get all rooms
      const rooms = await roomsAPI.listRooms();
      
      if (!rooms || rooms.length === 0) {
        return { occupied: 0, available: 0, cleaning: 0, maintenance: 0 };
      }

      // Count rooms by status
      const occupied = rooms.filter((room: any) => room.status === 'occupied').length;
      const available = rooms.filter((room: any) => room.status === 'available').length;
      const cleaning = rooms.filter((room: any) => room.status === 'cleaning').length;
      const maintenance = rooms.filter((room: any) => room.status === 'maintenance').length;

      return { occupied, available, cleaning, maintenance };
    } catch (error) {
      console.error('Room stats error:', error);
      // Return default values if API fails
      return { occupied: 0, available: 0, cleaning: 0, maintenance: 0 };
    }
  };

  const fetchKitchenStats = async (): Promise<KitchenStats> => {
    try {
      // Get all orders
      const orders = await ordersApi.getAll();
      
      if (!orders || orders.length === 0) {
        return { pendingOrders: 0, inProgress: 0, completedToday: 0, avgPrepTime: 0 };
      }

      const today = new Date().toISOString().split('T')[0];

      // Count orders by status
      const pendingOrders = orders.filter(order => 
        ['pending', 'confirmed'].includes(order.status)
      ).length;
      
      const inProgress = orders.filter(order => 
        ['preparing', 'ready'].includes(order.status)
      ).length;
      
      const completedToday = orders.filter(order => {
        if (!['completed', 'served'].includes(order.status)) {
          return false;
        }
        const orderDate = new Date(order.updated_at || order.created_at).toISOString().split('T')[0];
        return orderDate === today;
      }).length;

      return {
        pendingOrders,
        inProgress,
        completedToday,
        avgPrepTime: 15 // Default average prep time
      };
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