"""
Advanced Analytics & Forecasting Pydantic Schemas
Validation schemas for analytics, insights, and forecasting
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal


# =====================================================
# REVENUE ANALYTICS SCHEMAS
# =====================================================

class RevenueByPeriod(BaseModel):
    period: str
    total_revenue: Decimal
    bookings_revenue: Decimal
    orders_revenue: Decimal
    other_revenue: Decimal
    transaction_count: int
    average_transaction: Decimal


class RevenueAnalytics(BaseModel):
    total_revenue: Decimal
    revenue_growth: Decimal  # Percentage
    by_period: List[RevenueByPeriod]
    by_source: Dict[str, Decimal]
    top_revenue_days: List[Dict[str, Any]]


# =====================================================
# OCCUPANCY ANALYTICS SCHEMAS
# =====================================================

class OccupancyByPeriod(BaseModel):
    period: str
    total_rooms: int
    occupied_rooms: int
    occupancy_rate: Decimal  # Percentage
    average_daily_rate: Decimal
    revenue_per_available_room: Decimal


class OccupancyAnalytics(BaseModel):
    current_occupancy_rate: Decimal
    average_occupancy_rate: Decimal
    peak_occupancy_date: Optional[str]
    lowest_occupancy_date: Optional[str]
    by_period: List[OccupancyByPeriod]
    by_room_type: Dict[str, Decimal]


# =====================================================
# BOOKING ANALYTICS SCHEMAS
# =====================================================

class BookingTrend(BaseModel):
    period: str
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    cancellation_rate: Decimal
    average_booking_value: Decimal
    average_length_of_stay: Decimal


class BookingAnalytics(BaseModel):
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    pending_bookings: int
    average_booking_value: Decimal
    booking_trends: List[BookingTrend]
    by_channel: Dict[str, int]
    by_room_type: Dict[str, int]
    lead_time_distribution: Dict[str, int]


# =====================================================
# CUSTOMER ANALYTICS SCHEMAS
# =====================================================

class CustomerSegment(BaseModel):
    segment_name: str
    customer_count: int
    total_revenue: Decimal
    average_lifetime_value: Decimal
    repeat_rate: Decimal


class CustomerAnalytics(BaseModel):
    total_customers: int
    new_customers: int
    returning_customers: int
    customer_retention_rate: Decimal
    average_customer_lifetime_value: Decimal
    segments: List[CustomerSegment]
    top_customers: List[Dict[str, Any]]


# =====================================================
# OPERATIONAL METRICS SCHEMAS
# =====================================================

class OperationalMetrics(BaseModel):
    average_checkin_time: Optional[str]
    average_checkout_time: Optional[str]
    service_request_resolution_time: Optional[str]
    housekeeping_efficiency: Decimal
    staff_productivity: Decimal
    inventory_turnover_rate: Decimal


# =====================================================
# FINANCIAL METRICS SCHEMAS
# =====================================================

class FinancialMetrics(BaseModel):
    gross_revenue: Decimal
    net_revenue: Decimal
    total_expenses: Decimal
    profit_margin: Decimal
    revenue_per_available_room: Decimal  # RevPAR
    average_daily_rate: Decimal  # ADR
    revenue_growth_rate: Decimal


# =====================================================
# FORECASTING SCHEMAS
# =====================================================

class ForecastPeriod(BaseModel):
    period: str
    predicted_revenue: Decimal
    predicted_occupancy: Decimal
    predicted_bookings: int
    confidence_interval_low: Decimal
    confidence_interval_high: Decimal


class RevenueForecast(BaseModel):
    forecast_type: str  # 'daily', 'weekly', 'monthly'
    forecast_horizon: int  # days/weeks/months
    base_date: date
    forecasts: List[ForecastPeriod]
    accuracy_metrics: Dict[str, Decimal]


class OccupancyForecast(BaseModel):
    forecast_type: str
    forecast_horizon: int
    base_date: date
    forecasts: List[ForecastPeriod]
    seasonal_factors: Dict[str, Decimal]


# =====================================================
# COMPREHENSIVE DASHBOARD SCHEMAS
# =====================================================

class AnalyticsDashboard(BaseModel):
    period: str  # 'today', 'week', 'month', 'year'
    revenue_analytics: RevenueAnalytics
    occupancy_analytics: OccupancyAnalytics
    booking_analytics: BookingAnalytics
    customer_analytics: CustomerAnalytics
    operational_metrics: OperationalMetrics
    financial_metrics: FinancialMetrics
    generated_at: datetime


# =====================================================
# TREND ANALYSIS SCHEMAS
# =====================================================

class TrendDataPoint(BaseModel):
    timestamp: datetime
    value: Decimal
    moving_average: Optional[Decimal]


class TrendAnalysis(BaseModel):
    metric_name: str
    trend_direction: str  # 'up', 'down', 'stable'
    trend_strength: Decimal  # 0-100
    data_points: List[TrendDataPoint]
    seasonality_detected: bool
    anomalies: List[Dict[str, Any]]


# =====================================================
# COMPARISON SCHEMAS
# =====================================================

class PeriodComparison(BaseModel):
    current_period: Dict[str, Any]
    previous_period: Dict[str, Any]
    change_amount: Decimal
    change_percentage: Decimal
    is_improvement: bool


# =====================================================
# KPI SCHEMAS
# =====================================================

class KPI(BaseModel):
    name: str
    value: Decimal
    target: Optional[Decimal]
    unit: str  # '$', '%', 'count', etc.
    trend: str  # 'up', 'down', 'stable'
    change_percentage: Decimal
    status: str  # 'good', 'warning', 'critical'


class KPIDashboard(BaseModel):
    kpis: List[KPI]
    last_updated: datetime


# =====================================================
# INSIGHTS SCHEMAS
# =====================================================

class Insight(BaseModel):
    insight_type: str  # 'opportunity', 'warning', 'trend', 'anomaly'
    severity: str  # 'low', 'medium', 'high'
    title: str
    description: str
    metric_name: str
    current_value: Decimal
    recommended_action: Optional[str]
    impact_estimate: Optional[str]
    generated_at: datetime


class InsightsList(BaseModel):
    insights: List[Insight]
    total_count: int


# =====================================================
# REPORT GENERATION SCHEMAS
# =====================================================

class ReportRequest(BaseModel):
    report_type: str = Field(..., pattern="^(revenue|occupancy|booking|customer|operational|comprehensive)$")
    start_date: date
    end_date: date
    format: str = Field(default="json", pattern="^(json|csv|pdf)$")
    include_charts: bool = False
    filters: Optional[Dict[str, Any]] = None


class ReportResponse(BaseModel):
    report_id: str
    report_type: str
    generated_at: datetime
    data: Dict[str, Any]
    download_url: Optional[str]


# =====================================================
# PERFORMANCE BENCHMARKS SCHEMAS
# =====================================================

class PerformanceBenchmark(BaseModel):
    metric_name: str
    your_value: Decimal
    industry_average: Decimal
    top_quartile: Decimal
    percentile_rank: int
    status: str  # 'above_average', 'average', 'below_average'


class BenchmarkReport(BaseModel):
    hotel_name: str
    comparison_period: str
    benchmarks: List[PerformanceBenchmark]
    overall_score: Decimal
    rank_category: str
