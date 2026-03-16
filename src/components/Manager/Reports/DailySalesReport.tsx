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
  ShoppingCart,
  Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { financialReportsService, type DailySalesReport, type ReportFilters } from '@/lib/api/financial-reports';

export function DailySalesReport() {
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async (sd?: string, _ed?: string) => {
    const start = sd ?? startDate;
    setIsLoading(true);
    try {
      const data = await financialReportsService.getDailySalesReport(start);
      setReport(data);
      toast.success('Daily sales report loaded successfully');
    } catch (error: any) {
      console.error('Failed to load daily sales report:', error);
      // Check for cached data
      const cachedData = localStorage.getItem('financial_reports_daily');
      if (cachedData) {
        const cache = JSON.parse(cachedData);
        if (cache[start]) {
          setReport(cache[start]);
          toast.success('Using cached daily sales data');
        } else {
          toast.error('No cached data available for this date');
        }
      } else {
        toast.error('No cached data available');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const filters: ReportFilters = {
        start_date: startDate,
        end_date: endDate
      };

      const blob = await financialReportsService.exportReport('daily-sales', filters, exportFormat);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-sales-report-${startDate}-to-${endDate}.${exportFormat}`;
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

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Daily Sales Report</CardTitle>
              <CardDescription>
                Sales performance for {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
          {/* Date Range Picker */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>
            {/* Quick presets */}
            <div className="flex gap-1">
              {[
                { label: 'Today', days: 0 },
                { label: 'Yesterday', days: 1 },
                { label: '7 days', days: 7 },
                { label: '30 days', days: 30 },
                { label: 'This month', days: -1 },
              ].map(({ label, days }) => (
                <Button
                  key={label}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => {
                    const end = new Date();
                    let start: Date;
                    if (days === -1) {
                      start = new Date(end.getFullYear(), end.getMonth(), 1);
                    } else if (days === 1) {
                      const yesterday = new Date(end);
                      yesterday.setDate(yesterday.getDate() - 1);
                      start = yesterday;
                      end.setDate(end.getDate() - 1);
                    } else {
                      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
                    }
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button size="sm" onClick={() => loadReport(startDate, endDate)}>
              Apply
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      )}

      {!isLoading && !report && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Select a date range and click Apply to view the daily sales report</p>
        </div>
      )}

      {/* Summary Cards */}
      {report && <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(report.total_revenue)}</p>
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
                <p className="text-2xl font-bold">{report.total_orders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(report.avg_order_value)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peak Hour</p>
                <p className="text-2xl font-bold">
                  {report.time_breakdown.reduce((prev, current) => 
                    prev.revenue > current.revenue ? prev : current, report.time_breakdown[0]
                  )?.hour || 'N/A'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>}

      {/* Detailed Tabs */}
      {report && <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="categories">Menu Categories</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(report.payment_methods).map(([method, amount]) => (
                  <div key={method} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm capitalize">{method}</p>
                        <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
                      </div>
                      <Badge variant="outline">
                        {((amount / report.total_revenue) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Analysis</CardTitle>
              <CardDescription>Detailed breakdown by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(report.payment_methods).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <p className="font-medium capitalize">{method}</p>
                        <p className="text-sm text-muted-foreground">
                          {((amount / report.total_revenue) * 100).toFixed(1)} of total revenue
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {Object.keys(report.payment_methods).length} methods
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Analysis Tab */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Performance</CardTitle>
              <CardDescription>Sales and order volume by hour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.time_breakdown.map((hourData) => (
                  <div key={hourData.hour} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{hourData.hour}</p>
                      <p className="text-sm text-muted-foreground">{hourData.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(hourData.revenue)}</p>
                      <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(hourData.revenue / Math.max(...report.time_breakdown.map(h => h.revenue))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Category Performance</CardTitle>
              <CardDescription>Revenue and item sales by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.menu_categories.map((category) => (
                  <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{category.category}</p>
                      <p className="text-sm text-muted-foreground">{category.items_sold} items sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(category.revenue)}</p>
                      <Badge variant="outline">
                        {((category.revenue / report.total_revenue) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>}
    </div>
  );
}