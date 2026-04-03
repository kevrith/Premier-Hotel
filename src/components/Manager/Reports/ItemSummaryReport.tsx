/**
 * ItemSummaryReport
 * Shows items sold grouped by department/category with qty and revenue.
 * Inspired by QuickBooks POS Item Summary report.
 * Supports Print and Excel export.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Download, RefreshCw, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { buildItemSummaryHtml } from '@/lib/print';
import { PrintPreviewModal } from '@/components/shared/PrintPreviewModal';

interface WaiterRow {
  name: string;
  qty: number;
  revenue: number;
}

interface ItemRow {
  name: string;
  qty: number;
  revenue: number;
  waiters: WaiterRow[];
}

interface CategoryRow {
  category: string;
  items: ItemRow[];
  total_qty: number;
  total_revenue: number;
}

interface ItemSummaryData {
  period: { start: string; end: string };
  categories: CategoryRow[];
  grand_total_qty: number;
  grand_total_revenue: number;
  trends?: {
    hourly: { hour: string; qty: number; revenue: number; orders: number }[];
    daily: { date: string; qty: number; revenue: number; orders: number }[];
  };
}

export const ItemSummaryReport: React.FC = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<ItemSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const toggleItem = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/item-summary', {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(res.data);
      // Expand all categories by default
      setExpandedCategories(new Set(res.data.categories.map((c: CategoryRow) => c.category)));
    } catch (err: any) {
      toast.error('Failed to load item summary');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(v);

  const handlePrint = () => {
    if (!data) return;
    const html = buildItemSummaryHtml({
      categories: data.categories,
      grand_total_qty: data.grand_total_qty,
      grand_total_revenue: data.grand_total_revenue,
      startDate,
      endDate,
    });
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handleExcel = () => {
    if (!data) return;
    const rows = [['Department / Item Name', 'Qty', 'Ext Price (KES)']];
    data.categories.forEach(cat => {
      rows.push([cat.category.toUpperCase(), String(cat.total_qty), String(cat.total_revenue)]);
      cat.items.forEach(item => rows.push([`  ${item.name}`, String(item.qty), String(item.revenue)]));
    });
    rows.push(['GRAND TOTAL', String(data.grand_total_qty), String(data.grand_total_revenue)]);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `item-summary-${startDate}-to-${endDate}.csv`;
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
              <CardTitle className="text-lg">Item Summary</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Items sold by department — Date:{' '}
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
          ) : !data || data.categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No sales data found for the selected period.
            </div>
          ) : (
            <Tabs defaultValue="summary">
              <TabsList className="mb-4">
                <TabsTrigger value="summary">Item Summary</TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />Trends
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                {/* Summary badges */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    Total Qty: <strong className="ml-1">{data.grand_total_qty}</strong>
                  </Badge>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    Total Revenue: <strong className="ml-1">{fmtCurrency(data.grand_total_revenue)}</strong>
                  </Badge>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    Departments: <strong className="ml-1">{data.categories.length}</strong>
                  </Badge>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="text-left px-3 py-2 w-1/2">Department / Item Name</th>
                        <th className="text-right px-3 py-2 w-24">Qty</th>
                        <th className="text-right px-3 py-2">Ext Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((cat, ci) => (
                        <React.Fragment key={cat.category}>
                          <tr
                            className="bg-blue-50 hover:bg-blue-100 cursor-pointer select-none"
                            onClick={() => toggleCategory(cat.category)}
                          >
                            <td className="px-3 py-2 font-bold flex items-center gap-1">
                              {expandedCategories.has(cat.category)
                                ? <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-blue-600 shrink-0" />}
                              <span className="text-blue-500">{cat.category.toUpperCase()}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-blue-500">{cat.total_qty}</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-500">
                              {fmtCurrency(cat.total_revenue)}
                            </td>
                          </tr>

                          {expandedCategories.has(cat.category) &&
                            cat.items.map((item, ii) => {
                              const itemKey = `${cat.category}::${item.name}`;
                              const isExpanded = expandedItems.has(itemKey);
                              return (
                                <React.Fragment key={`${ci}-${ii}`}>
                                  <tr
                                    className={`border-t border-border cursor-pointer hover:bg-blue-50/50 transition-colors ${ii % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                                    onClick={() => item.waiters?.length > 0 && toggleItem(itemKey)}
                                    title={item.waiters?.length > 0 ? 'Click to see waiter breakdown' : ''}
                                  >
                                    <td className="px-3 py-1.5 pl-8 text-foreground flex items-center gap-1">
                                      {item.waiters?.length > 0 && (
                                        isExpanded
                                          ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                                          : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                      )}
                                      {item.name}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-foreground">{item.qty}</td>
                                    <td className="px-3 py-1.5 text-right text-foreground">{fmtCurrency(item.revenue)}</td>
                                  </tr>
                                  {isExpanded && item.waiters?.map((w, wi) => (
                                    <tr key={`w-${wi}`} className="bg-amber-50/60 border-t border-amber-100">
                                      <td className="px-3 py-1 pl-14 text-xs text-amber-800 flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        {w.name}
                                      </td>
                                      <td className="px-3 py-1 text-right text-xs text-amber-800 font-medium">{w.qty}</td>
                                      <td className="px-3 py-1 text-right text-xs text-amber-800">{fmtCurrency(w.revenue)}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                        </React.Fragment>
                      ))}

                      <tr className="bg-green-500/10 border-t-2 border-green-500/30">
                        <td className="px-3 py-2 font-bold text-green-500">GRAND TOTAL</td>
                        <td className="px-3 py-2 text-right font-bold text-green-500">{data.grand_total_qty}</td>
                        <td className="px-3 py-2 text-right font-bold text-green-500">
                          {fmtCurrency(data.grand_total_revenue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Click a department row to expand/collapse its items. Click an item row to see per-waiter breakdown.
                  Cancelled orders are excluded.
                </p>
              </TabsContent>

              <TabsContent value="trends">
                <div className="grid gap-4">
                  {/* Metric toggle */}
                  {(() => {
                    const [metric, setMetric] = React.useState<'qty'|'revenue'|'orders'>('revenue');
                    const METRICS = [
                      { key: 'revenue', label: 'Revenue (KES)' },
                      { key: 'qty',     label: 'Items Qty' },
                      { key: 'orders',  label: 'Order Count' },
                    ] as const;
                    const fmt = (key: string, val: number) =>
                      key === 'revenue' ? `KES ${val.toLocaleString()}` : String(val);
                    const label = (key: string, val: number) =>
                      key === 'revenue' ? `KES ${(val/1000).toFixed(1)}K` : String(val);

                    return (
                      <>
                        <div className="flex gap-2 flex-wrap">
                          {METRICS.map(m => (
                            <button key={m.key}
                              onClick={() => setMetric(m.key)}
                              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                                metric === m.key
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-background text-muted-foreground border-border hover:border-indigo-400'
                              }`}>
                              {m.label}
                            </button>
                          ))}
                        </div>

                        {/* Peak Order Hours */}
                        <Card className="border shadow-none">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Peak Order Hours</CardTitle>
                            <p className="text-xs text-muted-foreground">Busiest hours of the day</p>
                          </CardHeader>
                          <CardContent>
                            {!data.trends?.hourly?.length ? (
                              <p className="text-sm text-muted-foreground py-4 text-center">No data.</p>
                            ) : (
                              <div className="space-y-2">
                                {[...data.trends.hourly]
                                  .sort((a, b) => b[metric] - a[metric])
                                  .map((h, i) => {
                                    const max = Math.max(...data.trends!.hourly.map(x => x[metric]));
                                    const pct = max > 0 ? Math.round((h[metric] / max) * 100) : 0;
                                    return (
                                      <div key={i} className="flex items-center gap-3">
                                        <div className="w-16 text-xs font-medium text-right shrink-0">{h.hour}</div>
                                        <div className="flex-1">
                                          <div className="w-full bg-muted rounded-full h-6">
                                            <div
                                              className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center px-2 transition-all"
                                              style={{ width: `${Math.max(pct, 6)}%` }}
                                            >
                                              <span className="text-xs font-medium text-white truncate">{label(metric, h[metric])}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Daily Demand Trend */}
                        <Card className="border shadow-none">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Daily Demand Trend</CardTitle>
                            <p className="text-xs text-muted-foreground">Per day over the selected period</p>
                          </CardHeader>
                          <CardContent>
                            {!data.trends?.daily?.length ? (
                              <p className="text-sm text-muted-foreground py-4 text-center">No data.</p>
                            ) : (
                              <div className="space-y-2">
                                {data.trends.daily.map((d, i) => {
                                  const max = Math.max(...data.trends!.daily.map(x => x[metric]));
                                  const pct = max > 0 ? Math.round((d[metric] / max) * 100) : 0;
                                  return (
                                    <div key={i} className="flex items-center gap-3">
                                      <div className="w-20 text-xs text-muted-foreground shrink-0">
                                        {format(new Date(d.date), 'MMM dd')}
                                      </div>
                                      <div className="flex-1">
                                        <div className="w-full bg-muted rounded-full h-6">
                                          <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center px-2 transition-all"
                                            style={{ width: `${Math.max(pct, 6)}%` }}
                                          >
                                            <span className="text-xs font-medium text-white truncate">{label(metric, d[metric])}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <PrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
        title="Item Summary"
      />
    </div>
  );
};
