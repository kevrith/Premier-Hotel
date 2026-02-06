import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Printer, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';

export const VATReport: React.FC = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      const response = await api.get('/financial/vat-report', {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load VAT report:', error);
    }
  };

  if (!data) return <div>Loading...</div>;

  const { output_vat, input_vat, net_vat_payable, vat_rate } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>VAT Report (Kenya - 16%)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Output VAT (Sales) */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              OUTPUT VAT (Sales)
              <span className="text-sm font-normal text-muted-foreground">VAT Collected</span>
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Room Revenue</TableCell>
                  <TableCell className="text-right">KES {output_vat.room_revenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>F&B Revenue</TableCell>
                  <TableCell className="text-right">KES {output_vat.fb_revenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="font-semibold">
                  <TableCell>Total Sales (Incl. VAT)</TableCell>
                  <TableCell className="text-right">KES {output_vat.total_sales_incl_vat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Sales (Excl. VAT)</TableCell>
                  <TableCell className="text-right">KES {output_vat.total_sales_excl_vat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-green-50">
                  <TableCell>Output VAT @ {(vat_rate * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right text-green-600">KES {output_vat.output_vat.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Input VAT (Purchases) */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              INPUT VAT (Purchases)
              <span className="text-sm font-normal text-muted-foreground">VAT Paid</span>
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Total Purchases (Incl. VAT)</TableCell>
                  <TableCell className="text-right">KES {input_vat.total_purchases_incl_vat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Purchases (Excl. VAT)</TableCell>
                  <TableCell className="text-right">KES {input_vat.total_purchases_excl_vat.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-blue-50">
                  <TableCell>Input VAT @ {(vat_rate * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right text-blue-600">KES {input_vat.input_vat.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Net VAT Payable */}
          <div className="border-t-2 pt-4">
            <Card className={net_vat_payable >= 0 ? 'bg-red-50' : 'bg-green-50'}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl">NET VAT PAYABLE TO KRA</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {net_vat_payable >= 0 ? 'Amount to pay' : 'VAT Refund due'}
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${net_vat_payable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    KES {Math.abs(net_vat_payable).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Important Notice */}
          <div className="flex items-start gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900">Important:</p>
              <p className="text-yellow-800">
                This report is for internal use. Please consult with your accountant before filing VAT returns with KRA.
                VAT returns must be filed by the 20th of the following month.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
