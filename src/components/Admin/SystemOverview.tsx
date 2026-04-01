import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, CreditCard, Bed, CheckCircle, Clock, Star, ShoppingCart, Users, AlertCircle } from 'lucide-react';
import { reportsService } from '@/lib/api/reports';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

const ROOM_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function SystemOverview({ onStatsUpdate: _onStatsUpdate }: { onStatsUpdate?: (stats: any) => void }) {
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    occupancyRate: 0,
    avgRating: 0,
    newUsers: 0,
    todayOrders: 0,
    pendingOrders: 0,
    completionRate: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [projectionMetrics, setProjectionMetrics] = useState({
    nextMonthProjection: 0,
    next3MonthsProjection: 0,
    growthRate: 0,
    confidence: 0
  });

  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Linear regression for sales projection
  const calculateLinearRegression = (data: any) => {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    data.forEach((point: any, index: any) => {
      sumX += index; sumY += point.revenue;
      sumXY += index * point.revenue; sumX2 += index * index;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  };

  const calculateRSquared = (data: any, slope: any, intercept: any) => {
    const n = data.length;
    if (n < 2) return 0;
    const yMean = data.reduce((s: any, p: any) => s + p.revenue, 0) / n;
    let ssTotal = 0, ssResidual = 0;
    data.forEach((p: any, i: any) => {
      const yPred = slope * i + intercept;
      ssTotal += Math.pow(p.revenue - yMean, 2);
      ssResidual += Math.pow(p.revenue - yPred, 2);
    });
    return ssTotal === 0 ? 0 : ((ssTotal - ssResidual) / ssTotal) * 100;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const revenueEndDate = endDate;
        const revenueStartDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

        // Run all fetches in parallel
        const [overview, revenueAnalytics, dashSummary, auditLog] = await Promise.allSettled([
          reportsService.getOverview(startDate, endDate),
          reportsService.getRevenueAnalytics(revenueStartDate, revenueEndDate, 'month'),
          api.get('/dashboard/manager/summary'),
          api.get('/admin/audit-log?limit=8'),
        ]);

        // ── KPIs from overview ──────────────────────────────────────────
        if (overview.status === 'fulfilled') {
          const ov = overview.value;
          setKpis(prev => ({
            ...prev,
            totalRevenue: ov.revenue.total,
            totalBookings: ov.bookings.total,
            newUsers: ov.customers.active,
          }));
        }

        // ── Dashboard summary → real room stats + occupancy rate ────────
        if (dashSummary.status === 'fulfilled') {
          const d = (dashSummary.value as any).data;
          const rooms = d?.rooms || {};
          const occupied    = rooms.occupied    ?? 0;
          const available   = rooms.available   ?? 0;
          const cleaning    = rooms.cleaning    ?? 0;
          const maintenance = rooms.maintenance ?? 0;

          const roomPie = [];
          if (occupied > 0)    roomPie.push({ name: 'Occupied',    value: occupied,    color: ROOM_COLORS[0] });
          if (available > 0)   roomPie.push({ name: 'Available',   value: available,   color: ROOM_COLORS[1] });
          if (cleaning > 0)    roomPie.push({ name: 'Cleaning',    value: cleaning,    color: ROOM_COLORS[2] });
          if (maintenance > 0) roomPie.push({ name: 'Maintenance', value: maintenance, color: ROOM_COLORS[3] });

          setOccupancyData(roomPie);

          setKpis(prev => ({
            ...prev,
            occupancyRate: Math.round(d?.occupancy_rate ?? 0),
            avgRating: d?.customer_satisfaction ?? 0,
            todayOrders: d?.orders?.today_count ?? 0,
            pendingOrders: d?.orders?.pending ?? 0,
            completionRate: d?.orders?.completed_today
              ? Math.round((d.orders.completed_today / (d.orders.today_count || 1)) * 100)
              : 0,
          }));

          // Today's order stats for the bar chart (in_progress, pending, completed)
          setOrderStats([
            { label: 'Pending',   count: d?.orders?.pending ?? 0,         color: '#f59e0b' },
            { label: 'In Kitchen',count: d?.orders?.in_progress ?? 0,     color: '#3b82f6' },
            { label: 'Completed', count: d?.orders?.completed_today ?? 0, color: '#10b981' },
          ]);
        }

        // ── Revenue chart + projections ─────────────────────────────────
        if (revenueAnalytics.status === 'fulfilled') {
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const transformed = (revenueAnalytics.value.data || []).map((item: any) => {
            const date = new Date(item.date + '-01');
            return {
              month: monthNames[date.getMonth()],
              revenue: item.total,
              bookings: item.count,
              type: 'actual'
            };
          }).slice(-6);

          setRevenueData(transformed);

          if (transformed.length >= 2) {
            const { slope, intercept } = calculateLinearRegression(transformed);
            const confidence = calculateRSquared(transformed, slope, intercept);
            const lastIndex = transformed.length - 1;
            const projections = Array.from({ length: 3 }, (_, i) => ({
              month: monthNames[(new Date().getMonth() + i + 1) % 12],
              revenue: Math.max(0, Math.round(slope * (lastIndex + i + 1) + intercept)),
              bookings: 0,
              type: 'projected'
            }));

            setProjectionData([...transformed, ...projections]);

            const first = transformed[0].revenue;
            const last  = transformed[transformed.length - 1].revenue;
            setProjectionMetrics({
              nextMonthProjection:   projections[0]?.revenue || 0,
              next3MonthsProjection: projections.reduce((s, p) => s + p.revenue, 0),
              growthRate: first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0,
              confidence: Math.round(confidence),
            });
          }
        }

        // ── Audit log → Recent activity ─────────────────────────────────
        if (auditLog.status === 'fulfilled') {
          const entries: any[] = (auditLog.value as any).data?.logs
            ?? (auditLog.value as any).data
            ?? [];
          setRecentActivity(
            entries.slice(0, 8).map((e: any) => ({
              event: formatAuditAction(e.action, e.details, e.performed_by_name),
              time: e.created_at,
              type: auditActionType(e.action),
            }))
          );
        }

      } catch (error: any) {
        console.error('Failed to load dashboard data:', error);
        toast.error('Failed to load some dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function formatAuditAction(action: string, _details: any, performedBy?: string): string {
    const by = performedBy ? ` by ${performedBy}` : '';
    const map: Record<string, string> = {
      user_created:    `New user created${by}`,
      user_updated:    `User account updated${by}`,
      user_deactivated:`User deactivated${by}`,
      set_pin:         `Staff PIN updated${by}`,
      remove_pin:      `Staff PIN removed${by}`,
      login:           `User logged in${by}`,
      logout:          `User logged out${by}`,
      order_created:   `New order placed${by}`,
      order_updated:   `Order updated${by}`,
      menu_item_created:`Menu item created${by}`,
      menu_item_updated:`Menu item updated${by}`,
      menu_item_deleted:`Menu item deleted${by}`,
      payment_processed:`Payment processed${by}`,
      stock_updated:   `Stock level updated${by}`,
    };
    return map[action] ?? `${action.replace(/_/g, ' ')}${by}`;
  }

  function auditActionType(action: string): 'success' | 'warning' | 'info' {
    if (['payment_processed', 'order_created', 'user_created', 'login'].includes(action)) return 'success';
    if (['user_deactivated', 'remove_pin', 'logout'].includes(action)) return 'warning';
    return 'info';
  }

  function timeAgo(isoString: string): string {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1)  return 'Just now';
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24)  return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch { return ''; }
  }

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Revenue (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {kpis.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">From completed payments</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  Room Occupancy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.occupancyRate}%</div>
                <Progress value={kpis.occupancyRate} className="h-2 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">Of total rooms occupied</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Today's Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.todayOrders}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {kpis.pendingOrders} pending · {kpis.completionRate}% completed
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.newUsers}</div>
                <div className="text-xs text-muted-foreground mt-1">In the last 30 days</div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sales Projection */}
          {projectionData.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
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
                    <div className="text-xs text-blue-600 mt-1">Linear regression forecast</div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
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

                <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
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

                <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
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

              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Revenue Projection & Forecast
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Historical data + 3-month projection
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
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                <p className="font-medium">{d.month}</p>
                                <p className={`text-sm ${d.type === 'projected' ? 'text-blue-600' : 'text-gray-600'}`}>
                                  {d.type === 'projected' ? 'Projected: ' : 'Actual: '}
                                  KES {d.revenue.toLocaleString()}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone"
                        dataKey={(e) => e.type === 'actual' ? e.revenue : null}
                        stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Actual" />
                      <Area type="monotone"
                        dataKey={(e) => e.type === 'projected' ? e.revenue : null}
                        stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3}
                        strokeDasharray="5 5" name="Projected" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded" />
                        <span className="text-sm text-muted-foreground">Historical</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-400 rounded border-2 border-purple-600 border-dashed" />
                        <span className="text-sm text-muted-foreground">Projected</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {projectionMetrics.confidence >= 80 ? '✓ High confidence' :
                       projectionMetrics.confidence >= 60 ? '⚠ Moderate confidence' :
                       '⚠ Low confidence — more data needed'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Occupancy Distribution — REAL DATA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  Room Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {occupancyData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No room data available</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={occupancyData}
                          cx="50%" cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {occupancyData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${v} rooms`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-2">
                      {occupancyData.map((room, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded" style={{ backgroundColor: room.color }} />
                            <span className="text-sm">{room.name}</span>
                          </div>
                          <span className="text-sm font-medium">{room.value} rooms</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Today's Order Status — REAL DATA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Today's Orders by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderStats.length === 0 || orderStats.every(s => s.count === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No orders today yet</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={orderStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {orderStats.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-2">
                      {orderStats.map((s, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded" style={{ backgroundColor: s.color }} />
                            <span className="text-sm">{s.label}</span>
                          </div>
                          <span className="text-sm font-medium">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent System Activity — REAL DATA from audit log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        {activity.type === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : activity.type === 'warning' ? (
                          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <span className="text-sm">{activity.event}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {timeAgo(activity.time)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
