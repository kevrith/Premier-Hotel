import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, Printer, FileText, Calendar, DollarSign, TrendingUp,
  Users, ShoppingCart, Clock, Filter, Settings, Mail, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { reportsService, EmployeeSalesData as APIEmployeeSalesData } from '@/lib/api/reports';
import { EmployeeDetailReport } from './Reports/EmployeeDetailReport';

// Define available report columns with their properties
interface ReportColumn {
  id: string;
  label: string;
  category: 'basic' | 'sales' | 'performance' | 'time' | 'financial';
  enabled: boolean;
  format?: 'currency' | 'number' | 'percentage' | 'date' | 'time' | 'text';
  description: string;
}

// Extended interface with additional fields for display purposes
interface EmployeeSalesData extends APIEmployeeSalesData {
  commission_earned?: number;
  tips_received?: number;
  refunds_processed?: number;
  hours_worked?: number;
  sales_per_hour?: number;
  customer_satisfaction?: number;
  peak_hour?: string;
  payment_methods_used?: string[];
  avg_service_time?: number;
  upsell_rate?: number;
  return_customer_rate?: number;
}

interface ReportFilters {
  dateRange: string;
  startDate: string;
  endDate: string;
  department?: string;
  role?: string;
  minSales?: number;
}

export function EmployeeSalesReport() {
  // Available columns that can be toggled
  const [availableColumns, setAvailableColumns] = useState<ReportColumn[]>([
    // Basic Information
    { id: 'employee_name', label: 'Employee Name', category: 'basic', enabled: true, format: 'text', description: 'Full name of the employee' },
    { id: 'employee_id', label: 'Employee ID', category: 'basic', enabled: true, format: 'text', description: 'Unique employee identifier' },
    { id: 'role', label: 'Role/Position', category: 'basic', enabled: true, format: 'text', description: 'Job title or role' },
    { id: 'department', label: 'Department', category: 'basic', enabled: false, format: 'text', description: 'Work department' },

    // Sales Metrics
    { id: 'total_sales', label: 'Total Sales', category: 'sales', enabled: true, format: 'currency', description: 'Total revenue generated' },
    { id: 'total_orders', label: 'Total Orders', category: 'sales', enabled: true, format: 'number', description: 'Number of orders processed' },
    { id: 'avg_order_value', label: 'Avg Order Value', category: 'sales', enabled: true, format: 'currency', description: 'Average value per order' },
    { id: 'total_items_sold', label: 'Items Sold', category: 'sales', enabled: false, format: 'number', description: 'Total number of items sold' },
    { id: 'orders_today', label: 'Orders Today', category: 'sales', enabled: false, format: 'number', description: 'Orders processed today' },
    { id: 'orders_this_week', label: 'Orders This Week', category: 'sales', enabled: false, format: 'number', description: 'Orders this week' },
    { id: 'orders_this_month', label: 'Orders This Month', category: 'sales', enabled: false, format: 'number', description: 'Orders this month' },

    // Financial Metrics
    { id: 'commission_earned', label: 'Commission', category: 'financial', enabled: false, format: 'currency', description: 'Commission earned' },
    { id: 'tips_received', label: 'Tips Received', category: 'financial', enabled: false, format: 'currency', description: 'Total tips received' },
    { id: 'refunds_processed', label: 'Refunds', category: 'financial', enabled: false, format: 'currency', description: 'Value of refunds processed' },

    // Performance Metrics
    { id: 'customer_satisfaction', label: 'Satisfaction Score', category: 'performance', enabled: false, format: 'percentage', description: 'Customer satisfaction rating' },
    { id: 'top_selling_item', label: 'Top Item', category: 'performance', enabled: false, format: 'text', description: 'Best selling item' },
    { id: 'upsell_rate', label: 'Upsell Rate', category: 'performance', enabled: false, format: 'percentage', description: 'Successful upsells percentage' },
    { id: 'return_customer_rate', label: 'Return Customer %', category: 'performance', enabled: false, format: 'percentage', description: 'Percentage of return customers' },
    { id: 'avg_service_time', label: 'Avg Service Time', category: 'performance', enabled: false, format: 'number', description: 'Average time to serve (minutes)' },

    // Time-based Metrics
    { id: 'hours_worked', label: 'Hours Worked', category: 'time', enabled: false, format: 'number', description: 'Total hours worked' },
    { id: 'sales_per_hour', label: 'Sales/Hour', category: 'time', enabled: false, format: 'currency', description: 'Revenue per hour worked' },
    { id: 'first_sale_time', label: 'First Sale Time', category: 'time', enabled: false, format: 'time', description: 'Time of first sale' },
    { id: 'last_sale_time', label: 'Last Sale Time', category: 'time', enabled: false, format: 'time', description: 'Time of last sale' },
    { id: 'peak_hour', label: 'Peak Hour', category: 'time', enabled: false, format: 'text', description: 'Busiest hour of the day' },
  ]);

  const [employeeSalesData, setEmployeeSalesData] = useState<EmployeeSalesData[]>([]);
  const [filteredData, setFilteredData] = useState<EmployeeSalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'this-month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('total_sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Employee detail dialog state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);

  // Handle employee name click to show detail view
  const handleEmployeeClick = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedEmployeeName(employeeName);
    setShowEmployeeDetail(true);
  };

  // Fetch employee sales data
  const fetchEmployeeSalesData = async () => {
    setIsLoading(true);
    try {
      const response = await reportsService.getEmployeeSales(
        filters.startDate,
        filters.endDate,
        undefined,  // employeeId
        filters.department,
        filters.role
      );

      setEmployeeSalesData(response.employees as EmployeeSalesData[]);
      setFilteredData(response.employees as EmployeeSalesData[]);
      toast.success('Employee sales data loaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load employee sales data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate sample data (replace with actual API call)
  const generateSampleEmployeeSalesData = async (): Promise<EmployeeSalesData[]> => {
    const employees = [
      { name: 'John Mwangi', role: 'Senior Waiter', dept: 'Restaurant' },
      { name: 'Jane Akinyi', role: 'Waiter', dept: 'Restaurant' },
      { name: 'Peter Kamau', role: 'Bartender', dept: 'Bar' },
      { name: 'Mary Wanjiru', role: 'Room Service', dept: 'Room Service' },
      { name: 'David Omondi', role: 'Waiter', dept: 'Restaurant' },
      { name: 'Sarah Njeri', role: 'Senior Waiter', dept: 'Restaurant' },
      { name: 'James Kipchoge', role: 'Bartender', dept: 'Bar' },
      { name: 'Grace Auma', role: 'Room Service', dept: 'Room Service' },
    ];

    return employees.map((emp, idx) => ({
      employee_id: `EMP${(idx + 1).toString().padStart(4, '0')}`,
      employee_name: emp.name,
      role: emp.role,
      department: emp.dept,
      total_sales: Math.floor(Math.random() * 500000) + 100000,
      total_orders: Math.floor(Math.random() * 200) + 50,
      avg_order_value: Math.floor(Math.random() * 3000) + 500,
      total_items_sold: Math.floor(Math.random() * 500) + 100,
      commission_earned: Math.floor(Math.random() * 25000) + 5000,
      tips_received: Math.floor(Math.random() * 15000) + 2000,
      refunds_processed: Math.floor(Math.random() * 5000),
      hours_worked: Math.floor(Math.random() * 160) + 140,
      sales_per_hour: Math.floor(Math.random() * 2000) + 500,
      top_selling_item: ['Grilled Chicken', 'Beef Stew', 'Fish Fillet', 'Pasta Carbonara'][Math.floor(Math.random() * 4)],
      customer_satisfaction: Math.floor(Math.random() * 20) + 80,
      orders_today: Math.floor(Math.random() * 15) + 5,
      orders_this_week: Math.floor(Math.random() * 50) + 20,
      orders_this_month: Math.floor(Math.random() * 150) + 50,
      first_sale_time: '08:30 AM',
      last_sale_time: '10:45 PM',
      peak_hour: ['12:00 PM', '1:00 PM', '7:00 PM', '8:00 PM'][Math.floor(Math.random() * 4)],
      payment_methods_used: ['M-Pesa', 'Cash', 'Card'],
      avg_service_time: Math.floor(Math.random() * 10) + 5,
      upsell_rate: Math.floor(Math.random() * 30) + 10,
      return_customer_rate: Math.floor(Math.random() * 40) + 30,
    }));
  };

  useEffect(() => {
    fetchEmployeeSalesData();
  }, [filters.startDate, filters.endDate]);

  // Filter and sort data
  useEffect(() => {
    let filtered = [...employeeSalesData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply department filter
    if (filters.department && filters.department !== 'all') {
      filtered = filtered.filter(emp => emp.department === filters.department);
    }

    // Apply role filter
    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter(emp => emp.role === filters.role);
    }

    // Apply minimum sales filter
    if (filters.minSales) {
      filtered = filtered.filter(emp => emp.total_sales >= filters.minSales);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof EmployeeSalesData];
      const bVal = b[sortBy as keyof EmployeeSalesData];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    setFilteredData(filtered);
  }, [employeeSalesData, searchTerm, filters, sortBy, sortOrder]);

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setAvailableColumns(cols =>
      cols.map(col =>
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  // Toggle all columns in a category
  const toggleCategory = (category: string, enabled: boolean) => {
    setAvailableColumns(cols =>
      cols.map(col =>
        col.category === category ? { ...col, enabled } : col
      )
    );
  };

  // Get enabled columns
  const enabledColumns = availableColumns.filter(col => col.enabled);

  // Format cell value based on format type
  const formatValue = (value: any, format?: string) => {
    if (value === null || value === undefined) return 'N/A';

    switch (format) {
      case 'currency':
        return `KES ${Number(value).toLocaleString()}`;
      case 'number':
        return Number(value).toLocaleString();
      case 'percentage':
        return `${value}%`;
      case 'time':
      case 'date':
      case 'text':
      default:
        return String(value);
    }
  };

  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the report');
      return;
    }

    const reportHtml = generatePrintableReport();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      toast.success('Opening print dialog...');
    }, 250);
  };

  // Generate printable HTML report
  const generatePrintableReport = () => {
    const companyName = 'Premier Hotel';
    const reportTitle = 'Employee Sales Performance Report';
    const reportDate = new Date().toLocaleDateString();
    const reportPeriod = `${filters.startDate} to ${filters.endDate}`;

    const tableRows = filteredData.map(emp => {
      const cells = enabledColumns.map(col => {
        const value = emp[col.id as keyof EmployeeSalesData];
        return `<td style="padding: 8px; border: 1px solid #ddd;">${formatValue(value, col.format)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const tableHeaders = enabledColumns.map(col =>
      `<th style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold; text-align: left;">${col.label}</th>`
    ).join('');

    // Calculate totals
    const totalSales = filteredData.reduce((sum, emp) => sum + emp.total_sales, 0);
    const totalOrders = filteredData.reduce((sum, emp) => sum + emp.total_orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 20mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          .report-title {
            font-size: 18px;
            color: #666;
            margin: 10px 0;
          }
          .report-info {
            font-size: 12px;
            color: #888;
            margin: 5px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11px;
          }
          .summary {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
          }
          .summary-item {
            display: inline-block;
            margin-right: 30px;
            font-size: 12px;
          }
          .summary-label {
            font-weight: bold;
            color: #333;
          }
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #888;
            text-align: center;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="report-title">${reportTitle}</div>
          <div class="report-info">Period: ${reportPeriod}</div>
          <div class="report-info">Generated: ${reportDate}</div>
          <div class="report-info">Total Employees: ${filteredData.length}</div>
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Total Sales:</span> KES ${totalSales.toLocaleString()}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Orders:</span> ${totalOrders.toLocaleString()}
          </div>
          <div class="summary-item">
            <span class="summary-label">Average Order Value:</span> KES ${avgOrderValue.toFixed(0).toLocaleString()}
          </div>
          <div class="summary-item">
            <span class="summary-label">Top Performer:</span> ${filteredData[0]?.employee_name || 'N/A'}
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated report from Premier Hotel Management System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = enabledColumns.map(col => col.label).join(',');
    const rows = filteredData.map(emp => {
      return enabledColumns.map(col => {
        const value = emp[col.id as keyof EmployeeSalesData];
        const formatted = formatValue(value, col.format);
        // Escape commas and quotes for CSV
        return `"${String(formatted).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported to CSV');
  };

  // Export to Excel (HTML table format)
  const exportToExcel = () => {
    const tableHeaders = enabledColumns.map(col => `<th>${col.label}</th>`).join('');
    const tableRows = filteredData.map(emp => {
      const cells = enabledColumns.map(col => {
        const value = emp[col.id as keyof EmployeeSalesData];
        return `<td>${formatValue(value, col.format)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="utf-8"/></head>
      <body>
        <table border="1">
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-sales-report-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported to Excel');
  };

  const categoryColors: Record<string, string> = {
    basic: 'bg-blue-100 text-blue-800',
    sales: 'bg-green-100 text-green-800',
    performance: 'bg-purple-100 text-purple-800',
    time: 'bg-orange-100 text-orange-800',
    financial: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Sales Performance Report
              </CardTitle>
              <CardDescription>
                Comprehensive sales report with employee names and customizable details
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredData.length} Employees
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Section */}
          <Card className="border-2">
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value) => {
                      const today = new Date();
                      let start = new Date();

                      switch (value) {
                        case 'today':
                          start = today;
                          break;
                        case 'this-week':
                          start = new Date(today.setDate(today.getDate() - today.getDay()));
                          break;
                        case 'this-month':
                          start = new Date(today.getFullYear(), today.getMonth(), 1);
                          break;
                        case 'this-quarter':
                          const quarter = Math.floor(today.getMonth() / 3);
                          start = new Date(today.getFullYear(), quarter * 3, 1);
                          break;
                        case 'this-year':
                          start = new Date(today.getFullYear(), 0, 1);
                          break;
                      }

                      setFilters({
                        ...filters,
                        dateRange: value,
                        startDate: start.toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="this-quarter">This Quarter</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={filters.department || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Restaurant">Restaurant</SelectItem>
                      <SelectItem value="Bar">Bar</SelectItem>
                      <SelectItem value="Room Service">Room Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total_sales">Total Sales</SelectItem>
                      <SelectItem value="total_orders">Total Orders</SelectItem>
                      <SelectItem value="avg_order_value">Avg Order Value</SelectItem>
                      <SelectItem value="employee_name">Employee Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Highest First</SelectItem>
                      <SelectItem value="asc">Lowest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search and Custom Dates */}
              {filters.dateRange === 'custom' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Search Employees</Label>
                <Input
                  placeholder="Search by name, ID, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={printReport} variant="default">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button onClick={exportToExcel} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
            <Button
              onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize Columns ({enabledColumns.length})
            </Button>
          </div>

          {/* Column Customizer */}
          {showColumnCustomizer && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Customize Report Columns</CardTitle>
                <CardDescription>
                  Select which columns to include in your report. Changes apply to both screen and print views.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {['basic', 'sales', 'financial', 'performance', 'time'].map(category => {
                  const categoryColumns = availableColumns.filter(col => col.category === category);
                  const enabledCount = categoryColumns.filter(col => col.enabled).length;

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold capitalize">{category} Information</h4>
                          <Badge className={categoryColors[category]}>
                            {enabledCount}/{categoryColumns.length} enabled
                          </Badge>
                        </div>
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategory(category, true)}
                          >
                            Enable All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategory(category, false)}
                          >
                            Disable All
                          </Button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categoryColumns.map(col => (
                          <div
                            key={col.id}
                            className="flex items-start space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                            onClick={() => toggleColumn(col.id)}
                          >
                            <Checkbox
                              checked={col.enabled}
                              onCheckedChange={() => toggleColumn(col.id)}
                            />
                            <div className="flex-1">
                              <label className="text-sm font-medium cursor-pointer">
                                {col.label}
                              </label>
                              <p className="text-xs text-muted-foreground">{col.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Report Table */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading employee sales data...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No employee sales data found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {enabledColumns.map(col => (
                          <TableHead key={col.id}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((emp, idx) => (
                        <TableRow key={idx}>
                          {enabledColumns.map(col => (
                            <TableCell
                              key={col.id}
                              className={col.id === 'employee_name' ? 'font-medium cursor-pointer hover:text-primary hover:underline' : ''}
                              onClick={col.id === 'employee_name' ? () => handleEmployeeClick(emp.employee_id, emp.employee_name) : undefined}
                            >
                              {formatValue(emp[col.id as keyof EmployeeSalesData], col.format)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {filteredData.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">
                        KES {filteredData.reduce((sum, emp) => sum + emp.total_sales, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <ShoppingCart className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">
                        {filteredData.reduce((sum, emp) => sum + emp.total_orders, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">
                        KES {Math.floor(
                          filteredData.reduce((sum, emp) => sum + emp.avg_order_value, 0) / filteredData.length
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Users className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Top Performer</p>
                      <p className="text-lg font-bold truncate">
                        {filteredData[0]?.employee_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Dialog */}
      {selectedEmployeeId && (
        <EmployeeDetailReport
          employeeId={selectedEmployeeId}
          employeeName={selectedEmployeeName}
          open={showEmployeeDetail}
          onClose={() => setShowEmployeeDetail(false)}
        />
      )}
    </div>
  );
}
