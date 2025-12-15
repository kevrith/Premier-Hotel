import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Hotel,
  Calendar,
  BarChart3,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import reportsService from '@/lib/api/reports';

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // today, week, month, year
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [bookingsStats, setBookingsStats] = useState(null);
  const [ordersStats, setOrdersStats] = useState(null);

  useEffect(() => {
    // Check authentication and role
    if (!isAuthenticated) {
      toast.error('Please login to view reports');
      navigate('/login');
      return;
    }

    // Check if user is staff/admin
    const userRole = user?.role || 'customer';
    if (!['admin', 'manager', 'staff'].includes(userRole)) {
      toast.error('You do not have permission to view reports');
      navigate('/');
      return;
    }

    loadReports();
  }, [isAuthenticated, user, navigate, period]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const dateRange = reportsService.getDateRange(period);

      // Load all reports data
      const [overviewData, revenue, bookings, orders] = await Promise.all([
        reportsService.getOverview(dateRange.start, dateRange.end),
        reportsService.getRevenueAnalytics(dateRange.start, dateRange.end, period === 'today' ? 'day' : 'day'),
        reportsService.getBookingsStats(dateRange.start, dateRange.end),
        reportsService.getOrdersStats(dateRange.start, dateRange.end)
      ]);

      setOverview(overviewData);
      setRevenueData(revenue);
      setBookingsStats(bookings);
      setOrdersStats(orders);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${amount?.toLocaleString() || '0'}`;
  };

  const formatPercent = (value) => {
    return `${value?.toFixed(1) || '0'}%`;
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, subtitle }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">Business insights and performance metrics</p>
          </div>

          {/* Period Selector */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(overview?.revenue?.total)}
                icon={DollarSign}
                subtitle={`${overview?.revenue?.payments_count || 0} transactions`}
              />
              <StatCard
                title="Active Customers"
                value={overview?.customers?.active || 0}
                icon={Users}
                subtitle="Unique customers"
              />
              <StatCard
                title="Bookings"
                value={overview?.bookings?.total || 0}
                icon={Hotel}
                subtitle={`${formatPercent(100 - (overview?.bookings?.cancellation_rate || 0))} confirmed`}
              />
              <StatCard
                title="Orders"
                value={overview?.orders?.total || 0}
                icon={ShoppingBag}
                subtitle={`${formatPercent(overview?.orders?.completion_rate)} completed`}
              />
            </div>

            <Tabs defaultValue="revenue" className="space-y-6">
              <TabsList>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>

              {/* Revenue Tab */}
              <TabsContent value="revenue" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                      <CardDescription>Daily revenue over selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {revenueData && revenueData.data.length > 0 ? (
                        <div className="space-y-4">
                          {/* Simple bar chart visualization */}
                          <div className="space-y-2">
                            {revenueData.data.slice(-14).map((item, index) => {
                              const maxRevenue = Math.max(...revenueData.data.map(d => d.total));
                              const width = (item.total / maxRevenue) * 100;
                              return (
                                <div key={index} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{item.date}</span>
                                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No revenue data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Summary</CardTitle>
                      <CardDescription>Breakdown by source</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Total Revenue</span>
                          <span className="text-sm font-bold">{formatCurrency(revenueData?.summary?.total_revenue)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Transactions</span>
                          <span className="text-sm">{revenueData?.summary?.total_transactions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg Transaction</span>
                          <span className="text-sm">{formatCurrency(revenueData?.summary?.average_transaction)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Bookings Tab */}
              <TabsContent value="bookings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bookings Summary</CardTitle>
                      <CardDescription>Performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Bookings</span>
                          <span className="font-semibold">{bookingsStats?.summary?.total_bookings || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Total Revenue</span>
                          <span className="font-semibold">{formatCurrency(bookingsStats?.summary?.total_revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Booking Value</span>
                          <span className="font-semibold">{formatCurrency(bookingsStats?.summary?.average_booking_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Stay Duration</span>
                          <span className="font-semibold">{bookingsStats?.summary?.average_stay_duration} nights</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>By Room Type</CardTitle>
                      <CardDescription>Bookings distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {bookingsStats?.by_room_type && Object.entries(bookingsStats.by_room_type).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-sm capitalize">{type}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Orders Summary</CardTitle>
                      <CardDescription>Performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Orders</span>
                          <span className="font-semibold">{ordersStats?.summary?.total_orders || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Total Revenue</span>
                          <span className="font-semibold">{formatCurrency(ordersStats?.summary?.total_revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Order Value</span>
                          <span className="font-semibold">{formatCurrency(ordersStats?.summary?.average_order_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Completion Rate</span>
                          <span className="font-semibold">{formatPercent(ordersStats?.summary?.completion_rate)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>By Status</CardTitle>
                      <CardDescription>Orders distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {ordersStats?.by_status && Object.entries(ordersStats.by_status).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center">
                            <span className="text-sm capitalize">{status}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
