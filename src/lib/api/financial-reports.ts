import api from './client';

export interface DailySalesReport {
  date: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  payment_methods: Record<string, number>;
  time_breakdown: Array<{
    hour: string;
    revenue: number;
    orders: number;
  }>;
  menu_categories: Array<{
    category: string;
    revenue: number;
    items_sold: number;
  }>;
}

export interface EmployeeSalesReport {
  employee_id: string;
  employee_name: string;
  role: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  commission_earned?: number;
  time_period: {
    start_date: string;
    end_date: string;
  };
  top_items: Array<{
    item_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

export interface PLStatement {
  period: {
    start_date: string;
    end_date: string;
  };
  revenue: {
    total_revenue: number;
    room_revenue: number;
    food_beverage_revenue: number;
    other_revenue: number;
  };
  cost_of_goods_sold: {
    food_cost: number;
    beverage_cost: number;
    other_direct_costs: number;
    total_cogs: number;
  };
  gross_profit: number;
  operating_expenses: {
    payroll: number;
    utilities: number;
    marketing: number;
    maintenance: number;
    supplies: number;
    other_expenses: number;
    total_expenses: number;
  };
  net_profit: number;
  profit_margin: number;
}

export interface SalesTrend {
  date: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
  growth_rate?: number;
}

export interface ReportFilters {
  start_date: string;
  end_date: string;
  employee_id?: string;
  department?: string;
  payment_method?: string;
}

class FinancialReportsService {
  async getDailySalesReport(date: string): Promise<DailySalesReport> {
    try {
      const response = await api.get<DailySalesReport>(`/reports/daily-sales/${date}`);
      // Cache the successful response
      const cachedData = localStorage.getItem('financial_reports_daily');
      const cache = cachedData ? JSON.parse(cachedData) : {};
      cache[date] = response.data;
      localStorage.setItem('financial_reports_daily', JSON.stringify(cache));
      return response.data;
    } catch (error) {
      // Fallback to cached data
      const cachedData = localStorage.getItem('financial_reports_daily');
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (cache[date]) {
          return cache[date];
        }
      }
      throw error;
    }
  }

  async getEmployeeSalesReport(filters: ReportFilters): Promise<EmployeeSalesReport[]> {
    try {
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.department) params.append('department', filters.department);

      const response = await api.get<EmployeeSalesReport[]>(`/reports/employee-sales?${params.toString()}`);
      // Cache the successful response
      const cacheKey = `employee_sales_${filters.start_date}_${filters.end_date}_${filters.employee_id || 'all'}_${filters.department || 'all'}`;
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      // Fallback to cached data
      const cacheKey = `employee_sales_${filters.start_date}_${filters.end_date}_${filters.employee_id || 'all'}_${filters.department || 'all'}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      throw error;
    }
  }

  async getPLStatement(filters: ReportFilters): Promise<PLStatement> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);

    const response = await api.get<PLStatement>(`/reports/pl-statement?${params.toString()}`);
    return response.data;
  }

  async getSalesTrends(filters: ReportFilters): Promise<SalesTrend[]> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);

    const response = await api.get<SalesTrend[]>(`/reports/sales-trends?${params.toString()}`);
    return response.data;
  }

  async exportReport(reportType: string, filters: ReportFilters, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    params.append('format', format);

    const response = await api.get(`/reports/export/${reportType}?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getSalesSummary(filters: ReportFilters): Promise<{
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    growth_rate: number;
  }> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);

    const response = await api.get(`/reports/sales-summary?${params.toString()}`);
    return response.data;
  }
}

export const financialReportsService = new FinancialReportsService();