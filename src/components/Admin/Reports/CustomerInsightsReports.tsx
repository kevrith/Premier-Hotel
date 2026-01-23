import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, Download, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import reportsService, { TopCustomer, BookingsStats } from '@/lib/api/reports';
import apiClient from '@/lib/api/client';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
}

interface BookingCustomer {
  customerId: string;
  customerName: string;
  totalBookings: number;
  totalNights: number;
  avgStayDuration: number;
  preferredRoomType: string;
  totalSpent: number;
}

export function CustomerInsightsReports() {
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [topCustomers, setTopCustomers] = useState<CustomerData[]>([]);
  const [bookingCustomers, setBookingCustomers] = useState<BookingCustomer[]>([]);
  const [bookingsStats, setBookingsStats] = useState<BookingsStats | null>(null);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const dateRange = reportsService.getDateRange(period as 'today' | 'week' | 'month' | 'year');

      // Fetch data in parallel
      const [topCustomersData, bookingsData, profilesResponse] = await Promise.all([
        reportsService.getTopCustomers(20, dateRange.start, dateRange.end),
        reportsService.getBookingsStats(dateRange.start, dateRange.end),
        apiClient.get('/admin/users?role=customer&limit=100').catch(() => ({ data: [] }))
      ]);

      // Build user lookup map
      const profiles = profilesResponse.data || [];
      const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

      // Transform top customers data
      const transformedCustomers: CustomerData[] = topCustomersData.customers.map((customer: TopCustomer) => {
        const profile = profileMap.get(customer.user_id) as any;
        return {
          id: customer.user_id,
          name: profile?.full_name || profile?.email || 'Unknown Customer',
          email: profile?.email || '',
          totalSpent: customer.total_spent,
          transactionCount: customer.transaction_count,
          avgTransaction: customer.average_transaction
        };
      });

      setTopCustomers(transformedCustomers);
      setBookingsStats(bookingsData);
      setTotalCustomers(profiles.length);

      // Fetch booking customers (get customers with bookings)
      try {
        const bookingsResponse = await apiClient.get(`/bookings?start_date=${dateRange.start}&end_date=${dateRange.end}`);
        const bookings = bookingsResponse.data || [];

        // Aggregate bookings by customer
        const customerBookings = new Map<string, {
          bookings: number;
          nights: number;
          spent: number;
          roomTypes: Record<string, number>;
          customerId: string;
          customerName: string;
        }>();

        bookings.forEach((booking: any) => {
          const customerId = booking.customer_id || booking.user_id;
          if (!customerId) return;

          const profile = profileMap.get(customerId) as any;
          const existing = customerBookings.get(customerId) || {
            bookings: 0,
            nights: 0,
            spent: 0,
            roomTypes: {},
            customerId,
            customerName: profile?.full_name || profile?.email || 'Unknown'
          };

          existing.bookings++;
          existing.spent += parseFloat(booking.total_amount || 0);

          // Calculate nights
          if (booking.check_in && booking.check_out) {
            const checkIn = new Date(booking.check_in);
            const checkOut = new Date(booking.check_out);
            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
            existing.nights += nights;
          }

          // Track room type preference
          const roomType = booking.room_type || 'Standard';
          existing.roomTypes[roomType] = (existing.roomTypes[roomType] || 0) + 1;

          customerBookings.set(customerId, existing);
        });

        // Convert to array and find preferred room types
        const bookingCustomersData: BookingCustomer[] = Array.from(customerBookings.values())
          .map(data => {
            // Find most common room type
            const preferredRoomType = Object.entries(data.roomTypes)
              .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Standard';

            return {
              customerId: data.customerId,
              customerName: data.customerName,
              totalBookings: data.bookings,
              totalNights: data.nights,
              avgStayDuration: data.bookings > 0 ? data.nights / data.bookings : 0,
              preferredRoomType,
              totalSpent: data.spent
            };
          })
          .sort((a, b) => b.totalBookings - a.totalBookings)
          .slice(0, 20);

        setBookingCustomers(bookingCustomersData);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setBookingCustomers([]);
      }

    } catch (error) {
      console.error('Error fetching customer insights:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to fetch customer insights data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = useMemo(() =>
    topCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0),
    [topCustomers]
  );

  const avgCustomerValue = useMemo(() =>
    topCustomers.length > 0 ? totalRevenue / topCustomers.length : 0,
    [totalRevenue, topCustomers]
  );

  const handleExport = (format: string) => {
    toast({
      title: "Export initiated",
      description: `Exporting customer insights as ${format.toUpperCase()}...`
    });
  };

  const handleRefresh = () => {
    fetchData();
    toast({
      title: "Refreshing data",
      description: "Loading latest customer data..."
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading customer insights...</span>
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
              <Users className="h-4 w-4" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topCustomers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              With transactions in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From top customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {Math.round(avgCustomerValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingsStats?.summary.total_bookings || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card>
        <CardHeader>
          <CardTitle>Report Options</CardTitle>
          <CardDescription>Filter data and export reports (real-time from database)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="spending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="spending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Top Spenders
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Room Bookings
          </TabsTrigger>
          <TabsTrigger value="summary">
            Summary Stats
          </TabsTrigger>
        </TabsList>

        {/* Top Spenders Tab */}
        <TabsContent value="spending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Spending</CardTitle>
              <CardDescription>
                Customers ranked by total transaction value
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customer transaction data available for this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Avg Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.email}
                        </TableCell>
                        <TableCell className="font-semibold">
                          KES {customer.totalSpent.toLocaleString()}
                        </TableCell>
                        <TableCell>{customer.transactionCount}</TableCell>
                        <TableCell>KES {Math.round(customer.avgTransaction).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">High-Value Customers</p>
                  <p className="text-xl font-bold text-blue-600">
                    {topCustomers.filter(c => c.totalSpent > 50000).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Spent over KES 50,000</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Frequent Customers</p>
                  <p className="text-xl font-bold text-green-600">
                    {topCustomers.filter(c => c.transactionCount >= 5).length}
                  </p>
                  <p className="text-xs text-muted-foreground">5+ transactions</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Customer Revenue</p>
                  <p className="text-xl font-bold text-purple-600">
                    KES {totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Booking Patterns</CardTitle>
              <CardDescription>
                Track customer room booking frequency and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No booking data available for this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Bookings</TableHead>
                      <TableHead>Total Nights</TableHead>
                      <TableHead>Avg Stay</TableHead>
                      <TableHead>Preferred Room</TableHead>
                      <TableHead>Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingCustomers.map((customer) => (
                      <TableRow key={customer.customerId}>
                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                        <TableCell>{customer.totalBookings}</TableCell>
                        <TableCell>{customer.totalNights} nights</TableCell>
                        <TableCell>{customer.avgStayDuration.toFixed(1)} nights</TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.preferredRoomType}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          KES {customer.totalSpent.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {bookingsStats && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Booking Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Bookings:</span>
                        <span className="font-semibold">{bookingsStats.summary.total_bookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Revenue:</span>
                        <span className="font-semibold">KES {bookingsStats.summary.total_revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Booking Value:</span>
                        <span className="font-semibold">KES {Math.round(bookingsStats.summary.average_booking_value).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Stay Duration:</span>
                        <span className="font-semibold">{bookingsStats.summary.average_stay_duration} nights</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Bookings by Room Type</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(bookingsStats.by_room_type || {}).map(([roomType, count]) => (
                        <div key={roomType} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{roomType}:</span>
                          <Badge>{count as number} bookings</Badge>
                        </div>
                      ))}
                      {Object.keys(bookingsStats.by_room_type || {}).length === 0 && (
                        <p className="text-muted-foreground">No room type data available</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Stats Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Insights Summary</CardTitle>
              <CardDescription>
                Overall customer statistics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-3xl font-bold">{totalCustomers}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Active This Period</p>
                  <p className="text-3xl font-bold">{topCustomers.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Avg Revenue/Customer</p>
                  <p className="text-3xl font-bold">KES {Math.round(avgCustomerValue).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Room Bookings</p>
                  <p className="text-3xl font-bold">{bookingsStats?.summary.total_bookings || 0}</p>
                </div>
              </div>

              {bookingsStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Booking Status Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(bookingsStats.by_status || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <span className="capitalize">{status}</span>
                          <Badge variant={
                            status === 'confirmed' || status === 'checked_in' ? 'default' :
                            status === 'cancelled' ? 'destructive' : 'secondary'
                          }>
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Customer Engagement</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>High-Value (50K+)</span>
                          <span>{topCustomers.filter(c => c.totalSpent > 50000).length} customers</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(topCustomers.filter(c => c.totalSpent > 50000).length / topCustomers.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Regular (5+ trans)</span>
                          <span>{topCustomers.filter(c => c.transactionCount >= 5).length} customers</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(topCustomers.filter(c => c.transactionCount >= 5).length / topCustomers.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>New Customers</span>
                          <span>{topCustomers.filter(c => c.transactionCount === 1).length} customers</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(topCustomers.filter(c => c.transactionCount === 1).length / topCustomers.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
