import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, CreditCard, Tag, Download, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import reportsService, { RevenueAnalytics, OrdersStats, BookingsStats } from '@/lib/api/reports';
import apiClient from '@/lib/api/client';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  bookings: number;
  mpesa: number;
  cash: number;
  card: number;
}

interface CategorySales {
  category: string;
  revenue: number;
  orders: number;
  percentage: number;
}

interface TopItem {
  item: string;
  itemId: string;
  revenue: number;
  orders: number;
  category: string;
}

interface PaymentMethod {
  method: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export function SalesReports() {
  const [dateRange, setDateRange] = useState('week');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [ordersStats, setOrdersStats] = useState<OrdersStats | null>(null);
  const [bookingsStats, setBookingsStats] = useState<BookingsStats | null>(null);
  const { toast } = useToast();

  // Fetch all reports data
  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const dateRangeData = reportsService.getDateRange(dateRange as 'today' | 'week' | 'month' | 'year');

      // Fetch all data in parallel
      const [revenueData, ordersData, bookingsData, menuItemsResponse] = await Promise.all([
        reportsService.getRevenueAnalytics(dateRangeData.start, dateRangeData.end, 'day'),
        reportsService.getOrdersStats(dateRangeData.start, dateRangeData.end),
        reportsService.getBookingsStats(dateRangeData.start, dateRangeData.end),
        apiClient.get('/menu/items')
      ]);

      // Transform revenue data
      const transformedSales = revenueData.data.map((item: any) => ({
        date: item.date,
        revenue: item.total,
        orders: item.count,
        avgOrderValue: item.count > 0 ? item.total / item.count : 0,
        bookings: item.bookings || 0,
        mpesa: item.mpesa || 0,
        cash: item.cash || 0,
        card: item.card || 0
      }));

      setSalesData(transformedSales);
      setOrdersStats(ordersData);
      setBookingsStats(bookingsData);

      // Build menu item lookup
      const menuItems = menuItemsResponse.data || [];
      const menuItemMap = new Map(menuItems.map((item: any) => [item.id, item]));

      // Calculate category sales from orders stats
      const categoryData: CategorySales[] = [];
      const totalOrdersRevenue = ordersData.summary.total_revenue;
      const totalBookingsRevenue = bookingsStats?.summary.total_revenue || 0;
      const grandTotal = totalOrdersRevenue + totalBookingsRevenue;

      // Add bookings as a category
      if (totalBookingsRevenue > 0) {
        categoryData.push({
          category: 'Room Bookings',
          revenue: totalBookingsRevenue,
          orders: bookingsData.summary.total_bookings,
          percentage: grandTotal > 0 ? Math.round((totalBookingsRevenue / grandTotal) * 100) : 0
        });
      }

      // Add orders by location as categories (Restaurant, Bar, Room Service)
      if (ordersData.by_location) {
        const locationRevenue = Object.entries(ordersData.by_location).map(([location, count]) => {
          // Estimate revenue by location (proportional to order count)
          const avgValue = ordersData.summary.average_order_value;
          const estRevenue = (count as number) * avgValue;
          return {
            category: location || 'Restaurant',
            revenue: estRevenue,
            orders: count as number,
            percentage: grandTotal > 0 ? Math.round((estRevenue / grandTotal) * 100) : 0
          };
        });
        categoryData.push(...locationRevenue);
      }

      // If no location data, show orders as single category
      if (categoryData.length <= 1 && totalOrdersRevenue > 0) {
        categoryData.push({
          category: 'Food & Beverage Orders',
          revenue: totalOrdersRevenue,
          orders: ordersData.summary.total_orders,
          percentage: grandTotal > 0 ? Math.round((totalOrdersRevenue / grandTotal) * 100) : 0
        });
      }

      setCategorySales(categoryData.sort((a, b) => b.revenue - a.revenue));

      // Build top items from orders stats
      const topItemsData: TopItem[] = (ordersData.top_items || []).map((item: any) => {
        const menuItem = menuItemMap.get(item.menu_item_id) as any;
        return {
          item: menuItem?.name || 'Unknown Item',
          itemId: item.menu_item_id,
          revenue: (menuItem?.price || 0) * item.quantity,
          orders: item.quantity,
          category: menuItem?.category || 'Food'
        };
      });

      setTopItems(topItemsData);

      // Calculate payment methods from revenue data
      const paymentTotals = revenueData.data.reduce((acc: any, day: any) => {
        acc.mpesa += day.mpesa || 0;
        acc.cash += day.cash || 0;
        acc.card += day.card || 0;
        return acc;
      }, { mpesa: 0, cash: 0, card: 0 });

      const totalPayments = paymentTotals.mpesa + paymentTotals.cash + paymentTotals.card;

      const paymentMethodsData: PaymentMethod[] = [
        {
          method: 'M-Pesa',
          revenue: paymentTotals.mpesa,
          orders: Math.round(paymentTotals.mpesa / (revenueData.summary.average_transaction || 1)),
          percentage: totalPayments > 0 ? Math.round((paymentTotals.mpesa / totalPayments) * 100) : 0
        },
        {
          method: 'Cash',
          revenue: paymentTotals.cash,
          orders: Math.round(paymentTotals.cash / (revenueData.summary.average_transaction || 1)),
          percentage: totalPayments > 0 ? Math.round((paymentTotals.cash / totalPayments) * 100) : 0
        },
        {
          method: 'Credit Card',
          revenue: paymentTotals.card,
          orders: Math.round(paymentTotals.card / (revenueData.summary.average_transaction || 1)),
          percentage: totalPayments > 0 ? Math.round((paymentTotals.card / totalPayments) * 100) : 0
        }
      ].filter(m => m.revenue > 0).sort((a, b) => b.revenue - a.revenue);

      setPaymentMethods(paymentMethodsData);

    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast({
        title: 'Error loading sales data',
        description: 'Failed to fetch sales analytics from database',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = useMemo(() =>
    salesData.reduce((sum, day) => sum + day.revenue, 0),
    [salesData]
  );

  const totalOrders = useMemo(() =>
    salesData.reduce((sum, day) => sum + day.orders, 0),
    [salesData]
  );

  const avgOrderValue = useMemo(() =>
    totalOrders > 0 ? totalRevenue / totalOrders : 0,
    [totalRevenue, totalOrders]
  );

  // Calculate growth rate (compare to previous period)
  const growthRate = useMemo(() => {
    if (salesData.length < 2) return 0;
    const midPoint = Math.floor(salesData.length / 2);
    const firstHalf = salesData.slice(midPoint).reduce((sum, d) => sum + d.revenue, 0);
    const secondHalf = salesData.slice(0, midPoint).reduce((sum, d) => sum + d.revenue, 0);
    if (firstHalf === 0) return 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  }, [salesData]);

  const handleExport = (format: string) => {
    toast({
      title: "Export initiated",
      description: `Exporting sales report as ${format.toUpperCase()}...`
    });
  };

  const handleRefresh = () => {
    fetchAllData();
    toast({
      title: "Refreshing data",
      description: "Loading latest sales data..."
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading sales reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === 'today' ? 'Today' :
               dateRange === 'week' ? 'Last 7 days' :
               dateRange === 'month' ? 'Last 30 days' : 'This year'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ordersStats?.summary.completion_rate || 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {Math.round(avgOrderValue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-5 w-5" />
              {growthRate >= 0 ? '+' : ''}{growthRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Period over period</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Customize your sales report parameters (data from database)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
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

            <div className="flex items-end gap-2">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => handleExport('pdf')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => handleExport('excel')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-2" />
            By Category
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Room Bookings
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Breakdown</CardTitle>
              <CardDescription>Real-time revenue data from orders and bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sales data for this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Avg Order Value</TableHead>
                      <TableHead>M-Pesa</TableHead>
                      <TableHead>Cash</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((day, index) => {
                      const prevDay = salesData[index + 1];
                      const growth = prevDay
                        ? ((day.revenue - prevDay.revenue) / prevDay.revenue * 100).toFixed(1)
                        : '0';
                      return (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{day.date}</TableCell>
                          <TableCell>KES {day.revenue.toLocaleString()}</TableCell>
                          <TableCell>{day.orders}</TableCell>
                          <TableCell>KES {Math.round(day.avgOrderValue).toLocaleString()}</TableCell>
                          <TableCell>KES {(day.mpesa || 0).toLocaleString()}</TableCell>
                          <TableCell>KES {(day.cash || 0).toLocaleString()}</TableCell>
                          <TableCell>KES {(day.card || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={Number(growth) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {Number(growth) >= 0 ? '+' : ''}{growth}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                {categorySales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No category data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySales.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell>KES {cat.revenue.toLocaleString()}</TableCell>
                          <TableCell>{cat.orders}</TableCell>
                          <TableCell>
                            <Badge>{cat.percentage}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>Best performing menu items</CardDescription>
              </CardHeader>
              <CardContent>
                {topItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No item data available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Qty Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topItems.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>KES {item.revenue.toLocaleString()}</TableCell>
                          <TableCell>{item.orders}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Analysis</CardTitle>
              <CardDescription>Revenue breakdown by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payment data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Avg Transaction</TableHead>
                      <TableHead>Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method) => (
                      <TableRow key={method.method}>
                        <TableCell className="font-medium">{method.method}</TableCell>
                        <TableCell>KES {method.revenue.toLocaleString()}</TableCell>
                        <TableCell>{method.orders}</TableCell>
                        <TableCell>
                          KES {method.orders > 0 ? Math.round(method.revenue / method.orders).toLocaleString() : 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge>{method.percentage}%</Badge>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${method.percentage}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Revenue from All Payment Methods</span>
                  <span className="text-2xl font-bold">
                    KES {paymentMethods.reduce((sum, m) => sum + m.revenue, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Bookings Summary</CardTitle>
              <CardDescription>Booking statistics and room type performance</CardDescription>
            </CardHeader>
            <CardContent>
              {!bookingsStats ? (
                <div className="text-center py-8 text-muted-foreground">
                  No booking data available
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Bookings</p>
                      <p className="text-2xl font-bold">{bookingsStats.summary.total_bookings}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Booking Revenue</p>
                      <p className="text-2xl font-bold">KES {bookingsStats.summary.total_revenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Booking Value</p>
                      <p className="text-2xl font-bold">KES {Math.round(bookingsStats.summary.average_booking_value).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Stay Duration</p>
                      <p className="text-2xl font-bold">{bookingsStats.summary.average_stay_duration} nights</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Bookings by Status</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(bookingsStats.by_status || {}).map(([status, count]) => (
                            <TableRow key={status}>
                              <TableCell className="font-medium capitalize">{status}</TableCell>
                              <TableCell>{count as number}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Bookings by Room Type</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(bookingsStats.by_room_type || {}).map(([roomType, count]) => (
                            <TableRow key={roomType}>
                              <TableCell className="font-medium capitalize">{roomType}</TableCell>
                              <TableCell>{count as number}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
