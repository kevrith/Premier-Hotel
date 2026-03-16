import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DashboardSummary {
  revenue: { today: number; week: number; month: number; room: number };
  orders: { today_count: number; today_revenue: number; pending: number; in_progress: number; completed_today: number };
  staff: { total: number; active: number; waiters: number; chefs: number; cleaners: number; recent_hires: number };
  rooms: { occupied: number; available: number; cleaning: number; maintenance: number };
  pending_tasks: { housekeeping: number; service_requests: number; total: number };
  occupancy_rate: number;
  customer_satisfaction: number;
  daily: { check_ins: number; check_outs: number; meal_orders: number };
}

const EMPTY: DashboardSummary = {
  revenue: { today: 0, week: 0, month: 0, room: 0 },
  orders: { today_count: 0, today_revenue: 0, pending: 0, in_progress: 0, completed_today: 0 },
  staff: { total: 0, active: 0, waiters: 0, chefs: 0, cleaners: 0, recent_hires: 0 },
  rooms: { occupied: 0, available: 0, cleaning: 0, maintenance: 0 },
  pending_tasks: { housekeeping: 0, service_requests: 0, total: 0 },
  occupancy_rate: 0,
  customer_satisfaction: 0,
  daily: { check_ins: 0, check_outs: 0, meal_orders: 0 },
};

export function useDashboardSummary() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<DashboardSummary> => {
      const res = await api.get('/dashboard/manager/summary');
      return ((res.data as any)?.data ?? res.data) ?? EMPTY;
    },
    staleTime: 60_000,      // 60 seconds — don't refetch on every tab switch
    gcTime: 5 * 60_000,     // keep in cache 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

  return { summary: data ?? EMPTY, isLoading, error, refresh };
}
