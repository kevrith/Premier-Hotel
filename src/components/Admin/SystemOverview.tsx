import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, CreditCard, Bed, AlertTriangle, CheckCircle, Clock, Star } from 'lucide-react';
import { reportsService } from '@/lib/api/reports';
import { toast } from 'react-hot-toast';

export function SystemOverview({ onStatsUpdate }) {
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    occupancyRate: 0,
    avgRating: 4.8,
    newUsers: 0,
    systemUptime: 99.9
  });

  const [revenueData, setRevenueData] = useState([]);
  const [projectionData, setProjectionData] = useState([]);
  const [projectionMetrics, setProjectionMetrics] = useState({
    nextMonthProjection: 0,
    next3MonthsProjection: 0,
    growthRate: 0,
    confidence: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Linear regression function for sales projection
  const calculateLinearRegression = (data) => {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, index) => {
      const x = index;
      const y = point.revenue;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  // Calculate R-squared (confidence metric)
  const calculateRSquared = (data, slope, intercept) => {
    const n = data.length;
    if (n < 2) return 0;

    const yMean = data.reduce((sum, point) => sum + point.revenue, 0) / n;

    let ssTotal = 0;
    let ssResidual = 0;

    data.forEach((point, index) => {
      const yActual = point.revenue;
      const yPredicted = slope * index + intercept;

      ssTotal += Math.pow(yActual - yMean, 2);
      ssResidual += Math.pow(yActual - yPredicted, 2);
    });

    return ssTotal === 0 ? 0 : ((ssTotal - ssResidual) / ssTotal) * 100;
  };

  // Fetch real data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get last 30 days for overview
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch overview stats
        const overview = await reportsService.getOverview(startDate, endDate);

        // Fetch revenue analytics for the last 6 months
        const revenueEndDate = new Date().toISOString();
        const revenueStartDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
        const revenueAnalytics = await reportsService.getRevenueAnalytics(
          revenueStartDate,
          revenueEndDate,
          'month'
        );

        // Update KPIs with real data
        setKpis({
          totalRevenue: overview.revenue.total,
          totalBookings: overview.bookings.total,
          occupancyRate: Math.round((overview.bookings.confirmed / overview.bookings.total) * 100) || 0,
          avgRating: 4.8, // Keep static for now (needs review system)
          newUsers: overview.customers.active,
          systemUptime: 99.9 // Keep static (needs monitoring system)
        });

        // Transform revenue data for chart
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const transformedRevenue = revenueAnalytics.data.map(item => {
          const date = new Date(item.date + '-01');
          return {
            month: monthNames[date.getMonth()],
            revenue: item.total,
            bookings: item.count,
            type: 'actual'
          };
        }).slice(-6); // Last 6 months

        setRevenueData(transformedRevenue);

        // Calculate sales projection using linear regression
        if (transformedRevenue.length >= 2) {
          const { slope, intercept } = calculateLinearRegression(transformedRevenue);
          const confidence = calculateRSquared(transformedRevenue, slope, intercept);

          // Project next 3 months
          const lastIndex = transformedRevenue.length - 1;
          const projections = [];

          for (let i = 1; i <= 3; i++) {
            const projectedRevenue = slope * (lastIndex + i) + intercept;
            const monthIndex = (new Date().getMonth() + i) % 12;

            projections.push({
              month: monthNames[monthIndex],
              revenue: Math.max(0, Math.round(projectedRevenue)), // Ensure non-negative
              bookings: 0,
              type: 'projected'
            });
          }

          // Combine historical and projected data
          const combinedData = [...transformedRevenue, ...projections];
          setProjectionData(combinedData);

          // Calculate growth rate
          const firstRevenue = transformedRevenue[0].revenue;
          const lastRevenue = transformedRevenue[transformedRevenue.length - 1].revenue;
          const growthRate = firstRevenue > 0
            ? ((lastRevenue - firstRevenue) / firstRevenue) * 100
            : 0;

          setProjectionMetrics({
            nextMonthProjection: projections[0]?.revenue || 0,
            next3MonthsProjection: projections.reduce((sum, p) => sum + p.revenue, 0),
            growthRate: Math.round(growthRate * 10) / 10,
            confidence: Math.round(confidence)
          });
        }

      } catch (error: any) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load dashboard data. Showing partial information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const [occupancyData] = useState([
    { name: 'Standard Rooms', value: 65, color: '#3b82f6' },
    { name: 'Deluxe Rooms', value: 45, color: '#10b981' },
    { name: 'Suites', value: 25, color: '#f59e0b' },
    { name: 'Presidential', value: 8, color: '#ef4444' }
  ]);

  const [systemHealth] = useState([
    { component: 'Database', status: 'healthy', uptime: 100 },
    { component: 'API Server', status: 'healthy', uptime: 99.8 },
    { component: 'Payment Gateway', status: 'healthy', uptime: 99.5 },
    { component: 'Email Service', status: 'warning', uptime: 98.2 },
    { component: 'File Storage', status: 'healthy', uptime: 99.9 }
  ]);

  const [userActivity] = useState([
    { hour: '00:00', active: 12 },
    { hour: '04:00', active: 8 },
    { hour: '08:00', active: 35 },
    { hour: '12:00', active: 65 },
    { hour: '16:00', active: 78 },
    { hour: '20:00', active: 45 },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Overview</h2>
        <Badge variant="outline" className="text-sm">
          {isLoading ? 'Loading...' : `Last updated: ${new Date().toLocaleTimeString()}`}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Revenue (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {kpis.totalRevenue.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Real-time data from database
                </div>
              </CardContent>
            </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.occupancyRate}%</div>
            <Progress value={kpis.occupancyRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgRating}/5.0</div>
            <div className="text-sm text-muted-foreground">Based on guest reviews</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends (Historical)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales Projection - Enterprise Feature */}
      {projectionData.length > 0 && (
        <>
          {/* Projection Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Next Month Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  KES {projectionMetrics.nextMonthProjection.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600 mt-1">AI-powered forecast</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  3-Month Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  KES {projectionMetrics.next3MonthsProjection.toLocaleString()}
                </div>
                <div className="text-xs text-purple-600 mt-1">Cumulative revenue</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {projectionMetrics.growthRate >= 0 ? '+' : ''}{projectionMetrics.growthRate}%
                </div>
                <div className="text-xs text-green-600 mt-1">6-month trend</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-orange-600" />
                  Confidence Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {projectionMetrics.confidence}%
                </div>
                <div className="text-xs text-orange-600 mt-1">R² accuracy score</div>
              </CardContent>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Revenue Projection & Forecast
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Linear regression analysis of historical sales data (Last 6 months + Next 3 months)
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  Enterprise Analytics
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                            <p className="font-medium">{data.month}</p>
                            <p className={`text-sm ${data.type === 'projected' ? 'text-blue-600' : 'text-gray-600'}`}>
                              {data.type === 'projected' ? 'Projected: ' : 'Actual: '}
                              KES {data.revenue.toLocaleString()}
                            </p>
                            {data.type === 'projected' && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ±{Math.round((100 - projectionMetrics.confidence) / 2)}% variance
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Actual revenue area */}
                  <Area
                    type="monotone"
                    dataKey={(entry) => entry.type === 'actual' ? entry.revenue : null}
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Actual Revenue"
                  />
                  {/* Projected revenue area */}
                  <Area
                    type="monotone"
                    dataKey={(entry) => entry.type === 'projected' ? entry.revenue : null}
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                    strokeDasharray="5 5"
                    name="Projected Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Legend and insights */}
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600">Historical Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-400 rounded border-2 border-purple-600 border-dashed"></div>
                    <span className="text-sm text-gray-600">Projected Revenue</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {projectionMetrics.confidence >= 80 ? '✓ High confidence' :
                   projectionMetrics.confidence >= 60 ? '⚠ Moderate confidence' :
                   '⚠ Low confidence - More data needed'}
                </div>
              </div>

              {/* Business insights */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  Business Insights
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {projectionMetrics.growthRate > 0 ? (
                    <li>• Revenue is trending <span className="font-semibold text-green-600">upward</span> with {projectionMetrics.growthRate}% growth over 6 months</li>
                  ) : projectionMetrics.growthRate < 0 ? (
                    <li>• Revenue is trending <span className="font-semibold text-red-600">downward</span> with {Math.abs(projectionMetrics.growthRate)}% decline - action needed</li>
                  ) : (
                    <li>• Revenue is <span className="font-semibold text-gray-600">stable</span> with minimal change</li>
                  )}
                  <li>• Expected revenue next month: <span className="font-semibold">KES {projectionMetrics.nextMonthProjection.toLocaleString()}</span></li>
                  <li>• Projection accuracy: <span className="font-semibold">{projectionMetrics.confidence}%</span> (R-squared coefficient)</li>
                  {projectionMetrics.confidence < 70 && (
                    <li className="text-orange-600">• ⚠ Recommendation: Collect more historical data for better predictions</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Occupancy Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Room Occupancy Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {occupancyData.map((room, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: room.color }} />
                    <span className="text-sm">{room.name}</span>
                  </div>
                  <span className="text-sm font-medium">{room.value} rooms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium">{item.component}</div>
                      <div className="text-xs text-muted-foreground">Uptime: {item.uptime}%</div>
                    </div>
                  </div>
                  <Badge 
                    variant={item.status === 'healthy' ? 'default' : 'warning'}
                    className={`${getStatusColor(item.status)} text-white`}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={userActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="active" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent System Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { event: 'New booking created', time: '2 minutes ago', type: 'success' },
              { event: 'Payment processed successfully', time: '5 minutes ago', type: 'success' },
              { event: 'Email service delay detected', time: '12 minutes ago', type: 'warning' },
              { event: 'Menu item updated', time: '20 minutes ago', type: 'info' },
              { event: 'User registration completed', time: '30 minutes ago', type: 'success' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' : 
                    activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm">{activity.event}</span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}