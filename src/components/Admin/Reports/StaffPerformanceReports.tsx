import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, TrendingUp, Download, Award, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import reportsService, { EmployeeSalesData, EmployeeSalesResponse } from '@/lib/api/reports';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  sales: number;
  orders: number;
  completedOrders: number;
  avgOrderValue: number;
  completionRate: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  topSellingItem: string;
}

export function StaffPerformanceReports() {
  const [selectedRole, setSelectedRole] = useState('all');
  const [period, setPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [staffPerformance, setStaffPerformance] = useState<StaffMember[]>([]);
  const [summaryData, setSummaryData] = useState<{ totalSales: number; totalOrders: number; totalEmployees: number }>({
    totalSales: 0,
    totalOrders: 0,
    totalEmployees: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStaffData();
  }, [period, selectedRole]);

  const fetchStaffData = async () => {
    try {
      setIsLoading(true);
      const dateRange = reportsService.getDateRange(period as 'today' | 'week' | 'month' | 'year');

      const data = await reportsService.getEmployeeSales(
        dateRange.start,
        dateRange.end,
        undefined,
        undefined,
        selectedRole === 'all' ? undefined : selectedRole
      );

      // Transform API data to our interface
      const transformedStaff: StaffMember[] = data.employees.map((emp: EmployeeSalesData) => ({
        id: emp.employee_id,
        name: emp.employee_name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        sales: emp.total_sales,
        orders: emp.total_orders,
        completedOrders: emp.completed_orders,
        avgOrderValue: emp.avg_order_value,
        completionRate: emp.completion_rate,
        ordersToday: emp.orders_today,
        ordersThisWeek: emp.orders_this_week,
        ordersThisMonth: emp.orders_this_month,
        topSellingItem: emp.top_selling_item
      }));

      setStaffPerformance(transformedStaff);
      setSummaryData({
        totalSales: data.total_sales,
        totalOrders: data.total_orders,
        totalEmployees: data.total_employees
      });

    } catch (error) {
      console.error('Error fetching staff performance:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to fetch staff performance data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    if (selectedRole === 'all') return staffPerformance;
    return staffPerformance.filter(staff => staff.role === selectedRole);
  }, [selectedRole, staffPerformance]);

  // Get unique roles from staff data
  const availableRoles = useMemo(() => {
    const roles = new Set(staffPerformance.map(s => s.role));
    return Array.from(roles);
  }, [staffPerformance]);

  const topPerformers = useMemo(() =>
    [...filteredStaff].sort((a, b) => b.sales - a.sales).slice(0, 5),
    [filteredStaff]
  );

  const avgTeamSales = useMemo(() =>
    filteredStaff.length > 0
      ? filteredStaff.reduce((sum, staff) => sum + staff.sales, 0) / filteredStaff.length
      : 0,
    [filteredStaff]
  );

  const avgCompletionRate = useMemo(() =>
    filteredStaff.length > 0
      ? filteredStaff.reduce((sum, staff) => sum + staff.completionRate, 0) / filteredStaff.length
      : 0,
    [filteredStaff]
  );

  const handleExport = (format: string) => {
    toast({
      title: "Export initiated",
      description: `Exporting staff performance report as ${format.toUpperCase()}...`
    });
  };

  const handleRefresh = () => {
    fetchStaffData();
    toast({
      title: "Refreshing data",
      description: "Loading latest staff performance data..."
    });
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'waiter': return 'secondary';
      case 'chef': return 'outline';
      case 'cleaner': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading staff performance data...</span>
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
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {summaryData.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {period === 'today' ? 'Today' :
               period === 'week' ? 'Last 7 days' :
               period === 'month' ? 'Last 30 days' : 'This year'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgCompletionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Order completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Filter staff performance data (real-time from database)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">
            <TrendingUp className="h-4 w-4 mr-2" />
            Sales Performance
          </TabsTrigger>
          <TabsTrigger value="top">
            <Award className="h-4 w-4 mr-2" />
            Top Performers
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="h-4 w-4 mr-2" />
            Activity Summary
          </TabsTrigger>
        </TabsList>

        {/* Sales Performance Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Sales Performance</CardTitle>
              <CardDescription>Individual sales metrics from the database</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No staff data available for this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Avg Order</TableHead>
                      <TableHead>Completion %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(staff.role)} className="capitalize">
                            {staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{staff.department}</TableCell>
                        <TableCell>KES {staff.sales.toLocaleString()}</TableCell>
                        <TableCell>{staff.orders}</TableCell>
                        <TableCell>{staff.completedOrders}</TableCell>
                        <TableCell>KES {staff.avgOrderValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={staff.completionRate >= 80 ? 'text-green-600' : staff.completionRate >= 50 ? 'text-orange-600' : 'text-red-600'}>
                            {staff.completionRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Team Average Sales</span>
                  <span className="text-2xl font-bold">
                    KES {Math.round(avgTeamSales).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Highest performing staff members by sales</CardDescription>
            </CardHeader>
            <CardContent>
              {topPerformers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No performance data available
                </div>
              ) : (
                <div className="space-y-4">
                  {topPerformers.map((staff, index) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant={getRoleBadgeVariant(staff.role)} className="capitalize text-xs">
                              {staff.role}
                            </Badge>
                            <span>•</span>
                            <span>{staff.orders} orders</span>
                            {staff.topSellingItem && staff.topSellingItem !== 'N/A' && (
                              <>
                                <span>•</span>
                                <span>Top: {staff.topSellingItem}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">KES {staff.sales.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {staff.completionRate.toFixed(0)}% completion rate
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <Award className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-sm text-muted-foreground">Top Performer</p>
                  <p className="font-bold">{topPerformers[0]?.name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-muted-foreground">Highest Sales</p>
                  <p className="font-bold">KES {(topPerformers[0]?.sales || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Most Orders</p>
                  <p className="font-bold">{Math.max(...filteredStaff.map(s => s.orders), 0)} orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Summary Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Activity Summary</CardTitle>
              <CardDescription>Order activity breakdown by time period</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Orders Today</TableHead>
                      <TableHead>Orders This Week</TableHead>
                      <TableHead>Orders This Month</TableHead>
                      <TableHead>Top Selling Item</TableHead>
                      <TableHead>Total Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(staff.role)} className="capitalize">
                            {staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={staff.ordersToday > 0 ? 'text-green-600 font-semibold' : ''}>
                            {staff.ordersToday}
                          </span>
                        </TableCell>
                        <TableCell>{staff.ordersThisWeek}</TableCell>
                        <TableCell>{staff.ordersThisMonth}</TableCell>
                        <TableCell>
                          {staff.topSellingItem !== 'N/A' ? (
                            <Badge variant="outline">{staff.topSellingItem}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          KES {staff.sales.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Active Today</p>
                  <p className="text-2xl font-bold">
                    {filteredStaff.filter(s => s.ordersToday > 0).length}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Orders Today</p>
                  <p className="text-2xl font-bold">
                    {filteredStaff.reduce((sum, s) => sum + s.ordersToday, 0)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Orders This Week</p>
                  <p className="text-2xl font-bold">
                    {filteredStaff.reduce((sum, s) => sum + s.ordersThisWeek, 0)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Orders This Month</p>
                  <p className="text-2xl font-bold">
                    {filteredStaff.reduce((sum, s) => sum + s.ordersThisMonth, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
