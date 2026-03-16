import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Printer, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';
import { exportDailySalesReportToPDF, exportEmployeeSalesReportToPDF } from '@/utils/pdfExport';
import { exportDailySalesReportToExcel, exportEmployeeSalesReportToExcel } from '@/utils/excelExport';
import { EmployeeDetailReport } from '@/components/Admin/Reports/EmployeeDetailReport';

interface EmployeeSales {
  employee_id: string;
  employee_name: string;
  role: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  completion_rate: number;
}


export const ComprehensiveSalesReports: React.FC = () => {
  const [reportType, setReportType] = useState<'summary' | 'employee' | 'daily'>('summary');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeData, setEmployeeData] = useState<EmployeeSales[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
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
      const params: any = {
        start_date: startDate + 'T00:00:00',
        end_date: endDate + 'T23:59:59',
      };
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      // Use the employee-sales report endpoint which queries the correct table
      const response = await api.get('/reports/employee-sales', { params });
      const data = (response.data as any)?.data ?? response.data;

      const employeeSales: EmployeeSales[] = (data.employees || []).map((emp: any) => ({
        employee_id: emp.employee_id,
        employee_name: emp.employee_name || 'Unknown',
        role: emp.role,
        total_sales: emp.total_sales || 0,
        total_orders: emp.total_orders || 0,
        avg_order_value: emp.avg_order_value || 0,
        completion_rate: emp.completion_rate || 0,
      }));

      setEmployeeData(employeeSales);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeDetail = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedEmployeeName(employeeName);
    setShowDetailDialog(true);
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

  // Only sum sales from non-chef roles to avoid double counting
  // (chef orders are the same orders waiters posted)
  const totalSales = filteredData.filter(e => e.role !== 'chef').reduce((sum, emp) => sum + emp.total_sales, 0);
  const totalOrders = filteredData.filter(e => e.role !== 'chef').reduce((sum, emp) => sum + emp.total_orders, 0);

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
                          onClick={() => openEmployeeDetail(emp.employee_id, emp.employee_name)}
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

      {selectedEmployeeId && (
        <EmployeeDetailReport
          employeeId={selectedEmployeeId}
          employeeName={selectedEmployeeName}
          open={showDetailDialog}
          onClose={() => { setShowDetailDialog(false); setSelectedEmployeeId(null); }}
        />
      )}
    </div>
  );
};
