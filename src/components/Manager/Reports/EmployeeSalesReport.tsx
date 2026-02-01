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
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { financialReportsService, type EmployeeSalesReport, type ReportFilters } from '@/lib/api/financial-reports';

export function EmployeeSalesReport() {
  const [reports, setReports] = useState<EmployeeSalesReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    department: 'all',
    employee_id: 'all'
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

  useEffect(() => {
    loadReport();
  }, [filters]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const reportFilters: ReportFilters = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        department: filters.department === 'all' ? undefined : filters.department,
        employee_id: filters.employee_id === 'all' ? undefined : filters.employee_id
      };
      
      const data = await financialReportsService.getEmployeeSalesReport(reportFilters);
      setReports(data);
      toast.success('Employee sales report loaded successfully');
    } catch (error: any) {
      console.error('Failed to load employee sales report:', error);
      // Check for cached data
      const cacheKey = `employee_sales_${filters.start_date}_${filters.end_date}_${filters.department === 'all' ? 'all' : filters.department}_${filters.employee_id === 'all' ? 'all' : filters.employee_id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setReports(JSON.parse(cachedData));
        toast.success('Using cached employee sales data');
      } else {
        toast.error('No cached data available');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const reportFilters: ReportFilters = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        department: filters.department === 'all' ? undefined : filters.department,
        employee_id: filters.employee_id === 'all' ? undefined : filters.employee_id
      };
      
      const blob = await financialReportsService.exportReport('employee-sales', reportFilters, exportFormat);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employee-sales-report-${filters.start_date}-to-${filters.end_date}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error: any) {
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
    if (!reports || !Array.isArray(reports)) {
      return [];
    }
    return reports
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 5);
  };

  const getDepartmentStats = () => {
    if (!reports || !Array.isArray(reports)) {
      return [];
    }
    const departments = Array.from(new Set(reports.map(r => r.role)));
    return departments.map(dept => {
      const deptReports = reports.filter(r => r.role === dept);
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

  const topPerformers = getTopPerformers();
  const departmentStats = getDepartmentStats();

  // Handle case where reports is not an array
  const reportsArray = Array.isArray(reports) ? reports : [];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <CardTitle>Employee Sales Report</CardTitle>
            <CardDescription>
              Sales performance by employee from {format(new Date(filters.start_date), 'MMM d, yyyy')} to {format(new Date(filters.end_date), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex gap-2">
              <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="waiter">Waiters</SelectItem>
                  <SelectItem value="chef">Chefs</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel') => setExportFormat(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
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
                <p className="text-2xl font-bold">{reports.length}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(Array.isArray(reports) ? reports.reduce((sum, r) => sum + r.total_sales, 0) : 0)}</p>
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
                <p className="text-2xl font-bold">{Array.isArray(reports) ? reports.reduce((sum, r) => sum + r.total_orders, 0) : 0}</p>
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
                    Array.isArray(reports) ? 
                      reports.reduce((sum, r) => sum + r.total_sales, 0) / 
                      Math.max(1, reports.reduce((sum, r) => sum + r.total_orders, 0))
                    : 0
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
                {reportsArray.map((employee) => (
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
                      {employee.commission_earned && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Commission</span>
                          <span className="font-bold text-green-600">{formatCurrency(employee.commission_earned)}</span>
                        </div>
                      )}
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

        {/* Detailed View Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Employee Analysis</CardTitle>
              <CardDescription>Comprehensive performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportsArray.map((employee) => (
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground">Avg Order Value</p>
                        <p className="font-bold">{formatCurrency(employee.avg_order_value)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground">Commission Earned</p>
                        <p className="font-bold text-green-600">
                          {employee.commission_earned ? formatCurrency(employee.commission_earned) : 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-muted-foreground">Top Items</p>
                        <div className="mt-1 space-y-1">
                          {employee.top_items.slice(0, 3).map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{item.item_name}</span>
                              <span className="text-muted-foreground ml-2">x{item.quantity_sold}</span>
                            </div>
                          ))}
                        </div>
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