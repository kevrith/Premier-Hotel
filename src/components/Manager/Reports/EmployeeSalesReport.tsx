import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  Users,
  BarChart3,
  TrendingDown,
  Award,
  Clock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import reportsService, { EmployeeSalesData, EmployeeSalesResponse } from '@/lib/api/reports';

export function EmployeeSalesReport() {
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [period, setPeriod] = useState('custom');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [staffPerformance, setStaffPerformance] = useState<EmployeeSalesData[]>([]);
  const [summaryData, setSummaryData] = useState<{ totalSales: number; totalOrders: number; totalEmployees: number }>({
    totalSales: 0,
    totalOrders: 0,
    totalEmployees: 0
  });

  useEffect(() => {
    loadReport();
  }, [period, selectedRole, startDate, endDate]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      let dateRange;
      
      if (period === 'custom') {
        // Use custom date range
        dateRange = {
          start: new Date(startDate).toISOString(),
          end: new Date(endDate).toISOString()
        };
      } else {
        // Use predefined periods
        dateRange = reportsService.getDateRange(period as 'today' | 'week' | 'month' | 'year');
      }

      const data = await reportsService.getEmployeeSales(
        dateRange.start,
        dateRange.end,
        undefined,
        undefined,
        selectedRole === 'all' ? undefined : selectedRole
      );

      setStaffPerformance(data.employees);
      setSummaryData({
        totalSales: data.total_sales,
        totalOrders: data.total_orders,
        totalEmployees: data.total_employees
      });

      toast.success('Employee sales report loaded successfully');
    } catch (error: any) {
      console.error('Failed to load employee sales report:', error);
      toast.error('Failed to load employee sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      // Create CSV content
      const headers = ['Employee Name', 'Role', 'Total Sales', 'Total Orders', 'Avg Order Value'];
      const csvContent = [
        headers.join(','),
        ...staffPerformanceArray.map(emp => [
          `"${emp.employee_name}"`,
          `"${emp.role}"`,
          emp.total_sales,
          emp.total_orders,
          emp.avg_order_value
        ].join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const periodText = period === 'custom' 
        ? `${startDate}_to_${endDate}` 
        : period;
      link.setAttribute('href', url);
      link.setAttribute('download', `employee_sales_report_${periodText}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const getTopPerformers = () => {
    if (!staffPerformance || !Array.isArray(staffPerformance)) {
      return [];
    }
    return staffPerformance
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 5);
  };

  const getDepartmentStats = () => {
    if (!staffPerformance || !Array.isArray(staffPerformance)) {
      return [];
    }
    const departments = Array.from(new Set(staffPerformance.map(r => r.role)));
    return departments.map(dept => {
      const deptReports = staffPerformance.filter(r => r.role === dept);
      const totalSales = deptReports.reduce((sum, r) => sum + r.total_sales, 0);
      const totalOrders = deptReports.reduce((sum, r) => sum + r.total_orders, 0);
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      return {
        department: dept,
        totalSales,
        totalOrders,
        avgOrderValue,
        employeeCount: deptReports.length
      };
    });
  };

  const getEmployeeDetails = () => {
    if (!staffPerformance || !Array.isArray(staffPerformance)) {
      return null;
    }
    return staffPerformance.find(emp => emp.employee_id === selectedEmployee);
  };

  const topPerformers = getTopPerformers();
  const departmentStats = getDepartmentStats();
  const selectedEmployeeDetails = getEmployeeDetails();

  // Handle case where staffPerformance is not an array
  const staffPerformanceArray = Array.isArray(staffPerformance) ? staffPerformance : [];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <CardTitle>Employee Sales Report</CardTitle>
            <CardDescription>
              Sales performance by employee from {period === 'today' ? 'Today' : 
                period === 'week' ? 'Last 7 Days' : 
                period === 'month' ? 'Last 30 Days' : 
                period === 'year' ? 'This Year' :
                `${format(new Date(startDate), 'MMM d, yyyy')} to ${format(new Date(endDate), 'MMM d, yyyy')}`}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="waiter">Waiters</SelectItem>
                  <SelectItem value="chef">Chefs</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {period === 'custom' && (
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[140px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[140px]"
                    />
                  </div>
                </div>
              )}
              <Button onClick={exportReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => window.print()} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{summaryData.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryData.totalSales)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{summaryData.totalOrders}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    summaryData.totalOrders > 0 ? summaryData.totalSales / summaryData.totalOrders : 0
                  )}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Performers</CardTitle>
            <CardDescription>Employees with highest sales performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((employee, index) => (
                <div key={employee.employee_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{employee.employee_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(employee.total_sales)}</p>
                    <p className="text-sm text-muted-foreground">{employee.total_orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="employee-details">Employee Details</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffPerformanceArray.map((employee) => (
                  <div key={employee.employee_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{employee.employee_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                      </div>
                      <Badge variant="outline">{employee.total_orders} orders</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Sales</span>
                        <span className="font-bold">{formatCurrency(employee.total_sales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Order Value</span>
                        <span className="font-bold">{formatCurrency(employee.avg_order_value)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Sales breakdown by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentStats.map((dept) => (
                  <div key={dept.department} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{dept.department}</p>
                      <p className="text-sm text-muted-foreground">{dept.employeeCount} employees</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(dept.totalSales)}</p>
                      <p className="text-sm text-muted-foreground">{dept.totalOrders} orders • {formatCurrency(dept.avgOrderValue)} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Details Tab */}
        <TabsContent value="employee-details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee-Specific Report</CardTitle>
              <CardDescription>View detailed report for a specific employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {staffPerformanceArray.map((employee) => (
                        <SelectItem key={employee.employee_id} value={employee.employee_id}>
                          {employee.employee_name} ({employee.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => window.print()} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Employee Report
                  </Button>
                </div>

                {selectedEmployee !== 'all' && selectedEmployeeDetails ? (
                  <div className="space-y-4">
                    {/* Employee Header */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold">
                              {selectedEmployeeDetails.employee_name.charAt(0)}
                            </div>
                            <h3 className="font-semibold">{selectedEmployeeDetails.employee_name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{selectedEmployeeDetails.role}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Sales</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedEmployeeDetails.total_sales)}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total Orders</p>
                            <p className="text-2xl font-bold">{selectedEmployeeDetails.total_orders}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Avg Order Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(selectedEmployeeDetails.avg_order_value)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Employee Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Employee Performance Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Employee ID</span>
                              <span className="font-medium">{selectedEmployeeDetails.employee_id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Role</span>
                              <span className="font-medium capitalize">{selectedEmployeeDetails.role}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Department</span>
                              <span className="font-medium capitalize">{selectedEmployeeDetails.department}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Total Items Sold</span>
                              <span className="font-medium">{selectedEmployeeDetails.total_items_sold || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Orders Today</span>
                              <span className="font-medium">{selectedEmployeeDetails.orders_today || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Orders This Week</span>
                              <span className="font-medium">{selectedEmployeeDetails.orders_this_week || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Orders This Month</span>
                              <span className="font-medium">{selectedEmployeeDetails.orders_this_month || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-800">Sales Performance</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(selectedEmployeeDetails.total_sales)}</p>
                            <p className="text-xs text-green-600">Total sales for selected period</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">Order Volume</p>
                            <p className="text-lg font-bold text-blue-600">{selectedEmployeeDetails.total_orders}</p>
                            <p className="text-xs text-blue-600">Total orders completed</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm font-medium text-purple-800">Average Value</p>
                            <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedEmployeeDetails.avg_order_value)}</p>
                            <p className="text-xs text-purple-600">Per order average</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : selectedEmployee !== 'all' ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for the selected employee
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select an employee to view their detailed report
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed View Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Employee Analysis</CardTitle>
              <CardDescription>Comprehensive performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffPerformanceArray.map((employee) => (
                  <div key={employee.employee_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{employee.employee_name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(employee.total_sales)}</p>
                        <p className="text-sm text-muted-foreground">{employee.total_orders} orders</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground">Avg Order Value</p>
                        <p className="font-bold">{formatCurrency(employee.avg_order_value)}</p>
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