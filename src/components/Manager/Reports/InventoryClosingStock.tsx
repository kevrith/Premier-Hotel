import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';
import * as XLSX from 'xlsx';

interface InventoryItem {
  item_id: string;
  sku: string;
  name: string;
  category_name: string;
  closing_quantity: number;
  unit: string;
  unit_cost: number;
  selling_price: number;
  closing_value: number;        // at selling price
  closing_value_cost: number;   // at cost price
  stock_status: string;
  min_quantity: number;
}

interface DeptSummary {
  department: string;
  items: InventoryItem[];
  total_qty: number;
  total_value: number;       // at selling price
  total_cost_value: number;  // at cost price
  low_stock: number;
  out_of_stock: number;
}

export const InventoryClosingStock: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [asOfDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/financial/inventory-closing-stock', {
        params: { as_of_date: asOfDate }
      });
      setData(response.data);
      // Expand all departments by default
      const depts = new Set<string>(response.data.items.map((i: InventoryItem) => i.category_name));
      setExpandedDepts(depts);
    } catch (error) {
      console.error('Failed to load closing stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  // Group items by department
  const deptSummaries: DeptSummary[] = useMemo(() => {
    if (!data?.items) return [];
    const map = new Map<string, InventoryItem[]>();
    for (const item of data.items as InventoryItem[]) {
      const dept = item.category_name || 'Uncategorized';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(item);
    }
    return Array.from(map.entries()).map(([department, items]) => ({
      department,
      items,
      total_qty: items.reduce((s, i) => s + i.closing_quantity, 0),
      total_value: items.reduce((s, i) => s + i.closing_value, 0),
      total_cost_value: items.reduce((s, i) => s + i.closing_value_cost, 0),
      low_stock: items.filter(i => i.stock_status === 'Low Stock').length,
      out_of_stock: items.filter(i => i.stock_status === 'Out of Stock').length,
    }));
  }, [data]);

  const handleExportExcel = () => {
    if (!data) return;
    const rows: any[] = [];
    deptSummaries.forEach(dept => {
      rows.push({
        'Department': dept.department.toUpperCase() + ' — TOTAL',
        'Item Name': '',
        'Closing Qty': dept.total_qty.toFixed(2),
        'Unit': '',
        'Cost Price (KES)': '',
        'Selling Price (KES)': '',
        'Value at Cost (KES)': dept.total_cost_value.toFixed(2),
        'Value at Selling (KES)': dept.total_value.toFixed(2),
        'Status': '',
      });
      dept.items.forEach(item => {
        rows.push({
          'Department': dept.department,
          'Item Name': item.name,
          'Closing Qty': item.closing_quantity.toFixed(2),
          'Unit': item.unit,
          'Cost Price (KES)': item.unit_cost,
          'Selling Price (KES)': item.selling_price,
          'Value at Cost (KES)': item.closing_value_cost,
          'Value at Selling (KES)': item.closing_value,
          'Status': item.stock_status,
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Closing Stock');
    XLSX.writeFile(workbook, `Inventory_Closing_Stock_${asOfDate}.xlsx`);
  };

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) return;

    const deptRows = deptSummaries.map(dept => `
      <tr style="background:#e8eaf6;font-weight:bold">
        <td colspan="2" style="padding:6px 8px;border:1px solid #ccc">${dept.department.toUpperCase()}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">${dept.total_qty.toFixed(2)}</td>
        <td style="padding:6px 8px;border:1px solid #ccc"></td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:right">KES ${dept.total_value.toLocaleString()}</td>
        <td style="padding:6px 8px;border:1px solid #ccc"></td>
      </tr>
      ${dept.items.map(item => `
      <tr>
        <td style="padding:5px 8px 5px 20px;border:1px solid #ccc;font-size:11px">${item.sku}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${item.name}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:right">${item.closing_quantity.toFixed(2)}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${item.unit}</td>
        <td style="padding:5px 8px;border:1px solid #ccc;text-align:right">KES ${item.closing_value.toLocaleString()}</td>
        <td style="padding:5px 8px;border:1px solid #ccc">${item.stock_status}</td>
      </tr>`).join('')}
    `).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Closing Stock</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}h2,h3{text-align:center}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#333;color:#fff;padding:8px;text-align:left}
      @media print{body{padding:10px}}</style></head><body>
      <h2>Premier Hotel</h2>
      <h3>Inventory Closing Stock</h3>
      <p style="text-align:center;color:#666">As of ${format(new Date(asOfDate), 'dd/MM/yyyy')}</p>
      <table><thead><tr>
        <th>SKU</th><th>Item Name</th><th style="text-align:right">Closing Qty</th>
        <th>Unit</th><th style="text-align:right">Closing Value</th><th>Status</th>
      </tr></thead><tbody>
      ${deptRows}
      <tr style="background:#e8f5e9;font-weight:bold">
        <td colspan="2" style="padding:8px;border:1px solid #ccc">GRAND TOTAL</td>
        <td style="padding:8px;border:1px solid #ccc;text-align:right">${data.summary.total_items} items</td>
        <td style="padding:8px;border:1px solid #ccc"></td>
        <td style="padding:8px;border:1px solid #ccc;text-align:right">KES ${data.summary.total_value.toLocaleString()}</td>
        <td style="padding:8px;border:1px solid #ccc"></td>
      </tr>
      </tbody></table>
      <p style="text-align:center;font-size:10px;margin-top:20px;color:#888">Generated: ${new Date().toLocaleString()}</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
      </body></html>`);
    win.document.close();
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      Loading inventory...
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      No data available.
    </div>
  );

  const { summary } = data;
  const today = new Date().toISOString().split('T')[0];
  const isHistorical = asOfDate !== today;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle>Inventory Closing Stock Report</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Stock position as of {format(new Date(asOfDate), 'MMM dd, yyyy')}
                {data.has_stocktake && (
                  <span className="ml-2 text-emerald-600 font-medium">· Based on physical stock take</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Historical data banner */}
          {isHistorical && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm border
              ${data.has_stocktake
                ? 'bg-emerald-500/10 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-200 text-amber-800 dark:text-amber-300'}`}>
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                {data.has_stocktake
                  ? <>Quantities are from the <strong>physical stock take</strong> submitted on {format(new Date(asOfDate), 'dd/MM/yyyy')} — exact counts.</>
                  : <>No stock take was submitted for this date. Quantities are <strong>reconstructed</strong> from current stock by reversing all sales, receipts, and adjustments that occurred after {format(new Date(asOfDate), 'dd/MM/yyyy')}. For exact historical values, ensure daily stock takes are submitted.</>
                }
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">KES {summary.total_value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Stock Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{summary.total_items}</div>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{summary.low_stock_items}</div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{summary.out_of_stock_items}</div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
              </CardContent>
            </Card>
          </div>

          {/* Department Summary + Drill-down Table */}
          {deptSummaries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No inventory items found.</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="text-left px-3 py-2 w-1/2">Department / Item</th>
                      <th className="text-right px-3 py-2 w-28">Closing Qty</th>
                      <th className="text-left px-3 py-2 w-16">Unit</th>
                      <th className="text-right px-3 py-2">Closing Value</th>
                      <th className="text-center px-3 py-2 w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptSummaries.map((dept) => (
                      <React.Fragment key={dept.department}>
                        {/* Department row */}
                        <tr
                          className="bg-indigo-50 hover:bg-indigo-100 cursor-pointer select-none"
                          onClick={() => toggleDept(dept.department)}
                        >
                          <td className="px-3 py-2 font-bold flex items-center gap-1">
                            {expandedDepts.has(dept.department)
                              ? <ChevronDown className="h-4 w-4 text-indigo-600 shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-indigo-600 shrink-0" />}
                            <span className="text-indigo-400">{dept.department.toUpperCase()}</span>
                            {dept.low_stock > 0 && (
                              <Badge className="ml-2 text-xs bg-yellow-500">{dept.low_stock} low</Badge>
                            )}
                            {dept.out_of_stock > 0 && (
                              <Badge className="ml-1 text-xs" variant="destructive">{dept.out_of_stock} out</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-400">
                            {dept.total_qty.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-indigo-400 text-xs">{dept.items.length} items</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-400">
                            KES {dept.total_value.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-indigo-400">
                            {dept.items.length} SKUs
                          </td>
                        </tr>

                        {/* Item rows */}
                        {expandedDepts.has(dept.department) &&
                          dept.items.map((item, ii) => (
                            <tr
                              key={item.item_id}
                              className={`border-t border-border ${ii % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                            >
                              <td className="px-3 py-1.5 pl-8 text-foreground">
                                <span className="font-medium">{item.name}</span>
                                {item.sku && (
                                  <span className="ml-2 text-xs text-muted-foreground font-mono">{item.sku}</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right font-semibold text-foreground">
                                {item.closing_quantity.toFixed(2)}
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{item.unit}</td>
                              <td className="px-3 py-1.5 text-right text-foreground">
                                KES {item.closing_value.toLocaleString()}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {item.stock_status === 'Out of Stock' && (
                                  <Badge variant="destructive" className="flex items-center gap-1 w-fit mx-auto text-xs">
                                    <XCircle className="h-3 w-3" />
                                    Out
                                  </Badge>
                                )}
                                {item.stock_status === 'Low Stock' && (
                                  <Badge className="flex items-center gap-1 w-fit mx-auto bg-yellow-500 text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    Low
                                  </Badge>
                                )}
                                {item.stock_status === 'In Stock' && (
                                  <Badge className="flex items-center gap-1 w-fit mx-auto bg-green-500 text-xs">
                                    <CheckCircle className="h-3 w-3" />
                                    OK
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}

                    {/* Grand total */}
                    <tr className="bg-green-500/10 border-t-2 border-green-500/30">
                      <td className="px-3 py-2 font-bold text-green-500">
                        GRAND TOTAL — {deptSummaries.length} departments
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-500">
                        {deptSummaries.reduce((s, d) => s + d.total_qty, 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-green-500">{summary.total_items} items</td>
                      <td className="px-3 py-2 text-right font-bold text-green-500">
                        KES {summary.total_value.toLocaleString()}
                      </td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Click a department row to expand/collapse its items.
                Closing quantity is calculated by reversing all movements after {format(new Date(asOfDate), 'dd/MM/yyyy')} 11:59 PM.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
