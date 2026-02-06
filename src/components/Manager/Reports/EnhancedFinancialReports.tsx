import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { exportDailySalesReportToPDF, exportEmployeeSalesReportToPDF } from '@/utils/pdfExport';
import { exportDailySalesReportToExcel, exportEmployeeSalesReportToExcel } from '@/utils/excelExport';
import api from '@/lib/api/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const EnhancedFinancialReports: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [employeeData, setEmployeeData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [dateRange, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = getDateParams();
      const [revenue, employees, categories] = await Promise.all([
        api.get('/reports/revenue', { params }).then(res => res.data?.data || []),
        api.get('/reports/employee-sales', { params }).then(res => res.data?.employees || []),
        api.get('/reports/category-breakdown', { params }).then(res => res.data || []),
      ]);
      
      setRevenueData(revenue);
      setEmployeeData(employees);
      setCategoryData(categories);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateParams = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start_date: format(now, 'yyyy-MM-dd'), end_date: format(now, 'yyyy-MM-dd') };
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start_date: format(weekAgo, 'yyyy-MM-dd'), end_date: format(now, 'yyyy-MM-dd') };
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start_date: format(monthAgo, 'yyyy-MM-dd'), end_date: format(now, 'yyyy-MM-dd') };
      case 'custom':
        return { start_date: format(startDate, 'yyyy-MM-dd'), end_date: format(endDate, 'yyyy-MM-dd') };
    }
  };

  const handleExportPDF = (type: 'daily' | 'employee') => {
    if (type === 'daily') {
      exportDailySalesReportToPDF(revenueData, format(startDate, 'yyyy-MM-dd'));
    } else {
      exportEmployeeSalesReportToPDF(employeeData, `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    }
  };

  const handleExportExcel = (type: 'daily' | 'employee') => {
    if (type === 'daily') {
      exportDailySalesReportToExcel(revenueData, format(startDate, 'yyyy-MM-dd'));
    } else {
      exportEmployeeSalesReportToExcel(employeeData, `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`);
    }
  };

  const totalRevenue = Array.isArray(revenueData) ? revenueData.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
  const totalOrders = Array.isArray(revenueData) ? revenueData.length : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>Generate and export comprehensive financial reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={format(startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <input
                    type="date"
                    value={format(endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  />
                </div>
              </>
            )}

            <Button onClick={loadReportData} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {totalOrders} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {(totalRevenue / totalOrders || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeData[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              KES {employeeData[0]?.total_sales?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExportPDF('daily')}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportExcel('daily')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExportPDF('employee')}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportExcel('employee')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_sales" fill="#8884d8" name="Total Sales" />
                <Bar dataKey="order_count" fill="#82ca9d" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
