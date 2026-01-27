import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Clock,
  BarChart3,
  Users,
  Calendar,
  TrendingDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { analyticsService, type SalesAnalytics, type AnalyticsFilters } from '@/lib/api/analytics';

export function SalesAnalytics() {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    time_granularity: 'day'
  });

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await analyticsService.getSalesAnalytics(filters);
      setAnalytics(data);
    } catch (error: any) {
      toast.error('Failed to load sales analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Select a date range to view sales analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <CardTitle>Sales Analytics</CardTitle>
            <CardDescription>
              Sales performance analysis for {format(new Date(filters.start_date), 'MMM d, yyyy')} to {format(new Date(filters.end_date), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filters.time_granularity} onValueChange={(value: 'hour' | 'day' | 'week' | 'month') => setFilters({...filters, time_granularity: value})}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => window.print()} variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.total_revenue)}</p>
                <p className="text-sm text-green-600">{formatPercentage(analytics.growth_rate)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.total_orders}</p>
                <p className="text-sm text-blue-600">+12.5%</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.avg_order_value)}</p>
                <p className="text-sm text-purple-600">+8.2%</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peak Hours</p>
                <p className="text-2xl font-bold">
                  {analytics.peak_hours.length > 0 ? analytics.peak_hours[0].hour : 'N/A'}
                </p>
                <p className="text-sm text-orange-600">{analytics.peak_hours.length > 0 ? formatCurrency(analytics.peak_hours[0].revenue) : 'N/A'}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="customers">Customer Segments</TabsTrigger>
          <TabsTrigger value="peak_hours">Peak Hours</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Items</CardTitle>
              <CardDescription>Best selling items by revenue and volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.top_performing_items.map((item, index) => (
                  <div key={item.item_name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity_sold} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(item.revenue)}</p>
                      <Badge variant="outline">
                        {item.profit_margin.toFixed(1)}% margin
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Revenue Growth</span>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{formatPercentage(analytics.growth_rate)}</div>
                  <div className="text-sm text-muted-foreground">vs previous period</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Order Volume</span>
                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{analytics.total_orders.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total orders in period</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Average Order Value</span>
                    <DollarSign className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(analytics.avg_order_value)}</div>
                  <div className="text-sm text-muted-foreground">Per order average</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Peak Performance</span>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold">
                    {analytics.peak_hours.length > 0 ? analytics.peak_hours[0].hour : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.peak_hours.length > 0 ? `${analytics.peak_hours[0].orders} orders, ${formatCurrency(analytics.peak_hours[0].revenue)}` : 'No data'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Segments Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Segment Analysis</CardTitle>
              <CardDescription>Revenue breakdown by customer segments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.customer_segments.map((segment) => (
                  <div key={segment.segment} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{segment.segment}</p>
                      <p className="text-sm text-muted-foreground">{segment.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(segment.revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(segment.avg_order_value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Peak Hours Tab */}
        <TabsContent value="peak_hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peak Hour Analysis</CardTitle>
              <CardDescription>Hourly performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.peak_hours.map((hour) => (
                  <div key={hour.hour} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{hour.hour}</p>
                      <p className="text-sm text-muted-foreground">{hour.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(hour.revenue)}</p>
                      <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(hour.revenue / Math.max(...analytics.peak_hours.map(h => h.revenue))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}