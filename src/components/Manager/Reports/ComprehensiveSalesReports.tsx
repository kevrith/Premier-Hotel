import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Printer, Search, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';
import { exportDailySalesReportToPDF, exportEmployeeSalesReportToPDF } from '@/utils/pdfExport';
import { exportDailySalesReportToExcel, exportEmployeeSalesReportToExcel } from '@/utils/excelExport';

interface EmployeeSales {
  employee_id: string;
  employee_name: string;
  role: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  completion_rate: number;
}

interface EmployeeDetail {
  employee: any;
  summary: any;
  transactions: any[];
  top_items: any[];
  trends: any;
}

export const ComprehensiveSalesReports: React.FC = () => {
  const [reportType, setReportType] = useState<'summary' | 'employee' | 'daily'>('summary');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeData, setEmployeeData] = useState<EmployeeSales[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, roleFilter]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params: any = { start_date: startDate, end_date: endDate };

      // Get overall stats
      const statsResponse = await api.get('/orders/manager/stats', { params });
      
      // Get all staff
      const staffResponse = await api.get('/staff');
      const staff = staffResponse.data || [];
      
      // Filter by role if needed
      const filteredStaff = roleFilter !== 'all' 
        ? staff.filter((s: any) => s.role === roleFilter)
        : staff.filter((s: any) => ['waiter', 'chef'].includes(s.role));
      
      // Get sales for each employee using daily-sales endpoint
      const employeeSalesPromises = filteredStaff.map(async (employee: any) => {
        try {
          const empParams = { ...params, employee_id: employee.id };
          const empSales = await api.get('/orders/manager/daily-sales', { params: empParams });
          
          return {
            employee_id: employee.id,
            employee_name: employee.full_name || employee.name || 'Unknown',
            role: employee.role,
            total_sales: empSales.data?.total_revenue || 0,
            total_orders: empSales.data?.total_orders || 0,
            avg_order_value: empSales.data?.total_orders > 0 
              ? empSales.data.total_revenue / empSales.data.total_orders 
              : 0,
            completion_rate: 100
          };
        } catch (err) {
          console.error(`Error loading sales for ${employee.full_name}:`, err);
          return {
            employee_id: employee.id,
            employee_name: employee.full_name || employee.name || 'Unknown',
            role: employee.role,
            total_sales: 0,
            total_orders: 0,
            avg_order_value: 0,
            completion_rate: 0
          };
        }
      });
      
      const employeeSales = await Promise.all(employeeSalesPromises);
      
      // Filter by search term
      const filtered = employeeSales.filter(emp =>
        emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setEmployeeData(filtered);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeDetail = async (employeeId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/employee/${employeeId}/details`, {
        params: { start_date: startDate, end_date: endDate }
      });
      setSelectedEmployee(response.data);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('Failed to load employee details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportEmployeeSalesReportToPDF(employeeData, `${startDate} to ${endDate}`);
  };

  const handleExportExcel = () => {
    exportEmployeeSalesReportToExcel(employeeData, `${startDate}_to_${endDate}`);
  };

  const filteredData = employeeData.filter(emp =>
    emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSales = filteredData.reduce((sum, emp) => sum + emp.total_sales, 0);
  const totalOrders = filteredData.reduce((sum, emp) => sum + emp.total_orders, 0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Reports</CardTitle>
          <CardDescription>Comprehensive sales analysis with employee performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="employee">By Employee</SelectItem>
                  <SelectItem value="daily">Daily Breakdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Role Filter</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="waiter">Waiters</SelectItem>
                  <SelectItem value="chef">Chefs</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={loadReportData} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Period total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">With sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
          <CardDescription>
            Showing {filteredData.length} employees from {format(new Date(startDate), 'MMM dd, yyyy')} to {format(new Date(endDate), 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((emp) => (
                    <TableRow key={emp.employee_id}>
                      <TableCell className="font-medium">{emp.employee_name}</TableCell>
                      <TableCell className="capitalize">{emp.role}</TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {emp.total_sales.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{emp.total_orders}</TableCell>
                      <TableCell className="text-right">
                        KES {emp.avg_order_value.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={emp.completion_rate >= 90 ? 'text-green-600' : 'text-orange-600'}>
                          {emp.completion_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => loadEmployeeDetail(emp.employee_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.employee.name} - Detailed Report
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{selectedEmployee.employee.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedEmployee.employee.email}</p>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      KES {selectedEmployee.summary.total_sales.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{selectedEmployee.summary.total_orders}</div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      KES {selectedEmployee.summary.avg_order_value.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Order Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      #{selectedEmployee.summary.rank}
                      {selectedEmployee.summary.performance_vs_average > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Rank ({selectedEmployee.summary.performance_vs_average.toFixed(1)}% vs avg)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Items */}
              <div>
                <h3 className="font-semibold mb-3">Top Selling Items</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployee.top_items.slice(0, 5).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            KES {item.revenue.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="font-semibold mb-3">Recent Transactions</h3>
                <div className="rounded-md border max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployee.transactions.slice(0, 10).map((txn) => (
                        <TableRow key={txn.order_id}>
                          <TableCell>
                            {format(new Date(txn.date), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {txn.order_id.substring(0, 8)}
                          </TableCell>
                          <TableCell className="text-right">
                            KES {txn.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="capitalize">{txn.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
