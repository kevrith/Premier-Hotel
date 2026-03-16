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

interface MpesaTxn { mpesa_code: string; amount: number; phone: string; bill_number: string; date: string; }
interface SplitBill { bill_number: string; bill_id: string; your_amount: number; total_amount: number; split_count: number; }
interface PaymentSummary { cash: number; mpesa: number; card: number; room_charge: number; other: number; total_collected: number; }

interface EmpData {
  employee_id: string; employee_name: string; email: string; role: string; department: string;
  total_sales: number; total_orders: number; completed_orders: number; avg_order_value: number;
  total_items_sold: number; orders_today: number; orders_this_week: number; orders_this_month: number;
  top_selling_item: string; first_sale_time: string; last_sale_time: string; completion_rate: number;
  payment_summary: PaymentSummary; mpesa_transactions: MpesaTxn[]; split_bills: SplitBill[];
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
    const { start, end } = getDateRange();
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to print'); return; }
    const rows = list.map(e => `
      <div style="page-break-after:always;padding:20px;font-family:Arial,sans-serif;max-width:800px;margin:0 auto">
        <h2 style="text-align:center;margin:0">Premier Hotel</h2>
        <h3 style="text-align:center;margin:4px 0">Employee Sales Report</h3>
        <p style="text-align:center;color:#555;font-size:12px;margin:0">${format(new Date(start),'dd/MM/yyyy')} to ${format(new Date(end),'dd/MM/yyyy')}</p>
        <hr style="margin:10px 0"/>
        <table style="width:100%;font-size:13px;margin-bottom:8px">
          <tr><td><b>Name:</b></td><td>${e.employee_name}</td><td><b>Role:</b></td><td style="text-transform:capitalize">${e.role}</td></tr>
          <tr><td><b>Dept:</b></td><td>${e.department}</td><td><b>Orders:</b></td><td>${e.total_orders}</td></tr>
        </table>
        <h4 style="background:#222;color:#fff;padding:5px 8px;margin:8px 0 0">SALES SUMMARY</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f5f5f5"><td style="padding:4px 8px;border:1px solid #ddd">Total Sales</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right;font-weight:bold">KES ${e.total_sales.toLocaleString()}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ddd">Items Sold</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${e.total_items_sold}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding:4px 8px;border:1px solid #ddd">Avg Order Value</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">KES ${e.avg_order_value.toLocaleString()}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ddd">Top Item</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${e.top_selling_item}</td></tr>
        </table>
        <h4 style="background:#222;color:#fff;padding:5px 8px;margin:8px 0 0">PAYMENT BREAKDOWN</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="background:#f5f5f5"><td style="padding:4px 8px;border:1px solid #ddd">Cash</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">KES ${e.payment_summary.cash.toLocaleString()}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ddd">M-Pesa</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">KES ${e.payment_summary.mpesa.toLocaleString()}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding:4px 8px;border:1px solid #ddd">Card (Paystack)</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">KES ${e.payment_summary.card.toLocaleString()}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ddd">Room Charge</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">KES ${e.payment_summary.room_charge.toLocaleString()}</td></tr>
          <tr style="background:#e8f5e9;font-weight:bold"><td style="padding:5px 8px;border:2px solid #4caf50">TOTAL COLLECTED</td><td style="padding:5px 8px;border:2px solid #4caf50;text-align:right">KES ${e.payment_summary.total_collected.toLocaleString()}</td></tr>
        </table>
        ${e.mpesa_transactions.length > 0 ? `
        <h4 style="background:#222;color:#fff;padding:5px 8px;margin:8px 0 0">M-PESA TRANSACTIONS (${e.mpesa_transactions.length})</h4>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#eee"><th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Code</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Phone</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Bill</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Amount</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Time</th></tr></thead>
          <tbody>${e.mpesa_transactions.map((m,i)=>`<tr style="background:${i%2===0?'#fff':'#f0f7ff'}"><td style="padding:3px 8px;border:1px solid #ddd;font-family:monospace;font-weight:bold">${m.mpesa_code}</td><td style="padding:3px 8px;border:1px solid #ddd">${m.phone||'—'}</td><td style="padding:3px 8px;border:1px solid #ddd">${m.bill_number}</td><td style="padding:3px 8px;border:1px solid #ddd;text-align:right">KES ${m.amount.toLocaleString()}</td><td style="padding:3px 8px;border:1px solid #ddd;font-size:11px">${m.date?format(new Date(m.date),'dd/MM HH:mm'):'—'}</td></tr>`).join('')}
          <tr style="background:#dbeafe;font-weight:bold"><td colspan="3" style="padding:4px 8px;border:1px solid #ddd">M-PESA TOTAL</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">KES ${e.payment_summary.mpesa.toLocaleString()}</td><td style="border:1px solid #ddd"></td></tr>
          </tbody></table>` : ''}
        ${e.split_bills.length > 0 ? `
        <h4 style="background:#222;color:#fff;padding:5px 8px;margin:8px 0 0">SPLIT BILLS (${e.split_bills.length})</h4>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#eee"><th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Bill #</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Bill Total</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Your Share</th><th style="padding:4px 8px;border:1px solid #ddd;text-align:center">Split</th></tr></thead>
          <tbody>${e.split_bills.map((b,i)=>`<tr style="background:${i%2===0?'#fff':'#fff8e1'}"><td style="padding:3px 8px;border:1px solid #ddd">${b.bill_number}</td><td style="padding:3px 8px;border:1px solid #ddd;text-align:right">KES ${b.total_amount.toLocaleString()}</td><td style="padding:3px 8px;border:1px solid #ddd;text-align:right;font-weight:bold">KES ${b.your_amount.toLocaleString()}</td><td style="padding:3px 8px;border:1px solid #ddd;text-align:center">${b.split_count} ways</td></tr>`).join('')}</tbody>
        </table>` : ''}
        <p style="font-size:10px;color:#888;text-align:center;margin-top:16px">Generated: ${new Date().toLocaleString()}</p>
      </div>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Employee Sales</title></head><body>${rows}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);
    win.document.close();
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
              <div className="bg-gray-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' :
                    idx === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-600'}`}>{idx + 1}</div>
                  <div>
                    <p className="font-semibold">{emp.employee_name}</p>
                    <p className="text-xs text-gray-300 capitalize">{emp.role} • {emp.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold">{fmt(emp.total_sales)}</p>
                    <p className="text-xs text-gray-300">{emp.total_orders} orders</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => {
                    setDetailId(emp.employee_id); setDetailName(emp.employee_name); setShowDetail(true);
                  }}><Eye className="h-3 w-3 mr-1" />Details</Button>
                  <Button size="sm" variant="outline" className="border-gray-500 text-white hover:bg-gray-700"
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
                        { label: 'Total Sales', value: fmt(emp.total_sales), cls: 'bg-green-50 text-green-800' },
                        { label: 'Avg Order', value: fmt(emp.avg_order_value), cls: 'bg-blue-50 text-blue-800' },
                        { label: 'Items Sold', value: emp.total_items_sold, cls: 'bg-purple-50 text-purple-800' },
                        { label: 'Completion', value: `${emp.completion_rate}%`, cls: 'bg-orange-50 text-orange-800' },
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
                        <thead><tr className="bg-gray-100">
                          <th className="text-left px-4 py-2">Payment Method</th>
                          <th className="text-right px-4 py-2">Amount</th>
                        </tr></thead>
                        <tbody>
                          {[
                            { Icon: Banknote, label: 'Cash', val: emp.payment_summary.cash, color: 'text-green-600' },
                            { Icon: Smartphone, label: 'M-Pesa', val: emp.payment_summary.mpesa, color: 'text-blue-600' },
                            { Icon: CreditCard, label: 'Card (Paystack)', val: emp.payment_summary.card, color: 'text-purple-600' },
                            { Icon: Hotel, label: 'Room Charge', val: emp.payment_summary.room_charge, color: 'text-orange-600' },
                            ...(emp.payment_summary.other > 0 ? [{ Icon: DollarSign, label: 'Other', val: emp.payment_summary.other, color: 'text-gray-600' }] : []),
                          ].map(({ Icon, label, val, color }) => (
                            <tr key={label} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} />{label}</div></td>
                              <td className="px-4 py-2 text-right font-medium">{fmt(val)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-green-400 bg-green-50 font-bold">
                            <td className="px-4 py-2 text-green-800">TOTAL COLLECTED</td>
                            <td className="px-4 py-2 text-right text-green-800">{fmt(emp.payment_summary.total_collected)}</td>
                          </tr>
                          {emp.payment_summary.total_collected !== emp.total_sales && emp.total_sales > 0 && (
                            <tr className="bg-yellow-50 text-xs text-yellow-700">
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
                          <thead><tr className="bg-blue-800 text-white">
                            <th className="text-left px-3 py-2">M-Pesa Code</th>
                            <th className="text-left px-3 py-2">Phone</th>
                            <th className="text-left px-3 py-2">Bill #</th>
                            <th className="text-right px-3 py-2">Amount</th>
                            <th className="text-left px-3 py-2">Time</th>
                          </tr></thead>
                          <tbody>
                            {emp.mpesa_transactions.map((m, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                <td className="px-3 py-2 font-mono font-bold text-blue-700">{m.mpesa_code}</td>
                                <td className="px-3 py-2">{m.phone || '—'}</td>
                                <td className="px-3 py-2">{m.bill_number}</td>
                                <td className="px-3 py-2 text-right font-semibold">{fmt(m.amount)}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">
                                  {m.date ? format(new Date(m.date), 'dd/MM HH:mm') : '—'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-blue-100 font-bold border-t-2 border-blue-400">
                              <td colSpan={3} className="px-3 py-2">M-PESA TOTAL</td>
                              <td className="px-3 py-2 text-right">{fmt(emp.payment_summary.mpesa)}</td>
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
                          <thead><tr className="bg-orange-700 text-white">
                            <th className="text-left px-3 py-2">Bill #</th>
                            <th className="text-right px-3 py-2">Bill Total</th>
                            <th className="text-right px-3 py-2">Your Share</th>
                            <th className="text-center px-3 py-2">Split</th>
                          </tr></thead>
                          <tbody>
                            {emp.split_bills.map((b, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                                <td className="px-3 py-2 font-medium">{b.bill_number}</td>
                                <td className="px-3 py-2 text-right">{fmt(b.total_amount)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-orange-700">{fmt(b.your_amount)}</td>
                                <td className="px-3 py-2 text-center">
                                  <Badge variant="outline" className="border-orange-400 text-orange-700">
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
        />
      )}
    </div>
  );
}
