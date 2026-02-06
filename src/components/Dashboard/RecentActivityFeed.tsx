import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, BedDouble, Utensils, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';

interface Activity {
  id: string;
  type: 'booking' | 'order' | 'task' | 'payment';
  action: string;
  user: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
}

export function RecentActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const [bookings, orders] = await Promise.all([
        apiClient.get('/bookings/', { params: { limit: 5 } }).catch(() => ({ data: [] })),
        apiClient.get('/orders/', { params: { limit: 5 } }).catch(() => ({ data: [] }))
      ]);

      const allActivities: Activity[] = [
        ...bookings.data.slice(0, 5).map((b: any) => ({
          id: b.id,
          type: 'booking' as const,
          action: `New booking for Room ${b.room_number || b.room_id}`,
          user: b.customer_name || 'Guest',
          timestamp: b.created_at,
          status: b.status === 'confirmed' ? 'success' as const : 'pending' as const
        })),
        ...orders.data.slice(0, 5).map((o: any) => ({
          id: o.id,
          type: 'order' as const,
          action: `Order #${o.id.slice(0, 8)}`,
          user: o.customer_name || 'Guest',
          timestamp: o.created_at,
          status: (o.status === 'delivered' || o.status === 'completed') ? 'success' as const : 'pending' as const
        }))
      ];

      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return <BedDouble className="h-4 w-4" />;
      case 'order': return <Utensils className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-lg sm:text-xl">Recent Activity</span>
          <Button variant="ghost" size="sm" onClick={fetchActivities} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">No recent activity</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2 sm:gap-3 pb-3 border-b last:border-0">
                <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                  activity.type === 'booking' ? 'bg-blue-100' :
                  activity.type === 'order' ? 'bg-green-100' :
                  'bg-purple-100'
                }`}>
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{activity.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.user}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant={activity.status === 'success' ? 'default' : 'secondary'} className="text-xs">
                    {activity.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
