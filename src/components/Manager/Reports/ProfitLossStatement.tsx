import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';

export const ProfitLossStatement: React.FC = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/financial/profit-loss', {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load P&L:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (!data) return <div>Loading...</div>;

  const { revenue, cogs, operating_expenses, profit } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Revenue</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Room Revenue</TableCell>
                    <TableCell className="text-right">KES {revenue.room_revenue.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Food & Beverage Revenue</TableCell>
                    <TableCell className="text-right">KES {revenue.fb_revenue.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted">
                    <TableCell>Total Revenue</TableCell>
                    <TableCell className="text-right">KES {revenue.total_revenue.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* COGS Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Cost of Goods Sold</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Inventory Usage</TableCell>
                    <TableCell className="text-right text-red-600">
                      (KES {cogs.total_cogs.toLocaleString()})
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-green-50">
                    <TableCell>Gross Profit</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      KES {cogs.gross_profit.toLocaleString()}
                      <span className="text-sm text-muted-foreground">({cogs.gross_margin.toFixed(1)}%)</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Operating Expenses */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Operating Expenses</h3>
              <Table>
                <TableBody>
                  {Object.entries(operating_expenses.by_category).map(([category, amount]: [string, any]) => (
                    <TableRow key={category}>
                      <TableCell className="capitalize">{category}</TableCell>
                      <TableCell className="text-right text-red-600">
                        (KES {amount.toLocaleString()})
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell>Total Operating Expenses</TableCell>
                    <TableCell className="text-right text-red-600">
                      (KES {operating_expenses.total_expenses.toLocaleString()})
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Net Profit */}
            <div className="border-t-2 pt-4">
              <Table>
                <TableBody>
                  <TableRow className="font-bold text-lg">
                    <TableCell>Net Profit</TableCell>
                    <TableCell className={`text-right flex items-center justify-end gap-2 ${profit.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit.net_profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      KES {profit.net_profit.toLocaleString()}
                      <span className="text-sm text-muted-foreground">({profit.net_margin.toFixed(1)}%)</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
