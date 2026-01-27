import api from './client';

export interface SalesAnalytics {
  period: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  growth_rate: number;
  peak_hours: Array<{
    hour: string;
    revenue: number;
    orders: number;
  }>;
  top_performing_items: Array<{
    item_name: string;
    quantity_sold: number;
    revenue: number;
    profit_margin: number;
  }>;
  customer_segments: Array<{
    segment: string;
    revenue: number;
    orders: number;
    avg_order_value: number;
  }>;
}

export interface EmployeePerformance {
  employee_id: string;
  employee_name: string;
  role: string;
  metrics: {
    total_sales: number;
    total_orders: number;
    avg_order_value: number;
    upsell_rate: number;
    customer_satisfaction: number;
    productivity_score: number;
  };
  trends: Array<{
    date: string;
    sales: number;
    orders: number;
    satisfaction: number;
  }>;
  comparisons: {
    vs_team_avg: {
      sales: number;
      satisfaction: number;
      productivity: number;
    };
    vs_previous_period: {
      sales_growth: number;
      order_growth: number;
      satisfaction_change: number;
    };
  };
}

export interface RevenueOptimization {
  current_pricing: Array<{
    item_id: string;
    item_name: string;
    current_price: number;
    suggested_price: number;
    confidence: number;
    expected_impact: number;
  }>;
  demand_forecasting: Array<{
    date: string;
    predicted_demand: number;
    confidence_interval: [number, number];
    recommended_staffing: number;
  }>;
  occupancy_analysis: {
    current_occupancy: number;
    forecasted_occupancy: number;
    revenue_per_available_room: number;
    best_available_rate: number;
    length_of_stay_analysis: {
      avg_stay_length: number;
      booking_lead_time: number;
      cancellation_rate: number;
    };
  };
}

export interface OperationalMetrics {
  kitchen_efficiency: {
    avg_prep_time: number;
    order_accuracy_rate: number;
    waste_percentage: number;
    peak_hour_performance: Array<{
      hour: string;
      orders_completed: number;
      avg_prep_time: number;
    }>;
  };
  service_quality: {
    avg_service_time: number;
    customer_complaints: number;
    resolution_time: number;
    satisfaction_score: number;
  };
  inventory_turnover: {
    fast_moving_items: Array<{
      item_name: string;
      turnover_rate: number;
      stock_level: number;
    }>;
    slow_moving_items: Array<{
      item_name: string;
      turnover_rate: number;
      stock_level: number;
      recommendations: string[];
    }>;
  };
}

export interface AnalyticsFilters {
  start_date: string;
  end_date: string;
  department?: string;
  employee_id?: string;
  location?: string;
  time_granularity?: 'hour' | 'day' | 'week' | 'month';
}

class AnalyticsService {
  async getSalesAnalytics(filters: AnalyticsFilters): Promise<SalesAnalytics> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);
    if (filters.time_granularity) params.append('time_granularity', filters.time_granularity);

    const response = await api.get<SalesAnalytics>(`/analytics/sales?${params.toString()}`);
    return response.data;
  }

  async getEmployeePerformance(employeeId: string, filters: AnalyticsFilters): Promise<EmployeePerformance> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.time_granularity) params.append('time_granularity', filters.time_granularity);

    const response = await api.get<EmployeePerformance>(`/analytics/employees/${employeeId}?${params.toString()}`);
    return response.data;
  }

  async getTeamPerformance(filters: AnalyticsFilters): Promise<EmployeePerformance[]> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);
    if (filters.time_granularity) params.append('time_granularity', filters.time_granularity);

    const response = await api.get<EmployeePerformance[]>(`/analytics/employees/team?${params.toString()}`);
    return response.data;
  }

  async getRevenueOptimization(filters: AnalyticsFilters): Promise<RevenueOptimization> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.location) params.append('location', filters.location);

    const response = await api.get<RevenueOptimization>(`/analytics/revenue-optimization?${params.toString()}`);
    return response.data;
  }

  async getOperationalMetrics(filters: AnalyticsFilters): Promise<OperationalMetrics> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);

    const response = await api.get<OperationalMetrics>(`/analytics/operational?${params.toString()}`);
    return response.data;
  }

  async getPredictiveInsights(filters: AnalyticsFilters): Promise<{
    sales_forecast: Array<{
      date: string;
      predicted_revenue: number;
      confidence: number;
    }>;
    staffing_recommendations: Array<{
      date: string;
      recommended_staff: number;
      confidence: number;
    }>;
    inventory_recommendations: Array<{
      item_name: string;
      recommended_order_quantity: number;
      confidence: number;
    }>;
  }> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);

    const response = await api.get(`/analytics/predictive?${params.toString()}`);
    return response.data;
  }

  async getCustomAnalytics(reportType: string, filters: AnalyticsFilters): Promise<any> {
    const params = new URLSearchParams();
    params.append('start_date', filters.start_date);
    params.append('end_date', filters.end_date);
    if (filters.department) params.append('department', filters.department);
    if (filters.employee_id) params.append('employee_id', filters.employee_id);

    const response = await api.get(`/analytics/custom/${reportType}?${params.toString()}`);
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();