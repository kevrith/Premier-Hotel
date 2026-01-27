import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface RoomStats {
  occupied: number;
  available: number;
  cleaning: number;
  maintenance: number;
}

export function useRoomStats() {
  const [stats, setStats] = useState<RoomStats>({
    occupied: 0,
    available: 0,
    cleaning: 0,
    maintenance: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoomStats();
  }, []);

  const fetchRoomStats = async () => {
    try {
      setIsLoading(true);
      
      // Get all rooms first
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*');

      console.log('All rooms found:', rooms?.length, rooms);

      if (!rooms || rooms.length === 0) {
        setStats({ occupied: 0, available: 0, cleaning: 0, maintenance: 0 });
        return;
      }

      // For now, just show total rooms as available until we fix the logic
      const totalRooms = rooms.length;
      
      setStats({
        occupied: Math.floor(totalRooms * 0.6), // Mock 60% occupancy
        available: Math.floor(totalRooms * 0.3), // Mock 30% available
        cleaning: Math.floor(totalRooms * 0.08), // Mock 8% cleaning
        maintenance: Math.floor(totalRooms * 0.02) // Mock 2% maintenance
      });
    } catch (error: any) {
      console.error('Room stats error:', error);
      toast.error('Failed to load room statistics');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchRoomStats };
}