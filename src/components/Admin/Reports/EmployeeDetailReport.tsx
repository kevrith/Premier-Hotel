/**
 * EmployeeDetailReport Component
 * Comprehensive individual employee performance report with drill-down analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Award,
  CreditCard,
  Download,
  Printer,
  ArrowLeft,
  Phone,
  Briefcase,
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Package,
  Ban,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import { reportsService, EmployeeDetailResponse } from '@/lib/api/reports';
import { format } from 'date-fns';
import { printItemSummary } from '@/lib/print';

interface EmployeeDetailReportProps {
  employeeId: string;
  employeeName?: string;
  open: boolean;
  onClose: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function EmployeeDetailReport({
  employeeId,
  employeeName,
  open,
  onClose,
  initialStartDate,
  initialEndDate,
}: EmployeeDetailReportProps) {
  const [data, setData] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(
    initialStartDate ?? new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(initialEndDate ?? new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState(initialStartDate ? 'custom' : 'today');

  // Void state
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidingOrderId, setVoidingOrderId] = useState<string>('');
  const [voidingOrderItems, setVoidingOrderItems] = useState<Array<{ name: string; quantity: number; price: number }>>([]);
  const [voidItemIndex, setVoidItemIndex] = useState<string>('0');
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // Single effect: when dialog opens, resolve the correct dates and fetch immediately.
  // Using initialStartDate/End directly avoids a React state race where setStartDate
  // and fetchEmployeeDetails run in the same render cycle with stale state.
  useEffect(() => {
    if (!open || !employeeId) return;
    const sd = initialStartDate ?? startDate;
    const ed = initialEndDate ?? endDate;
    if (initialStartDate) { setStartDate(initialStartDate); setDateRange('custom'); }
    if (initialEndDate) setEndDate(initialEndDate);
    fetchEmployeeDetailsWithDates(sd, ed);
  }, [open, employeeId, initialStartDate, initialEndDate]);

  // Re-fetch when user manually changes dates inside the dialog
  useEffect(() => {
    if (!open || !employeeId) return;
    fetchEmployeeDetailsWithDates(startDate, endDate);
  }, [startDate, endDate]);

  const fetchEmployeeDetailsWithDates = async (sd: string, ed: string) => {
    setLoading(true);
    try {
      const response = await reportsService.getEmployeeDetails(employeeId, sd, ed);
      setData(response);
      if (response.items_by_category) {
        setExpandedCategories(new Set(response.items_by_category.map((c) => c.category)));
      }
    } catch (error: any) {
      console.error('Error loading employee details:', error);
      toast.error(error.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = () => fetchEmployeeDetailsWithDates(startDate, endDate);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const end = new Date();
    let start = new Date();

    switch (range) {
      case 'today':
        // start and end are both today — no adjustment needed
        break;
      case 'yesterday': {
        const yesterday = new Date(end);
        yesterday.setDate(end.getDate() - 1);
        start = yesterday;
        end.setDate(end.getDate() - 1);
        break;
      }
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case '90days':
        start.setDate(end.getDate() - 90);
        break;
      case 'ytd':
        start = new Date(end.getFullYear(), 0, 1);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!data) return;

    const rows: string[] = [
      'Employee Performance Report',
      '',
      `Employee,${data.employee.name}`,
      `Email,${data.employee.email}`,
      `Role,${data.employee.role}`,
      `Department,${data.employee.department}`,
      `Period,${startDate} to ${endDate}`,
      '',
      'Performance Summary',
      `Total Sales,KES ${data.summary.total_sales.toLocaleString()}`,
      `Total Orders,${data.summary.total_orders}`,
      `Completed Orders,${data.summary.completed_orders}`,
      `Avg Order Value,KES ${data.summary.avg_order_value.toLocaleString()}`,
      `Completion Rate,${data.summary.completion_rate}%`,
      `Rank,${data.summary.rank} of ${data.summary.total_peers}`,
      `Team Average,KES ${data.summary.team_average.toLocaleString()}`,
      `Performance vs Average,${data.summary.performance_vs_average}%`,
      '',
      'Top Items Sold',
      'Item,Quantity,Revenue',
      ...data.top_items.map((item) => `${item.name},${item.quantity},${item.revenue}`),
    ];

    if (data.items_by_category?.length) {
      rows.push('', 'Items Sold by Department', 'Department,Item,Qty,Revenue (KES)');
      data.items_by_category.forEach((cat) => {
        rows.push(`${cat.category} TOTAL,,${cat.total_qty},${cat.total_revenue}`);
        cat.items.forEach((item) =>
          rows.push(`  ${cat.category},${item.name},${item.qty},${item.revenue}`)
        );
      });
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-report-${data.employee.name.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const openVoidDialog = (orderId: string, items: Array<{ name: string; quantity: number; price: number }>) => {
    setVoidingOrderId(orderId);
    setVoidingOrderItems(items);
    setVoidItemIndex('0');
    setVoidReason('');
    setVoidDialogOpen(true);
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast.error('Please enter a void reason');
      return;
    }
    setVoidLoading(true);
    try {
      await api.post(`/orders/${voidingOrderId}/void-item`, {
        item_index: parseInt(voidItemIndex),
        void_reason: voidReason,
      });
      toast.success('Item voided successfully');
      setVoidDialogOpen(false);
      fetchEmployeeDetails();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to void item';
      toast.error(msg);
    } finally {
      setVoidLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <User className="h-6 w-6" />
                  {employeeName || data?.employee.name || 'Employee Details'}
                </DialogTitle>
                <DialogDescription>
                  Comprehensive performance report and analytics
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading employee details...</p>
            </div>
          </div>
        ) : !data ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Employee Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employee</p>
                      <p className="font-semibold">{data.employee.name}</p>
                      <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Briefcase className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role & Department</p>
                      <p className="font-semibold capitalize">{data.employee.role}</p>
                      <p className="text-sm text-muted-foreground">{data.employee.department}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-green-100 rounded-full">
                      <Phone className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-semibold">{data.employee.phone || 'N/A'}</p>
                      <Badge
                        variant={data.employee.status === 'active' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {data.employee.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Range Selector */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Quick Ranges</Label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { label: 'Today', value: 'today' },
                        { label: 'Yesterday', value: 'yesterday' },
                        { label: 'Last 7 Days', value: '7days' },
                        { label: 'Last 30 Days', value: '30days' },
                        { label: 'Last 90 Days', value: '90days' },
                        { label: 'Year to Date', value: 'ytd' },
                      ].map((range) => (
                        <Button
                          key={range.value}
                          variant={dateRange === range.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDateRangeChange(range.value)}
                        >
                          {range.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDateRange('custom');
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDateRange('custom');
                      }}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">
                        KES {data.summary.total_sales.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {data.summary.performance_vs_average > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span
                          className={`text-xs ${
                            data.summary.performance_vs_average > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {data.summary.performance_vs_average > 0 ? '+' : ''}
                          {data.summary.performance_vs_average.toFixed(1)}% vs avg
                        </span>
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{data.summary.total_orders}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.summary.completed_orders} completed
                      </p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">
                        KES {data.summary.avg_order_value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.summary.completion_rate.toFixed(1)}% completion
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Team Rank</p>
                      <p className="text-2xl font-bold">
                        #{data.summary.rank || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        of {data.summary.total_peers} employees
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for detailed views */}
            <Tabs defaultValue="transactions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="transactions">
                  <FileText className="h-4 w-4 mr-2" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="items">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Top Items
                </TabsTrigger>
                <TabsTrigger value="items-by-dept">
                  <Package className="h-4 w-4 mr-2" />
                  Items Sold
                </TabsTrigger>
                <TabsTrigger value="payments">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="trends">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Trends
                </TabsTrigger>
              </TabsList>

              {/* Transactions Tab */}
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      Recent {data.transactions.length} transactions (showing most recent)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.transactions.map((txn) => (
                            <TableRow key={txn.order_id}>
                              <TableCell className="text-sm">
                                {format(new Date(txn.date), 'MMM dd, yyyy HH:mm')}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {txn.order_id.substring(0, 8)}...
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {txn.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx}>
                                      {item.quantity}x {item.name}
                                    </div>
                                  ))}
                                  {txn.items.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{txn.items.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{txn.delivery_location}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {txn.payment_method}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {txn.status === 'completed' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-orange-600" />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                KES {txn.total.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {txn.status !== 'voided' && txn.status !== 'cancelled' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => openVoidDialog(txn.order_id, txn.items)}
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Void
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Top Items Tab */}
              <TabsContent value="items">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Items</CardTitle>
                    <CardDescription>
                      Best performing menu items by revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.top_items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold text-primary">
                              #{index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Sold {item.quantity} times
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              KES {item.revenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Avg: KES {Math.round(item.revenue / item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Items Sold by Department Tab */}
              <TabsContent value="items-by-dept">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle>Items Sold by Department</CardTitle>
                        <CardDescription>
                          All items served to customers, grouped by department
                        </CardDescription>
                      </div>
                      {data.items_by_category?.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const cats = data.items_by_category;
                            printItemSummary({
                              categories: cats,
                              grand_total_qty: cats.reduce((s, c) => s + c.total_qty, 0),
                              grand_total_revenue: cats.reduce((s, c) => s + c.total_revenue, 0),
                              startDate,
                              endDate,
                              employeeName: data.employee.name,
                            });
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!data.items_by_category?.length ? (
                      <div className="text-center py-10 text-muted-foreground">
                        No items sold in this period.
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-800 text-white">
                              <th className="text-left px-3 py-2 w-1/2">Department / Item Name</th>
                              <th className="text-right px-3 py-2 w-24">Qty</th>
                              <th className="text-right px-3 py-2">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.items_by_category.map((cat, ci) => (
                              <React.Fragment key={cat.category}>
                                {/* Department header row */}
                                <tr
                                  className="bg-blue-50 hover:bg-blue-100 cursor-pointer select-none"
                                  onClick={() => toggleCategory(cat.category)}
                                >
                                  <td className="px-3 py-2 font-bold flex items-center gap-1">
                                    {expandedCategories.has(cat.category)
                                      ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                                      : <ChevronRight className="h-4 w-4 text-blue-600 shrink-0" />}
                                    <span className="text-blue-900">{cat.category.toUpperCase()}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-blue-900">{cat.total_qty}</td>
                                  <td className="px-3 py-2 text-right font-bold text-blue-900">
                                    KES {cat.total_revenue.toLocaleString()}
                                  </td>
                                </tr>
                                {/* Item rows */}
                                {expandedCategories.has(cat.category) &&
                                  cat.items.map((item, ii) => (
                                    <tr
                                      key={`${ci}-${ii}`}
                                      className={ii % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    >
                                      <td className="px-3 py-1.5 pl-8 text-gray-700">{item.name}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-700">{item.qty}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-700">
                                        KES {item.revenue.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                              </React.Fragment>
                            ))}
                            {/* Grand total row */}
                            <tr className="bg-green-50 border-t-2 border-green-300">
                              <td className="px-3 py-2 font-bold text-green-900">GRAND TOTAL</td>
                              <td className="px-3 py-2 text-right font-bold text-green-900">
                                {data.items_by_category.reduce((s, c) => s + c.total_qty, 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-green-900">
                                KES {data.items_by_category
                                  .reduce((s, c) => s + c.total_revenue, 0)
                                  .toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                      Click a department row to expand/collapse its items. Cancelled orders are excluded.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Methods Tab */}
              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Breakdown</CardTitle>
                    <CardDescription>
                      Distribution of payment methods used
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.payment_methods.map((method, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{method.method}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">KES {method.total.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {method.percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${method.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends">
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Sales Trend</CardTitle>
                      <CardDescription>
                        Revenue performance over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.trends.daily.slice(-14).map((day, index) => (
                          <div key={index} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-muted-foreground">
                              {format(new Date(day.date), 'MMM dd')}
                            </div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-6 relative">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center px-2 transition-all"
                                  style={{
                                    width: `${Math.min((day.revenue / Math.max(...data.trends.daily.map((d) => d.revenue))) * 100, 100)}%`,
                                  }}
                                >
                                  <span className="text-xs font-medium text-white">
                                    KES {day.revenue.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Hourly Sales Pattern</CardTitle>
                      <CardDescription>
                        Best performing hours of the day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.trends.hourly
                          .sort((a, b) => b.revenue - a.revenue)
                          .slice(0, 10)
                          .map((hour, index) => (
                            <div key={index} className="flex items-center gap-4">
                              <div className="w-20 text-sm font-medium">{hour.hour}</div>
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-6 relative">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center px-2 transition-all"
                                    style={{
                                      width: `${Math.min((hour.revenue / Math.max(...data.trends.hourly.map((h) => h.revenue))) * 100, 100)}%`,
                                    }}
                                  >
                                    <span className="text-xs font-medium text-white">
                                      KES {hour.revenue.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Void Dialog */}
    <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="h-5 w-5" />
            Void Order
          </DialogTitle>
          <DialogDescription>
            Order: <span className="font-mono text-xs">{voidingOrderId.substring(0, 8)}...</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Select Item to Void</Label>
            <Select value={voidItemIndex} onValueChange={setVoidItemIndex}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voidingOrderItems.map((item, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {item.quantity}x {item.name} — KES {item.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Void Reason <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Wrong order, Customer complaint..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={voidLoading || !voidReason.trim()}
            >
              {voidLoading ? 'Voiding...' : 'Confirm Void'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
