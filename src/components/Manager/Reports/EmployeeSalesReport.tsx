// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download, Printer, TrendingUp, DollarSign, Users, BarChart3,
  RefreshCw, Eye, CreditCard, Smartphone, Banknote, Hotel, Split, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import reportsService from '@/lib/api/reports';
import { EmployeeDetailReport } from '@/components/Admin/Reports/EmployeeDetailReport';
import { printEmployeeSalesReport } from '@/lib/print';

interface MpesaTxn { mpesa_code: string; amount: number; phone: string; bill_number: string; date: string; }
interface SplitBill { bill_number: string; bill_id: string; your_amount: number; total_amount: number; split_count: number; }
interface PaymentSummary { cash: number; mpesa: number; card: number; room_charge: number; other: number; total_collected: number; }

interface EmpData {
  employee_id: string; employee_name: string; email: string; role: string; department: string;
  total_sales: number; total_orders: number; completed_orders: number; avg_order_value: number;
  total_items_sold: number; orders_today: number; orders_this_week: number; orders_this_month: number;
  top_selling_item: string; first_sale_time: string; last_sale_time: string; completion_rate: number;
  payment_summary: PaymentSummary; mpesa_transactions: MpesaTxn[]; split_bills: SplitBill[];
  items_summary?: Array<{ name: string; qty: number; revenue: number }>;
}

