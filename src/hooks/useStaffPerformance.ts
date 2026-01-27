import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
      
      // Get all staff users
      const { data: staffUsers } = await supabase
        .from('users')
        .select('id, full_name, role, status')
        .in('role', ['waiter', 'chef', 'cleaner'])
        .eq('status', 'active');

      if (!staffUsers || staffUsers.length === 0) {
        setPerformance([]);
        return;
      }

      // Get latest performance evaluations for each staff member
      const performanceData: StaffPerformance[] = [];

      for (const staff of staffUsers) {
        // Get latest performance evaluation
        const { data: evaluations } = await supabase
          .from('staff_performance')
          .select('rating, evaluation_date, strengths, areas_for_improvement')
          .eq('staff_id', staff.id)
          .order('evaluation_date', { ascending: false })
          .limit(1);

        // Get task completion count (from orders for waiters/chefs, housekeeping tasks for cleaners)
        let tasksCompleted = 0;
        
        if (staff.role === 'waiter' || staff.role === 'chef') {
          // Count orders handled by this staff member
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('created_by_staff_id', staff.id)
            .in('status', ['completed', 'served']);
          tasksCompleted = count || 0;
        } else if (staff.role === 'cleaner') {
          // Count completed housekeeping tasks
          const { count } = await supabase
            .from('housekeeping_tasks')
            .select('*', { count: 'exact' })
            .eq('assigned_to', staff.id)
            .eq('status', 'completed');
          tasksCompleted = count || 0;
        }

        const latestEvaluation = evaluations?.[0];
        const avgRating = latestEvaluation?.rating || 4.0; // Default rating if no evaluation exists

        performanceData.push({
          id: staff.id,
          name: staff.full_name,
          role: staff.role,
          tasksCompleted,
          rating: avgRating,
          status: staff.status === 'active' ? 'active' : 'inactive',
          evaluationDate: latestEvaluation?.evaluation_date,
          strengths: latestEvaluation?.strengths,
          areas_for_improvement: latestEvaluation?.areas_for_improvement
        });
      }

      // Sort by rating (highest first), then by tasks completed
      performanceData.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.tasksCompleted - a.tasksCompleted;
      });

      setPerformance(performanceData);
    } catch (error: any) {
      console.error('Staff performance error:', error);
      toast.error('Failed to load staff performance data');
      // Return mock data as fallback
      setPerformance([
        { id: '1', name: 'Chef Mario', role: 'chef', tasksCompleted: 45, rating: 4.8, status: 'active' },
        { id: '2', name: 'Waiter Tom', role: 'waiter', tasksCompleted: 62, rating: 4.6, status: 'active' },
        { id: '3', name: 'Cleaner Sarah', role: 'cleaner', tasksCompleted: 38, rating: 4.9, status: 'active' },
        { id: '4', name: 'Waiter Jane', role: 'waiter', tasksCompleted: 55, rating: 4.5, status: 'on-break' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return { performance, isLoading, refetch: fetchStaffPerformance };
}