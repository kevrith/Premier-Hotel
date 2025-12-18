import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, CreditCard, Bed, AlertTriangle, CheckCircle, Clock, Star } from 'lucide-react';

export function SystemOverview({ onStatsUpdate }) {
  const [kpis] = useState({
    totalRevenue: 458000,
    totalBookings: 234,
    occupancyRate: 87,
    avgRating: 4.8,
    newUsers: 45,
    systemUptime: 99.9
  });

  const [revenueData] = useState([
    { month: 'Jan', revenue: 45000, bookings: 120 },
    { month: 'Feb', revenue: 52000, bookings: 140 },
    { month: 'Mar', revenue: 48000, bookings: 125 },
    { month: 'Apr', revenue: 61000, bookings: 165 },
    { month: 'May', revenue: 55000, bookings: 150 },
    { month: 'Jun', revenue: 67000, bookings: 180 },
  ]);

  const [occupancyData] = useState([
    { name: 'Standard Rooms', value: 65, color: '#3b82f6' },
    { name: 'Deluxe Rooms', value: 45, color: '#10b981' },
    { name: 'Suites', value: 25, color: '#f59e0b' },
    { name: 'Presidential', value: 8, color: '#ef4444' }
  ]);

  const [systemHealth] = useState([
    { component: 'Database', status: 'healthy', uptime: 100 },
    { component: 'API Server', status: 'healthy', uptime: 99.8 },
    { component: 'Payment Gateway', status: 'healthy', uptime: 99.5 },
    { component: 'Email Service', status: 'warning', uptime: 98.2 },
    { component: 'File Storage', status: 'healthy', uptime: 99.9 }
  ]);

  const [userActivity] = useState([
    { hour: '00:00', active: 12 },
    { hour: '04:00', active: 8 },
    { hour: '08:00', active: 35 },
    { hour: '12:00', active: 65 },
    { hour: '16:00', active: 78 },
    { hour: '20:00', active: 45 },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Overview</h2>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Revenue (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {kpis.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-3 w-3" />
              +12.5% from last year
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.occupancyRate}%</div>
            <Progress value={kpis.occupancyRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgRating}/5.0</div>
            <div className="text-sm text-muted-foreground">Based on guest reviews</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Occupancy Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Room Occupancy Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {occupancyData.map((room, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: room.color }} />
                    <span className="text-sm">{room.name}</span>
                  </div>
                  <span className="text-sm font-medium">{room.value} rooms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium">{item.component}</div>
                      <div className="text-xs text-muted-foreground">Uptime: {item.uptime}%</div>
                    </div>
                  </div>
                  <Badge 
                    variant={item.status === 'healthy' ? 'default' : 'warning'}
                    className={`${getStatusColor(item.status)} text-white`}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={userActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="active" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent System Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { event: 'New booking created', time: '2 minutes ago', type: 'success' },
              { event: 'Payment processed successfully', time: '5 minutes ago', type: 'success' },
              { event: 'Email service delay detected', time: '12 minutes ago', type: 'warning' },
              { event: 'Menu item updated', time: '20 minutes ago', type: 'info' },
              { event: 'User registration completed', time: '30 minutes ago', type: 'success' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.type === 'success' ? 'bg-green-500' : 
                    activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm">{activity.event}</span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}