const fmt = (v: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(v);

export function EmployeeSalesReport() {
  const [selectedRole, setSelectedRole] = useState('all');
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<EmpData[]>([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalOrders: 0, totalEmployees: 0, unattributedSales: 0, unattributedOrders: 0 });
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailName, setDetailName] = useState('');

  useEffect(() => { loadReport(); }, [period, selectedRole, startDate, endDate]);

  const getDateRange = () => {
    const now = new Date();
    if (period === 'custom') return { start: startDate + 'T00:00:00', end: endDate + 'T23:59:59' };
    const end = now.toISOString();
    if (period === 'today') return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), end };
    if (period === 'week') return { start: new Date(now.getTime() - 7 * 86400000).toISOString(), end };
    if (period === 'month') return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end };
    return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end };
  };

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      const data = await reportsService.getEmployeeSales(start, end, undefined, undefined,
        selectedRole === 'all' ? undefined : selectedRole);
      setEmployees(data.employees || []);
      setSummary({ totalSales: data.total_sales, totalOrders: data.total_orders, totalEmployees: data.total_employees, unattributedSales: data.unattributed_sales ?? 0, unattributedOrders: data.unattributed_orders ?? 0 });
    } catch {
      toast.error('Failed to load employee sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (emp?: EmpData) => {
    const list = emp ? [emp] : employees;
    printEmployeeSalesReport({
      employees: list,
      periodLabel,
      totalSales: emp ? emp.total_sales : summary.totalSales,
      totalOrders: emp ? emp.total_orders : summary.totalOrders,
      unattributedSales: emp ? 0 : summary.unattributedSales,
    });
  };

  const handleExportCSV = () => {
    const rows = [['Employee','Role','Dept','Total Sales','Orders','Avg Order','Items','Cash','M-Pesa','Card','Room Charge','Total Collected']];
    employees.forEach(e => rows.push([e.employee_name,e.role,e.department,String(e.total_sales),String(e.total_orders),String(e.avg_order_value),String(e.total_items_sold),String(e.payment_summary.cash),String(e.payment_summary.mpesa),String(e.payment_summary.card),String(e.payment_summary.room_charge),String(e.payment_summary.total_collected)]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `employee-sales-${startDate}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success('Exported');
  };

  const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'Last 7 Days' :
    period === 'month' ? 'This Month' : period === 'year' ? 'This Year' :
    `${format(new Date(startDate),'dd/MM/yyyy')} – ${format(new Date(endDate),'dd/MM/yyyy')}`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Employee Sales Report</CardTitle>
              <CardDescription>Sales & payment breakdown — {periodLabel}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-32 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="waiter">Waiters</SelectItem>
                    <SelectItem value="chef">Chefs</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-36 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {period === 'custom' && <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 mt-1" />
                </div>
              </>}
              <Button variant="outline" size="sm" onClick={loadReport} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                <Printer className="h-4 w-4 mr-1" />Print All
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Employees', value: summary.totalEmployees, Icon: Users, color: 'text-blue-600' },
          { label: 'Total Sales', value: fmt(summary.totalSales), Icon: TrendingUp, color: 'text-green-600' },
          { label: 'Total Orders', value: summary.totalOrders, Icon: BarChart3, color: 'text-purple-600' },
          { label: 'Avg Order', value: fmt(summary.totalOrders > 0 ? summary.totalSales / summary.totalOrders : 0), Icon: DollarSign, color: 'text-orange-600' },
          ...(summary.unattributedOrders > 0 ? [{ label: `Unattributed (${summary.unattributedOrders} orders)`, value: fmt(summary.unattributedSales), Icon: AlertCircle, color: 'text-red-500' }] : []),
        ].map(({ label, value, Icon, color }) => (
          <Card key={label}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold mt-0.5">{value}</p></div>
            <Icon className={`h-8 w-8 ${color}`} />
          </CardContent></Card>
        ))}
      </div>

      {/* Employee cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : employees.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No employee sales data for the selected period.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {employees.map((emp, idx) => (
            <Card key={emp.employee_id} className="overflow-hidden">
              {/* Header bar */}
              <div className="bg-muted px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-muted-foreground/40 text-foreground' :
                    idx === 2 ? 'bg-orange-500 text-white' : 'bg-muted-foreground/30 text-foreground'}`}>{idx + 1}</div>
                  <div>
                    <p className="font-semibold text-foreground">{emp.employee_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{emp.role} • {emp.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-foreground">{fmt(emp.total_sales)}</p>
                    <p className="text-xs text-muted-foreground">{emp.total_orders} orders</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => {
                    setDetailId(emp.employee_id); setDetailName(emp.employee_name); setShowDetail(true);
                  }}><Eye className="h-3 w-3 mr-1" />Details</Button>
                  <Button size="sm" variant="outline"
                    onClick={() => handlePrint(emp)}><Printer className="h-3 w-3 mr-1" />Print</Button>
                </div>
              </div>

              <CardContent className="p-4">
                <Tabs defaultValue="payments">
                  <TabsList className="mb-3 flex-wrap h-auto gap-1">
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="payments">
                      Payments{emp.payment_summary.total_collected > 0 &&
                        <Badge className="ml-1 h-4 text-[10px] bg-green-600 text-white px-1">{fmt(emp.payment_summary.total_collected)}</Badge>}
                    </TabsTrigger>
                    {emp.mpesa_transactions.length > 0 &&
                      <TabsTrigger value="mpesa">M-Pesa ({emp.mpesa_transactions.length})</TabsTrigger>}
                    {emp.split_bills.length > 0 &&
                      <TabsTrigger value="splits">Split Bills ({emp.split_bills.length})</TabsTrigger>}
                  </TabsList>

                  {/* Sales tab */}
                  <TabsContent value="sales">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Sales', value: fmt(emp.total_sales), cls: 'bg-green-500/10 text-green-500' },
                        { label: 'Avg Order', value: fmt(emp.avg_order_value), cls: 'bg-blue-500/10 text-blue-500' },
                        { label: 'Items Sold', value: emp.total_items_sold, cls: 'bg-purple-500/10 text-purple-500' },
                        { label: 'Completion', value: `${emp.completion_rate}%`, cls: 'bg-orange-500/10 text-orange-500' },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className={`rounded-lg p-3 ${cls}`}>
                          <p className="text-xs font-medium opacity-70">{label}</p>
                          <p className="text-lg font-bold mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                    {emp.first_sale_time !== 'N/A' && (
                      <p className="text-xs text-muted-foreground mt-3">
                        First: <b>{emp.first_sale_time}</b> | Last: <b>{emp.last_sale_time}</b> | Top item: <b>{emp.top_selling_item}</b>
                      </p>
                    )}
                  </TabsContent>

                  {/* Payments tab */}
                  <TabsContent value="payments">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted">
                          <th className="text-left px-4 py-2 text-muted-foreground font-medium">Payment Method</th>
                          <th className="text-right px-4 py-2 text-muted-foreground font-medium">Amount</th>
                        </tr></thead>
                        <tbody>
                          {[
                            { Icon: Banknote, label: 'Cash', val: emp.payment_summary.cash, color: 'text-green-500' },
                            { Icon: Smartphone, label: 'M-Pesa', val: emp.payment_summary.mpesa, color: 'text-blue-500' },
                            { Icon: CreditCard, label: 'Card (Paystack)', val: emp.payment_summary.card, color: 'text-purple-500' },
                            { Icon: Hotel, label: 'Room Charge', val: emp.payment_summary.room_charge, color: 'text-orange-500' },
                            ...(emp.payment_summary.other > 0 ? [{ Icon: DollarSign, label: 'Other', val: emp.payment_summary.other, color: 'text-muted-foreground' }] : []),
                          ].map(({ Icon, label, val, color }) => (
                            <tr key={label} className="border-t border-border hover:bg-muted/50">
                              <td className="px-4 py-2 text-foreground"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} />{label}</div></td>
                              <td className="px-4 py-2 text-right font-medium text-foreground">{fmt(val)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-green-500/50 bg-green-500/10 font-bold">
                            <td className="px-4 py-2 text-green-500">TOTAL COLLECTED</td>
                            <td className="px-4 py-2 text-right text-green-500">{fmt(emp.payment_summary.total_collected)}</td>
                          </tr>
                          {emp.payment_summary.total_collected !== emp.total_sales && emp.total_sales > 0 && (
                            <tr className="bg-yellow-500/10 text-xs text-yellow-500">
                              <td className="px-4 py-1.5">Variance (Sales vs Collected)</td>
                              <td className="px-4 py-1.5 text-right">
                                {fmt(Math.abs(emp.total_sales - emp.payment_summary.total_collected))}
                                {emp.total_sales > emp.payment_summary.total_collected ? ' unpaid' : ' over'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {/* M-Pesa tab */}
                  {emp.mpesa_transactions.length > 0 && (
                    <TabsContent value="mpesa">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-blue-600 text-white">
                            <th className="text-left px-3 py-2">M-Pesa Code</th>
                            <th className="text-left px-3 py-2">Phone</th>
                            <th className="text-left px-3 py-2">Bill #</th>
                            <th className="text-right px-3 py-2">Amount</th>
                            <th className="text-left px-3 py-2">Time</th>
                          </tr></thead>
                          <tbody>
                            {emp.mpesa_transactions.map((m, i) => (
                              <tr key={i} className={`border-t border-border ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                <td className="px-3 py-2 font-mono font-bold text-blue-500">{m.mpesa_code}</td>
                                <td className="px-3 py-2 text-foreground">{m.phone || '—'}</td>
                                <td className="px-3 py-2 text-foreground">{m.bill_number}</td>
                                <td className="px-3 py-2 text-right font-semibold text-foreground">{fmt(m.amount)}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                  {m.date ? format(new Date(m.date), 'dd/MM HH:mm') : '—'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-blue-500/10 font-bold border-t-2 border-blue-500/30">
                              <td colSpan={3} className="px-3 py-2 text-blue-500">M-PESA TOTAL</td>
                              <td className="px-3 py-2 text-right text-blue-500">{fmt(emp.payment_summary.mpesa)}</td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  )}

                  {/* Split Bills tab */}
                  {emp.split_bills.length > 0 && (
                    <TabsContent value="splits">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-orange-600 text-white">
                            <th className="text-left px-3 py-2">Bill #</th>
                            <th className="text-right px-3 py-2">Bill Total</th>
                            <th className="text-right px-3 py-2">Your Share</th>
                            <th className="text-center px-3 py-2">Split</th>
                          </tr></thead>
                          <tbody>
                            {emp.split_bills.map((b, i) => (
                              <tr key={i} className={`border-t border-border ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                <td className="px-3 py-2 font-medium text-foreground">{b.bill_number}</td>
                                <td className="px-3 py-2 text-right text-foreground">{fmt(b.total_amount)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-orange-500">{fmt(b.your_amount)}</td>
                                <td className="px-3 py-2 text-center">
                                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                                    <Split className="h-3 w-3 mr-1" />{b.split_count} ways
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {detailId && (
        <EmployeeDetailReport
          employeeId={detailId}
          employeeName={detailName}
          open={showDetail}
          onClose={() => setShowDetail(false)}
          initialStartDate={getDateRange().start.split('T')[0]}
          initialEndDate={getDateRange().end.split('T')[0]}
        />
      )}
    </div>
  );
}
