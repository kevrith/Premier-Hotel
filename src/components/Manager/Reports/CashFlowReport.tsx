import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';

export const CashFlowReport: React.FC = () => {
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
      const response = await api.get('/financial/cash-flow', {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load cash flow:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <div>Loading...</div>;

  const { cash_inflows, cash_outflows, net_cash_flow } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Cash Flow Report</CardTitle>
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
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cash Inflows */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-lg">Cash Inflows</h3>
              </div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>M-Pesa</TableCell>
                    <TableCell className="text-right text-green-600">
                      KES {cash_inflows.by_method.mpesa.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cash</TableCell>
                    <TableCell className="text-right text-green-600">
                      KES {cash_inflows.by_method.cash.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Card</TableCell>
                    <TableCell className="text-right text-green-600">
                      KES {cash_inflows.by_method.card.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-green-50">
                    <TableCell>Total Inflows</TableCell>
                    <TableCell className="text-right text-green-600">
                      KES {cash_inflows.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Cash Outflows */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpCircle className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-lg">Cash Outflows</h3>
              </div>
              <Table>
                <TableBody>
                  {Object.entries(cash_outflows.by_category).map(([category, amount]: [string, any]) => (
                    <TableRow key={category}>
                      <TableCell className="capitalize">{category}</TableCell>
                      <TableCell className="text-right text-red-600">
                        KES {amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-red-50">
                    <TableCell>Total Outflows</TableCell>
                    <TableCell className="text-right text-red-600">
                      KES {cash_outflows.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Net Cash Flow */}
          <div className="mt-6 border-t-2 pt-4">
            <Card className={net_cash_flow >= 0 ? 'bg-green-50' : 'bg-red-50'}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xl">Net Cash Flow</h3>
                  <div className={`text-2xl font-bold ${net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    KES {net_cash_flow.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
