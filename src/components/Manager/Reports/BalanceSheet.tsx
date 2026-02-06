import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';

export const BalanceSheet: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [asOfDate]);

  const loadData = async () => {
    try {
      const response = await api.get('/financial/balance-sheet', { params: { as_of_date: asOfDate } });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load balance sheet:', error);
    }
  };

  if (!data) return <div>Loading...</div>;

  const { assets, liabilities, equity } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">As of {format(new Date(asOfDate), 'MMM dd, yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Assets */}
          <div>
            <h3 className="font-semibold text-lg mb-3">ASSETS</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-4">Cash & Bank</TableCell>
                  <TableCell className="text-right">KES {assets.current_assets.cash.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Inventory</TableCell>
                  <TableCell className="text-right">KES {assets.current_assets.inventory.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-4">Accounts Receivable</TableCell>
                  <TableCell className="text-right">KES {assets.current_assets.accounts_receivable.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="text-right">KES {assets.total_assets.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Liabilities */}
          <div>
            <h3 className="font-semibold text-lg mb-3">LIABILITIES</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-4">Accounts Payable</TableCell>
                  <TableCell className="text-right">KES {liabilities.current_liabilities.accounts_payable.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted">
                  <TableCell>Total Liabilities</TableCell>
                  <TableCell className="text-right">KES {liabilities.total_liabilities.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Equity */}
          <div className="border-t-2 pt-4">
            <h3 className="font-semibold text-lg mb-3">EQUITY</h3>
            <Table>
              <TableBody>
                <TableRow className="font-bold text-lg bg-blue-50">
                  <TableCell>Owner's Equity</TableCell>
                  <TableCell className="text-right text-blue-600">KES {equity.total_equity.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Verification */}
          <div className="text-sm text-muted-foreground text-center pt-4 border-t">
            Assets = Liabilities + Equity: {assets.total_assets.toLocaleString()} = {liabilities.total_liabilities.toLocaleString()} + {equity.total_equity.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
