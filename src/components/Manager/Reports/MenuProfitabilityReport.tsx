import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/Dashboard/ExportButton';
import axios from 'axios';

export function MenuProfitabilityReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/financial-statements/menu-profitability`,
        {
          params: { start_date: startDate, end_date: endDate },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching menu profitability:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Menu Item Profitability Report
          </CardTitle>
          <CardDescription>Analyze revenue, cost, and profit margins for each menu item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2"
              />
            </div>
            <Button onClick={fetchReport}>Generate Report</Button>
            {data && (
              <ExportButton
                title="Menu Profitability Report"
                data={data.items}
                columns={['name', 'category', 'quantity_sold', 'revenue', 'cost', 'profit', 'profit_margin']}
                filename={`menu_profitability_${startDate}_${endDate}.xlsx`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {data.summary.total_revenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">KES {data.summary.total_cost.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {data.summary.total_profit.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avg_profit_margin}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item Profitability Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty Sold</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item: any) => (
                <TableRow key={item.item_id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.quantity_sold}</TableCell>
                  <TableCell>KES {item.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-red-600">KES {item.cost.toLocaleString()}</TableCell>
                  <TableCell className={item.profit > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    KES {item.profit.toLocaleString()}
                  </TableCell>
                  <TableCell>{item.profit_margin}%</TableCell>
                  <TableCell>
                    {item.profit_margin >= 50 ? (
                      <Badge variant="default" className="bg-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        High
                      </Badge>
                    ) : item.profit_margin >= 30 ? (
                      <Badge variant="secondary">Good</Badge>
                    ) : item.profit_margin >= 0 ? (
                      <Badge variant="outline">Low</Badge>
                    ) : (
                      <Badge variant="destructive">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Loss
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
