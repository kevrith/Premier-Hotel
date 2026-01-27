import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { toast } from 'react-hot-toast';

interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  staffByRole: {
    waiter: number;
    chef: number;
    cleaner: number;
  };
  recentHires: number;
}

export function useStaffStats() {
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    activeStaff: 0,
    staffByRole: {
      waiter: 0,
      chef: 0,
      cleaner: 0
    },
    recentHires: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStaffStats();
  }, []);

  const fetchStaffStats = async () => {
    try {
      setIsLoading(true);
      const users = await adminAPI.listUsers();
      
      // Filter staff roles
      const staffUsers = users.filter(user => 
        ['waiter', 'chef', 'cleaner'].includes(user.role)
      );
      
      const activeStaffUsers = staffUsers.filter(user => user.status === 'active');
      
      // Calculate stats
      const staffByRole = {
        waiter: staffUsers.filter(user => user.role === 'waiter').length,
        chef: staffUsers.filter(user => user.role === 'chef').length,
        cleaner: staffUsers.filter(user => user.role === 'cleaner').length
      };
      
      // Recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentHires = staffUsers.filter(user => 
        new Date(user.created_at) > thirtyDaysAgo
      ).length;
      
      setStats({
        totalStaff: staffUsers.length,
        activeStaff: activeStaffUsers.length,
        staffByRole,
        recentHires
      });
    } catch (error: any) {
      toast.error('Failed to load staff statistics');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refetch: fetchStaffStats };
}