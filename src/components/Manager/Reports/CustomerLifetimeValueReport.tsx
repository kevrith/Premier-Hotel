import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/Dashboard/ExportButton';
import axios from 'axios';

export function CustomerLifetimeValueReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [limit, setLimit] = useState(50);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/financial-statements/customer-lifetime-value`,
        {
          params: { limit },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching CLV report:', error);
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
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Lifetime Value Report
          </CardTitle>
          <CardDescription>Identify your most valuable customers and their spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Show Top</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-input px-3 py-2"
              >
                <option value={25}>25 Customers</option>
                <option value={50}>50 Customers</option>
                <option value={100}>100 Customers</option>
                <option value={200}>200 Customers</option>
              </select>
            </div>
            <Button onClick={fetchReport}>Generate Report</Button>
            {data && (
              <ExportButton
                title="Customer Lifetime Value Report"
                data={data.customers}
                columns={['name', 'email', 'lifetime_value', 'transaction_count', 'avg_transaction', 'first_purchase', 'last_purchase']}
                filename={`customer_clv_report.xlsx`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_customers}</div>
            <p className="text-xs text-muted-foreground mt-1">With completed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total CLV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {data.summary.total_clv.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Combined lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average CLV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {data.summary.avg_clv.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Lifetime Value</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Lifetime Value</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Avg Transaction</TableHead>
                <TableHead>First Purchase</TableHead>
                <TableHead>Last Purchase</TableHead>
                <TableHead>Customer Days</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.customers.map((customer: any, index: number) => {
                let tier = 'Bronze';
                let tierColor = 'secondary';
                if (customer.lifetime_value >= 100000) {
                  tier = 'Platinum';
                  tierColor = 'default';
                } else if (customer.lifetime_value >= 50000) {
                  tier = 'Gold';
                  tierColor = 'default';
                } else if (customer.lifetime_value >= 20000) {
                  tier = 'Silver';
                  tierColor = 'outline';
                }

                return (
                  <TableRow key={customer.user_id}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.email}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      KES {customer.lifetime_value.toLocaleString()}
                    </TableCell>
                    <TableCell>{customer.transaction_count}</TableCell>
                    <TableCell>KES {customer.avg_transaction.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{customer.first_purchase}</TableCell>
                    <TableCell className="text-sm">{customer.last_purchase}</TableCell>
                    <TableCell>{customer.customer_lifetime_days} days</TableCell>
                    <TableCell>
                      <Badge variant={tierColor as any}>{tier}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
