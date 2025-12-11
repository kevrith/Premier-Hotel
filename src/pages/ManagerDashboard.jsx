import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Users,
  BedDouble,
  Utensils,
  TrendingUp,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Star,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const mockAnalytics = {
  todayRevenue: 125000,
  weekRevenue: 750000,
  monthRevenue: 2450000,
  occupancyToday: 82,
  activeStaff: 18,
  pendingTasks: 7,
  customerSatisfaction: 4.7
};

const mockStaffPerformance = [
  { id: '1', name: 'Chef Mario', role: 'chef', tasksCompleted: 45, rating: 4.8, status: 'active' },
  { id: '2', name: 'Waiter Tom', role: 'waiter', tasksCompleted: 62, rating: 4.6, status: 'active' },
  { id: '3', name: 'Cleaner Sarah', role: 'cleaner', tasksCompleted: 38, rating: 4.9, status: 'active' },
  { id: '4', name: 'Waiter Jane', role: 'waiter', tasksCompleted: 55, rating: 4.5, status: 'on-break' }
];

const mockPendingTasks = [
  { id: '1', task: 'Room 305 maintenance check', assignedTo: 'Cleaner Sarah', priority: 'high', deadline: '2 hours' },
  { id: '2', task: 'Kitchen inventory restock', assignedTo: 'Chef Mario', priority: 'medium', deadline: '4 hours' },
  { id: '3', task: 'Guest complaint resolution - Room 201', assignedTo: 'Waiter Tom', priority: 'urgent', deadline: '30 mins' }
];

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated || (role !== 'manager' && role !== 'admin')) {
      toast.error('Access denied. Manager privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'manager' && role !== 'admin')) {
    return null;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'text-primary' }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Manage operations and staff performance.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Today's Revenue"
            value={`KES ${mockAnalytics.todayRevenue.toLocaleString()}`}
            subtitle={`Month: KES ${mockAnalytics.monthRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="text-green-500"
          />
          <StatCard
            title="Occupancy Rate"
            value={`${mockAnalytics.occupancyToday}%`}
            subtitle="22 rooms occupied today"
            icon={BedDouble}
            color="text-blue-500"
          />
          <StatCard
            title="Active Staff"
            value={mockAnalytics.activeStaff}
            subtitle="On duty right now"
            icon={UserCheck}
            color="text-purple-500"
          />
          <StatCard
            title="Pending Tasks"
            value={mockAnalytics.pendingTasks}
            subtitle="Requires attention"
            icon={Clock}
            color="text-orange-500"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pending Tasks */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Pending Tasks</CardTitle>
                  <CardDescription>Tasks requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockPendingTasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{task.task}</p>
                            <Badge variant={
                              task.priority === 'urgent' ? 'destructive' :
                              task.priority === 'high' ? 'default' :
                              'secondary'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Assigned to: {task.assignedTo}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due in: {task.deadline}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm">Resolve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Today's Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Summary</CardTitle>
                  <CardDescription>Daily operations overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Check-ins</span>
                    </div>
                    <span className="font-semibold">12 guests</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Check-outs</span>
                    </div>
                    <span className="font-semibold">8 guests</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Meal Orders</span>
                    </div>
                    <span className="font-semibold">47 orders</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Avg Rating</span>
                    </div>
                    <span className="font-semibold">{mockAnalytics.customerSatisfaction}★</span>
                  </div>
                </CardContent>
              </Card>

              {/* Staff Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff Status</CardTitle>
                  <CardDescription>Current staff availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chefs</span>
                    <Badge className="bg-green-500">3 / 3 active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Waiters</span>
                    <Badge className="bg-green-500">5 / 6 active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cleaners</span>
                    <Badge className="bg-green-500">4 / 4 active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reception</span>
                    <Badge className="bg-green-500">2 / 2 active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance</CardTitle>
                <CardDescription>Monitor and manage staff productivity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockStaffPerformance.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{staff.role}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{staff.status}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {staff.tasksCompleted} tasks completed
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{staff.rating}</span>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Room Status</CardTitle>
                  <CardDescription>Current room availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Occupied</span>
                    <Badge className="bg-red-500">22 rooms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Available</span>
                    <Badge className="bg-green-500">8 rooms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cleaning</span>
                    <Badge className="bg-yellow-500">3 rooms</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Maintenance</span>
                    <Badge className="bg-orange-500">1 room</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kitchen Operations</CardTitle>
                  <CardDescription>Current order status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Pending Orders</span>
                    <Badge>12 orders</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>In Progress</span>
                    <Badge className="bg-blue-500">8 orders</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed Today</span>
                    <Badge className="bg-green-500">47 orders</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Avg Prep Time</span>
                    <Badge variant="outline">18 mins</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>Financial performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Today</p>
                      <p className="text-2xl font-bold">KES {mockAnalytics.todayRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>+8.5% from yesterday</span>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">This Week</p>
                      <p className="text-2xl font-bold">KES {mockAnalytics.weekRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>+12.3% from last week</span>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">This Month</p>
                      <p className="text-2xl font-bold">KES {mockAnalytics.monthRevenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>+15.7% from last month</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-muted rounded-lg text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-semibold mb-2">Detailed Analytics Coming Soon</p>
                    <p className="text-sm text-muted-foreground">
                      Advanced charts and reports will be available here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
