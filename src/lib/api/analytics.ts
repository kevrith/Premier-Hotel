/**
 * Advanced Analytics & Forecasting API Client
 */

import api from './axios';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface AnalyticsDashboard {
  period: string;
  revenue_analytics: RevenueAnalytics;
  occupancy_analytics: OccupancyAnalytics;
  booking_analytics: BookingAnalytics;
  customer_analytics: CustomerAnalytics;
  operational_metrics: OperationalMetrics;
  financial_metrics: FinancialMetrics;
  generated_at: string;
}

export interface RevenueAnalytics {
  total_revenue: number;
  revenue_growth: number;
  by_period: RevenueByPeriod[];
  by_source: Record<string, number>;
  top_revenue_days: any[];
}

export interface RevenueByPeriod {
  period: string;
  total_revenue: number;
  bookings_revenue: number;
  orders_revenue: number;
  other_revenue: number;
  transaction_count: number;
  average_transaction: number;
}

export interface OccupancyAnalytics {
  current_occupancy_rate: number;
  average_occupancy_rate: number;
  peak_occupancy_date: string | null;
  lowest_occupancy_date: string | null;
  by_period: OccupancyByPeriod[];
  by_room_type: Record<string, number>;
}

export interface OccupancyByPeriod {
  period: string;
  total_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  average_daily_rate: number;
  revenue_per_available_room: number;
}

export interface BookingAnalytics {
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  pending_bookings: number;
  average_booking_value: number;
  booking_trends: BookingTrend[];
  by_channel: Record<string, number>;
  by_room_type: Record<string, number>;
  lead_time_distribution: Record<string, number>;
}

export interface BookingTrend {
  period: string;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  cancellation_rate: number;
  average_booking_value: number;
  average_length_of_stay: number;
}

export interface CustomerAnalytics {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  customer_retention_rate: number;
  average_customer_lifetime_value: number;
  segments: any[];
  top_customers: any[];
}

export interface OperationalMetrics {
  average_checkin_time: string;
  average_checkout_time: string;
  service_request_resolution_time: string;
  housekeeping_efficiency: number;
  staff_productivity: number;
  inventory_turnover_rate: number;
}

export interface FinancialMetrics {
  gross_revenue: number;
  net_revenue: number;
  total_expenses: number;
  profit_margin: number;
  revenue_per_available_room: number;
  average_daily_rate: number;
  revenue_growth_rate: number;
}

export interface RevenueForecast {
  forecast_type: string;
  forecast_horizon: number;
  base_date: string;
  forecasts: ForecastPeriod[];
  accuracy_metrics: Record<string, number>;
}

export interface ForecastPeriod {
  period: string;
  predicted_revenue: number;
  predicted_occupancy: number;
  predicted_bookings: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
}

export interface KPIDashboard {
  kpis: KPI[];
  last_updated: string;
}

export interface KPI {
  name: string;
  value: number;
  target: number | null;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
  status: 'good' | 'warning' | 'critical';
}

export interface InsightsList {
  insights: Insight[];
  total_count: number;
}

export interface Insight {
  insight_type: 'opportunity' | 'warning' | 'trend' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  metric_name: string;
  current_value: number;
  recommended_action: string | null;
  impact_estimate: string | null;
  generated_at: string;
}

// =====================================================
// ANALYTICS SERVICE CLASS
// =====================================================

class AnalyticsService {
  // ----- REVENUE -----

  async getRevenueAnalytics(params: {
    start_date: string;
    end_date: string;
    period?: 'daily' | 'weekly' | 'monthly';
  }): Promise<RevenueAnalytics> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);
    if (params.period) queryParams.append('period', params.period);

    const response = await api.get<RevenueAnalytics>(`/analytics/revenue?${queryParams.toString()}`);
    return response.data;
  }

  // ----- OCCUPANCY -----

  async getOccupancyAnalytics(params: {
    start_date: string;
    end_date: string;
  }): Promise<OccupancyAnalytics> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);

    const response = await api.get<OccupancyAnalytics>(`/analytics/occupancy?${queryParams.toString()}`);
    return response.data;
  }

  // ----- BOOKINGS -----

  async getBookingAnalytics(params: {
    start_date: string;
    end_date: string;
  }): Promise<BookingAnalytics> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);

    const response = await api.get<BookingAnalytics>(`/analytics/bookings?${queryParams.toString()}`);
    return response.data;
  }

  // ----- CUSTOMERS -----

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    const response = await api.get<CustomerAnalytics>('/analytics/customers');
    return response.data;
  }

  // ----- COMPREHENSIVE DASHBOARD -----

  async getDashboard(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<AnalyticsDashboard> {
    const response = await api.get<AnalyticsDashboard>(`/analytics/dashboard?period=${period}`);
    return response.data;
  }

  // ----- FORECASTING -----

  async getRevenueForecast(horizonDays: number = 30): Promise<RevenueForecast> {
    const response = await api.get<RevenueForecast>(`/analytics/forecast/revenue?horizon_days=${horizonDays}`);
    return response.data;
  }

  // ----- KPIs -----

  async getKPIs(): Promise<KPIDashboard> {
    const response = await api.get<KPIDashboard>('/analytics/kpis');
    return response.data;
  }

  // ----- INSIGHTS -----

  async getInsights(): Promise<InsightsList> {
    const response = await api.get<InsightsList>('/analytics/insights');
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
