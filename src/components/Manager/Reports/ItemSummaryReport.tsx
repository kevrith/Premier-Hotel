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
import { Printer, Download, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';

interface ItemRow {
  name: string;
  qty: number;
  revenue: number;
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
}

export const ItemSummaryReport: React.FC = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<ItemSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to print'); return; }

    const rows = data.categories.map(cat => `
      <tr style="background:#f0f4ff;font-weight:bold">
        <td style="padding:6px 8px;border:1px solid #ccc">${cat.category}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">${cat.total_qty}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">KES ${cat.total_revenue.toLocaleString()}</td>
      </tr>
      ${cat.items.map(item => `
      <tr>
        <td style="padding:5px 8px 5px 24px;border:1px solid #ccc">${item.name}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:right">${item.qty}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:right">KES ${item.revenue.toLocaleString()}</td>
      </tr>`).join('')}
    `).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Item Summary</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h2{text-align:center}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#333;color:#fff;padding:8px;text-align:left}
      .total-row{background:#e8f5e9;font-weight:bold}
      @media print{body{padding:10px}}</style></head><body>
      <h2>Premier Hotel</h2>
      <h3 style="text-align:center">Item Summary</h3>
      <p style="text-align:center;color:#666">Date: ${format(new Date(startDate), 'dd/MM/yyyy')} to ${format(new Date(endDate), 'dd/MM/yyyy')}</p>
      <table><thead><tr>
        <th>Department / Item Name</th><th style="text-align:right">Qty</th><th style="text-align:right">Ext Price</th>
      </tr></thead><tbody>
      ${rows}
      <tr class="total-row"><td style="padding:8px;border:1px solid #ccc"><strong>GRAND TOTAL</strong></td>
        <td style="padding:8px;border:1px solid #ccc;text-align:right"><strong>${data.grand_total_qty}</strong></td>
        <td style="padding:8px;border:1px solid #ccc;text-align:right"><strong>KES ${data.grand_total_revenue.toLocaleString()}</strong></td>
      </tr></tbody></table>
      <p style="text-align:center;font-size:10px;margin-top:20px;color:#888">Generated: ${new Date().toLocaleString()}</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
      </body></html>`);
    win.document.close();
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
            <>
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
                        {/* Category / Department row */}
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
                            {fmtCurrency(cat.total_revenue)}
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
                                {fmtCurrency(item.revenue)}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}

                    {/* Grand total */}
                    <tr className="bg-green-50 border-t-2 border-green-300">
                      <td className="px-3 py-2 font-bold text-green-900">GRAND TOTAL</td>
                      <td className="px-3 py-2 text-right font-bold text-green-900">{data.grand_total_qty}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-900">
                        {fmtCurrency(data.grand_total_revenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Click a department row to expand/collapse its items.
                Cancelled orders are excluded.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
