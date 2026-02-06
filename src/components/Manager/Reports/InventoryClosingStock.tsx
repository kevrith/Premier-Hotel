import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';
import * as XLSX from 'xlsx';

export const InventoryClosingStock: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      console.error('Failed to load closing stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    
    const exportData = data.items.map((item: any) => ({
      'SKU': item.sku,
      'Item Name': item.name,
      'Category': item.category_name,
      'Closing Quantity': item.closing_quantity,
      'Unit': item.unit,
      'Unit Cost (KES)': item.unit_cost,
      'Closing Value (KES)': item.closing_value,
      'Status': item.stock_status,
      'Min Quantity': item.min_quantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Closing Stock');
    XLSX.writeFile(workbook, `Inventory_Closing_Stock_${asOfDate}.xlsx`);
  };

  if (!data) return <div>Loading...</div>;

  const { summary, items } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventory Closing Stock Report</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Stock position as of {format(new Date(asOfDate), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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

          {/* Items Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Closing Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Closing Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any) => (
                    <TableRow key={item.item_id}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm">{item.category_name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.closing_quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">{item.unit}</TableCell>
                      <TableCell className="text-right">
                        KES {item.unit_cost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {item.closing_value.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {item.stock_status === 'Out of Stock' && (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Out of Stock
                          </Badge>
                        )}
                        {item.stock_status === 'Low Stock' && (
                          <Badge variant="default" className="flex items-center gap-1 w-fit bg-yellow-500">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        )}
                        {item.stock_status === 'In Stock' && (
                          <Badge variant="default" className="flex items-center gap-1 w-fit bg-green-500">
                            <CheckCircle className="h-3 w-3" />
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer Note */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="font-semibold text-blue-900">Note:</p>
            <p className="text-blue-800">
              This report shows the calculated closing stock as of {format(new Date(asOfDate), 'MMM dd, yyyy')} at 11:59 PM.
              The closing quantity is calculated by reversing all stock movements that occurred after this date.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
