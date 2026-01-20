import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Clock, Star } from 'lucide-react';

interface DailyStats {
  itemsPrepared: number;
  avgPrepTime: number;
  peakHours: string[];
  topItems: Array<{ name: string; count: number }>;
  prepTimesByItem: Array<{ name: string; avgTime: number; trend: 'up' | 'down' | 'stable' }>;
}

const mockStats: DailyStats = {
  itemsPrepared: 47,
  avgPrepTime: 18,
  peakHours: ['12:00 PM - 2:00 PM', '6:00 PM - 8:00 PM'],
  topItems: [
    { name: 'Burger & Fries', count: 12 },
    { name: 'Margherita Pizza', count: 9 },
    { name: 'Caesar Salad', count: 8 },
    { name: 'Grilled Salmon', count: 6 },
    { name: 'Pasta Carbonara', count: 5 }
  ],
  prepTimesByItem: [
    { name: 'Burger', avgTime: 12, trend: 'down' },
    { name: 'Pizza', avgTime: 20, trend: 'stable' },
    { name: 'Salad', avgTime: 8, trend: 'up' },
    { name: 'Salmon', avgTime: 15, trend: 'stable' }
  ]
};

export function DailyReporting() {
  const stats = mockStats;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Items Prepared</CardDescription>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.itemsPrepared}</div>
            <p className="text-xs text-muted-foreground mt-1">Today's total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Avg Prep Time</CardDescription>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.avgPrepTime}m</div>
            <p className="text-xs text-muted-foreground mt-1">Average duration</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm">Peak Hours</CardDescription>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.peakHours.map((hour, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                  {hour}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Busiest periods</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Top Items Today
          </CardTitle>
          <CardDescription>Most frequently prepared dishes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.count} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{item.count}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prep Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Preparation Time Analysis
          </CardTitle>
          <CardDescription>Average prep times and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.prepTimesByItem.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold text-base">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Average time</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{item.avgTime}m</p>
                  </div>
                  <div className="w-16">
                    {item.trend === 'up' && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Slower
                      </Badge>
                    )}
                    {item.trend === 'down' && (
                      <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                        <TrendingUp className="h-3 w-3 rotate-180" />
                        Faster
                      </Badge>
                    )}
                    {item.trend === 'stable' && (
                      <Badge variant="secondary">
                        Stable
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
