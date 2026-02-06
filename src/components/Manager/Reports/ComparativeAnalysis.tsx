import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api/client';

export const ComparativeAnalysis: React.FC = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [compareTo, setCompareTo] = useState('previous_period');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [startDate, endDate, compareTo]);

  const loadData = async () => {
    try {
      const response = await api.get('/financial/comparative-analysis', {
        params: { current_start: startDate, current_end: endDate, compare_to: compareTo }
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load comparative analysis:', error);
    }
  };

  if (!data) return <div>Loading...</div>;

  const { current_period, previous_period, comparison } = data;

  const MetricCard = ({ title, current, previous, change, changePct }: any) => {
    const isPositive = change > 0;
    const isNegative = change < 0;

    return (
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-2xl font-bold">KES {current.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
            }`}>
              {isPositive && <TrendingUp className="h-4 w-4" />}
              {isNegative && <TrendingDown className="h-4 w-4" />}
              {!isPositive && !isNegative && <Minus className="h-4 w-4" />}
              {changePct.toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Previous: KES {previous.toLocaleString()}
            <span className={`ml-2 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}`}>
              ({isPositive ? '+' : ''}{change.toLocaleString()})
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Comparative Analysis</CardTitle>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              <Select value={compareTo} onValueChange={setCompareTo}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous_period">vs Previous Period</SelectItem>
                  <SelectItem value="previous_year">vs Previous Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <MetricCard
              title="Total Revenue"
              current={current_period.revenue}
              previous={previous_period.revenue}
              change={comparison.revenue_change}
              changePct={comparison.revenue_change_pct}
            />
            <MetricCard
              title="Total Bookings"
              current={current_period.bookings}
              previous={previous_period.bookings}
              change={comparison.bookings_change}
              changePct={comparison.bookings_change_pct}
            />
            <MetricCard
              title="Total Orders"
              current={current_period.orders}
              previous={previous_period.orders}
              change={comparison.orders_change}
              changePct={comparison.orders_change_pct}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Current Period</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(current_period.start), 'MMM dd, yyyy')} - {format(new Date(current_period.end), 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Comparison Period</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(previous_period.start), 'MMM dd, yyyy')} - {format(new Date(previous_period.end), 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
