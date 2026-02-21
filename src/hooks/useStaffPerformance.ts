import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

interface StaffPerformance {
  id: string;
  name: string;
  role: string;
  tasksCompleted: number;
  rating: number;
  status: string;
  evaluationDate?: string;
  strengths?: string;
  areas_for_improvement?: string;
}

export function useStaffPerformance() {
  const [performance, setPerformance] = useState<StaffPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStaffPerformance();
  }, []);

  const fetchStaffPerformance = async () => {
    try {
      setIsLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch team performance from analytics (covers waiters, chefs, staff)
      // and admin users list for status info + cleaners
      const [teamResponse, usersResponse] = await Promise.all([
        api.get(`/analytics/employees/team?start_date=${monthAgo}&end_date=${today}`).catch(() => ({ data: [] })),
        api.get('/admin/users?limit=100').catch(() => ({ data: [] }))
      ]);

      const teamData: any[] = teamResponse.data || [];
      const allUsers: any[] = usersResponse.data || [];

      // Build a map of user statuses from admin users
      const userStatusMap: Record<string, string> = {};
      for (const u of allUsers) {
        userStatusMap[u.id] = u.status || 'active';
      }

      const performanceData: StaffPerformance[] = [];

      // Map team analytics data (waiters, chefs, staff)
      for (const emp of teamData) {
        const metrics = emp.metrics || {};
        performanceData.push({
          id: emp.employee_id,
          name: emp.employee_name || 'Unknown',
          role: emp.role || 'staff',
          tasksCompleted: metrics.total_orders || 0,
          rating: metrics.customer_satisfaction || 0,
          status: userStatusMap[emp.employee_id] || 'active'
        });
      }

      // Get cleaners from admin users (not included in analytics/employees/team)
      const cleaners = allUsers.filter((u: any) =>
        (u.role === 'cleaner' || u.role === 'housekeeping') && u.status === 'active'
      );

      // Fetch completed housekeeping tasks to count per cleaner
      if (cleaners.length > 0) {
        const tasksResponse = await api.get('/housekeeping/tasks?status=completed&limit=1000').catch(() => ({ data: [] }));
        const completedTasks: any[] = tasksResponse.data || [];

        // Count completed tasks per assigned_to user
        const taskCountMap: Record<string, number> = {};
        for (const task of completedTasks) {
          const assignee = task.assigned_to;
          if (assignee) {
            taskCountMap[assignee] = (taskCountMap[assignee] || 0) + 1;
          }
        }

        for (const cleaner of cleaners) {
          // Skip if already in team data (unlikely but safe)
          if (performanceData.some(p => p.id === cleaner.id)) continue;

          performanceData.push({
            id: cleaner.id,
            name: cleaner.full_name || 'Unknown',
            role: 'cleaner',
            tasksCompleted: taskCountMap[cleaner.id] || 0,
            rating: 0,
            status: cleaner.status || 'active'
          });
        }
      }

      // Sort by tasks completed (highest first), then by rating
      performanceData.sort((a, b) => {
        if (b.tasksCompleted !== a.tasksCompleted) return b.tasksCompleted - a.tasksCompleted;
        return b.rating - a.rating;
      });

      setPerformance(performanceData);
    } catch (error: any) {
      console.error('Staff performance error:', error);
      toast.error('Failed to load staff performance data');
      setPerformance([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { performance, isLoading, refetch: fetchStaffPerformance };
}
