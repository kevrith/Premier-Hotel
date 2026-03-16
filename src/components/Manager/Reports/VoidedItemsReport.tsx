/**
 * VoidedItemsReport
 * Shows voided/cancelled items grouped by who voided them and for which waiter.
 * Supports Print and Excel export.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Download, RefreshCw, AlertTriangle, User, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';

interface VoidRecord {
  id: string;
  date: string;
  order_number: string;
  items_summary: string;
  amount: number;
  voided_by: string;
  voided_by_role: string;
  original_waiter: string;
  reason: string;
  status: string;
  type: string;
}

interface VoiderGroup {
  voided_by: string;
  role: string;
  count: number;
  total_amount: number;
  records: VoidRecord[];
}

interface WaiterGroup {
  waiter: string;
  count: number;
  total_amount: number;
  records: VoidRecord[];
}

interface VoidReportData {
  period: { start: string; end: string };
  summary: { total_voids: number; total_voided_amount: number };
  by_voider: VoiderGroup[];
  by_waiter: WaiterGroup[];
  records: VoidRecord[];
}

export const VoidedItemsReport: React.FC = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<VoidReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/void-report', {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(res.data);
    } catch {
      toast.error('Failed to load void report');
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(v);

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to print'); return; }

    const summaryRows = data.records.map(r => `
      <tr>
        <td style="padding:5px 8px;border:1px solid #ccc">${format(new Date(r.date), 'dd/MM/yyyy HH:mm')}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${r.order_number}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${r.items_summary}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:right">KES ${r.amount.toLocaleString()}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${r.voided_by} (${r.voided_by_role})</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${r.original_waiter}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${r.reason || '—'}</td>
      </tr>`).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Void Report</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h2{text-align:center}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#333;color:#fff;padding:7px;text-align:left}
      .total-row{background:#fff3cd;font-weight:bold}
      @media print{body{padding:10px}}</style></head><body>
      <h2>Premier Hotel</h2>
      <h3 style="text-align:center">Voided Items Report</h3>
      <p style="text-align:center;color:#666">Date: ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}</p>
      <p style="text-align:center"><strong>Total Voids: ${data.summary.total_voids}</strong> &nbsp;|&nbsp; <strong>Total Amount: KES ${data.summary.total_voided_amount.toLocaleString()}</strong></p>
      <table><thead><tr>
        <th>Date</th><th>Order #</th><th>Items</th><th style="text-align:right">Amount</th>
        <th>Voided By</th><th>Waiter</th><th>Reason</th>
      </tr></thead><tbody>
      ${summaryRows}
      <tr class="total-row">
        <td colspan="3" style="padding:8px;border:1px solid #ccc"><strong>TOTAL</strong></td>
        <td style="padding:8px;border:1px solid #ccc;text-align:right"><strong>KES ${data.summary.total_voided_amount.toLocaleString()}</strong></td>
        <td colspan="3" style="padding:8px;border:1px solid #ccc"></td>
      </tr>
      </tbody></table>
      <p style="text-align:center;font-size:10px;margin-top:20px;color:#888">Generated: ${new Date().toLocaleString()}</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
      </body></html>`);
    win.document.close();
  };

  const handleExcel = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Order #', 'Items', 'Amount (KES)', 'Voided By', 'Role', 'Waiter', 'Reason'],
      ...data.records.map(r => [
        format(new Date(r.date), 'dd/MM/yyyy HH:mm'),
        r.order_number,
        r.items_summary,
        String(r.amount),
        r.voided_by,
        r.voided_by_role,
        r.original_waiter,
        r.reason || '',
      ]),
      ['TOTAL', '', '', String(data.summary.total_voided_amount), '', '', '', ''],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `void-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Voided Items Report</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cancelled / voided orders — Date:{' '}
                {startDate === endDate
                  ? format(new Date(startDate), 'dd/MM/yyyy')
                  : `${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 mt-1" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 mt-1" />
              </div>
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExcel} disabled={!data}>
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : !data || data.records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No voided items found for the selected period.
            </div>
          ) : (
            <>
              {/* Summary badges */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <Badge variant="outline" className="text-sm px-3 py-1 border-red-300 text-red-700">
                  Total Voids: <strong className="ml-1">{data.summary.total_voids}</strong>
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1 border-red-300 text-red-700">
                  Total Amount: <strong className="ml-1">{fmtCurrency(data.summary.total_voided_amount)}</strong>
                </Badge>
              </div>

              <Tabs defaultValue="by-voider" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="by-voider">
                    <UserX className="h-4 w-4 mr-2" />
                    By Who Voided
                  </TabsTrigger>
                  <TabsTrigger value="by-waiter">
                    <User className="h-4 w-4 mr-2" />
                    By Waiter
                  </TabsTrigger>
                  <TabsTrigger value="all">All Records</TabsTrigger>
                </TabsList>

                {/* Group by Voider */}
                <TabsContent value="by-voider">
                  <div className="space-y-4">
                    {data.by_voider.map((group, gi) => (
                      <Card key={gi}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <UserX className="h-5 w-5 text-red-600" />
                              <span className="font-semibold">{group.voided_by}</span>
                              <Badge variant="outline" className="text-xs capitalize">{group.role}</Badge>
                            </div>
                            <div className="text-right text-sm">
                              <span className="font-bold text-red-700">{fmtCurrency(group.total_amount)}</span>
                              <span className="text-muted-foreground ml-2">({group.count} voids)</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="border rounded overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left px-3 py-2">Date</th>
                                  <th className="text-left px-3 py-2">Order #</th>
                                  <th className="text-left px-3 py-2">Items</th>
                                  <th className="text-left px-3 py-2">Waiter</th>
                                  <th className="text-left px-3 py-2">Reason</th>
                                  <th className="text-right px-3 py-2">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.records.map((r, ri) => (
                                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                      {format(new Date(r.date), 'dd/MM HH:mm')}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{r.order_number}</td>
                                    <td className="px-3 py-1.5">{r.items_summary}</td>
                                    <td className="px-3 py-1.5">{r.original_waiter}</td>
                                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.reason || '—'}</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-red-700">
                                      {fmtCurrency(r.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Group by Waiter */}
                <TabsContent value="by-waiter">
                  <div className="space-y-4">
                    {data.by_waiter.map((group, gi) => (
                      <Card key={gi}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-orange-600" />
                              <span className="font-semibold">{group.waiter}</span>
                              <Badge variant="outline" className="text-xs">Waiter</Badge>
                            </div>
                            <div className="text-right text-sm">
                              <span className="font-bold text-orange-700">{fmtCurrency(group.total_amount)}</span>
                              <span className="text-muted-foreground ml-2">({group.count} voids)</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="border rounded overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left px-3 py-2">Date</th>
                                  <th className="text-left px-3 py-2">Order #</th>
                                  <th className="text-left px-3 py-2">Items</th>
                                  <th className="text-left px-3 py-2">Voided By</th>
                                  <th className="text-left px-3 py-2">Reason</th>
                                  <th className="text-right px-3 py-2">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.records.map((r, ri) => (
                                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                                      {format(new Date(r.date), 'dd/MM HH:mm')}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{r.order_number}</td>
                                    <td className="px-3 py-1.5">{r.items_summary}</td>
                                    <td className="px-3 py-1.5">
                                      {r.voided_by}
                                      <span className="text-xs text-muted-foreground ml-1">({r.voided_by_role})</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.reason || '—'}</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-orange-700">
                                      {fmtCurrency(r.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* All Records */}
                <TabsContent value="all">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Order #</th>
                          <th className="text-left px-3 py-2">Items</th>
                          <th className="text-left px-3 py-2">Voided By</th>
                          <th className="text-left px-3 py-2">Waiter</th>
                          <th className="text-left px-3 py-2">Reason</th>
                          <th className="text-right px-3 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.records.map((r, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">
                              {format(new Date(r.date), 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-xs">{r.order_number}</td>
                            <td className="px-3 py-1.5">{r.items_summary}</td>
                            <td className="px-3 py-1.5">
                              {r.voided_by}
                              <span className="text-xs text-muted-foreground ml-1">({r.voided_by_role})</span>
                            </td>
                            <td className="px-3 py-1.5">{r.original_waiter}</td>
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.reason || '—'}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-red-700">
                              {fmtCurrency(r.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 border-t-2 border-red-300">
                          <td colSpan={6} className="px-3 py-2 font-bold text-red-900">TOTAL</td>
                          <td className="px-3 py-2 text-right font-bold text-red-900">
                            {fmtCurrency(data.summary.total_voided_amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
