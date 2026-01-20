/**
 * Reports API Service
 */
import api from './client';

export interface ReportsOverview {
  period: {
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    currency: string;
    payments_count: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    cancellation_rate: number;
  };
  orders: {
    total: number;
    completed: number;
    completion_rate: number;
  };
  customers: {
    active: number;
  };
}

export interface RevenueData {
  date: string;
  total: number;
  bookings: number;
  orders: number;
  mpesa: number;
  cash: number;
  card: number;
  count: number;
}

export interface RevenueAnalytics {
  period: {
    start: string;
    end: string;
    group_by: string;
  };
  summary: {
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
  };
  data: RevenueData[];
}

export interface BookingsStats {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_bookings: number;
    total_revenue: number;
    average_booking_value: number;
    average_stay_duration: number;
  };
  by_status: Record<string, number>;
  by_room_type: Record<string, number>;
}

export interface OrdersStats {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    completion_rate: number;
  };
  by_status: Record<string, number>;
  by_location: Record<string, number>;
  top_items: Array<{ menu_item_id: string; quantity: number }>;
}

export interface TopCustomer {
  user_id: string;
  total_spent: number;
  transaction_count: number;
  average_transaction: number;
}

export interface TopCustomersResponse {
  period: {
    start: string;
    end: string;
  };
  customers: TopCustomer[];
}

export interface EmployeeSalesData {
  employee_id: string;
  employee_name: string;
  email: string;
  role: string;
  department: string;
  total_sales: number;
  total_orders: number;
  completed_orders: number;
  avg_order_value: number;
  total_items_sold: number;
  orders_today: number;
  orders_this_week: number;
  orders_this_month: number;
  top_selling_item: string;
  first_sale_time: string;
  last_sale_time: string;
  completion_rate: number;
}

export interface EmployeeSalesResponse {
  period: {
    start: string;
    end: string;
  };
  total_employees: number;
  total_sales: number;
  total_orders: number;
  employees: EmployeeSalesData[];
}

export interface Transaction {
  order_id: string;
  date: string;
  total: number;
  status: string;
  payment_method: string;
  delivery_location: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  total: number;
  percentage: number;
}

export interface EmployeeDetailResponse {
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    phone: string;
    status: string;
  };
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_sales: number;
    total_orders: number;
    completed_orders: number;
    avg_order_value: number;
    completion_rate: number;
    rank: number | null;
    total_peers: number;
    team_average: number;
    performance_vs_average: number;
  };
  transactions: Transaction[];
  top_items: TopItem[];
  payment_methods: PaymentMethodBreakdown[];
  trends: {
    daily: Array<{ date: string; revenue: number }>;
    hourly: Array<{ hour: string; revenue: number }>;
  };
}

class ReportsService {
  /**
   * Get reports overview
   */
  async getOverview(startDate?: string, endDate?: string): Promise<ReportsOverview> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get<ReportsOverview>(`/reports/overview?${params.toString()}`);
    return response.data;
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    startDate?: string,
    endDate?: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('group_by', groupBy);

    const response = await api.get<RevenueAnalytics>(`/reports/revenue?${params.toString()}`);
    return response.data;
  }

  /**
   * Get bookings statistics
   */
  async getBookingsStats(startDate?: string, endDate?: string): Promise<BookingsStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get<BookingsStats>(`/reports/bookings-stats?${params.toString()}`);
    return response.data;
  }

  /**
   * Get orders statistics
   */
  async getOrdersStats(startDate?: string, endDate?: string): Promise<OrdersStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get<OrdersStats>(`/reports/orders-stats?${params.toString()}`);
    return response.data;
  }

  /**
   * Get top customers
   */
  async getTopCustomers(
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<TopCustomersResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get<TopCustomersResponse>(`/reports/top-customers?${params.toString()}`);
    return response.data;
  }

  /**
   * Get employee sales report
   */
  async getEmployeeSales(
    startDate?: string,
    endDate?: string,
    employeeId?: string,
    department?: string,
    role?: string
  ): Promise<EmployeeSalesResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (employeeId) params.append('employee_id', employeeId);
    if (department) params.append('department', department);
    if (role) params.append('role', role);

    const response = await api.get<EmployeeSalesResponse>(`/reports/employee-sales?${params.toString()}`);
    return response.data;
  }

  /**
   * Get detailed employee performance report
   */
  async getEmployeeDetails(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EmployeeDetailResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await api.get<EmployeeDetailResponse>(`/reports/employee/${employeeId}/details?${params.toString()}`);
    return response.data;
  }

  /**
   * Helper: Get date range for common periods
   */
  getDateRange(period: 'today' | 'week' | 'month' | 'year'): { start: string; end: string } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;
