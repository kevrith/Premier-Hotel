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
  UserCheck,
  UserCog
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StaffManagement } from '@/components/Manager/StaffManagement';
import { DailySalesReport } from '@/components/Manager/Reports/DailySalesReport';
import { EmployeeSalesReport } from '@/components/Manager/Reports/EmployeeSalesReport';
import { PendingModifications } from '@/components/Manager/OrderManagement/PendingModifications';
import { SalesAnalytics } from '@/components/Manager/Analytics/SalesAnalytics';
import { EmployeePerformance } from '@/components/Manager/Analytics/EmployeePerformance';
import { useStaffStats } from '@/hooks/useStaffStats';
import { useRevenueStats } from '@/hooks/useRevenueStats';
import { usePendingTasks } from '@/hooks/usePendingTasks';
import { useDailyStats } from '@/hooks/useDailyStats';
import { useOperationsData } from '@/hooks/useOperationsData';
import { useStaffPerformance } from '@/hooks/useStaffPerformance';
import { useDebugData } from '@/hooks/useDebugData';
import { SystemHealth } from '@/components/Manager/SystemHealth';
import { EnhancedUserManagement } from '@/components/Manager/EnhancedUserManagement';
import { ContentManagement } from '@/components/Manager/ContentManagement';
import { InventoryManagement } from '@/components/Manager/InventoryManagement';


export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const { stats: staffStats, isLoading: statsLoading } = useStaffStats();
  const { stats: revenueStats, isLoading: revenueLoading } = useRevenueStats();
  const { tasks: pendingTasks, isLoading: tasksLoading } = usePendingTasks();
  const { stats: dailyStats, isLoading: dailyLoading } = useDailyStats();
  const { roomStats, kitchenStats, isLoading: operationsLoading } = useOperationsData();
  const { performance: staffPerformance, isLoading: performanceLoading } = useStaffPerformance();
  const debugData = useDebugData();

  useEffect(() => {
    if (!isAuthenticated || (role !== 'manager' && role !== 'admin')) {
      toast.error('Access denied. Manager privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'manager' && role !== 'admin')) {
    return null;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'text-primary' }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  }) => (
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
            Welcome back, {user?.full_name || 'Manager'}! Manage operations and staff performance.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Today's Revenue"
            value={revenueLoading ? '...' : `KES ${revenueStats.todayRevenue.toLocaleString()}`}
            subtitle={`Month: KES ${revenueLoading ? '...' : revenueStats.monthRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="text-green-500"
          />
          <StatCard
            title="Occupancy Rate"
            value={revenueLoading ? '...' : `${revenueStats.occupancyToday}%`}
            subtitle="Rooms occupied today"
            icon={BedDouble}
            color="text-blue-500"
          />
          <StatCard
            title="Active Staff"
            value={statsLoading ? '...' : staffStats.activeStaff}
            subtitle={`Total: ${statsLoading ? '...' : staffStats.totalStaff} staff members`}
            icon={UserCheck}
            color="text-purple-500"
          />
          <StatCard
            title="Pending Tasks"
            value={tasksLoading ? '...' : pendingTasks.length}
            subtitle="Requires attention"
            icon={Clock}
            color="text-orange-500"
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="manage-staff">Manage Staff</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="financial-reports">Financial Reports</TabsTrigger>
            <TabsTrigger value="order-management">Order Management</TabsTrigger>
            <TabsTrigger value="system-health">System Health</TabsTrigger>
            <TabsTrigger value="content-management">Content Management</TabsTrigger>
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
                  {tasksLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading tasks...</p>
                    </div>
                  ) : pendingTasks.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-muted-foreground">No pending tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingTasks.map((task) => (
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
                              Due: {task.deadline}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">View</Button>
                            <Button size="sm">Resolve</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <span className="font-semibold">{dailyLoading ? '...' : `${dailyStats.checkIns} guests`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Check-outs</span>
                    </div>
                    <span className="font-semibold">{dailyLoading ? '...' : `${dailyStats.checkOuts} guests`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Meal Orders</span>
                    </div>
                    <span className="font-semibold">{dailyLoading ? '...' : `${dailyStats.mealOrders} orders`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Avg Rating</span>
                    </div>
                    <span className="font-semibold">{dailyLoading ? '...' : `${dailyStats.avgRating || 0}★`}</span>
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
                    <Badge className="bg-green-500">
                      {statsLoading ? '...' : `${staffStats.staffByRole.chef} active`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Waiters</span>
                    <Badge className="bg-green-500">
                      {statsLoading ? '...' : `${staffStats.staffByRole.waiter} active`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cleaners</span>
                    <Badge className="bg-green-500">
                      {statsLoading ? '...' : `${staffStats.staffByRole.cleaner} active`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Hires</span>
                    <Badge variant="outline">
                      {statsLoading ? '...' : `${staffStats.recentHires} this month`}
                    </Badge>
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
                {performanceLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Loading staff performance...</p>
                  </div>
                ) : staffPerformance.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No staff performance data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffPerformance.map((staff) => (
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
                              {staff.evaluationDate && (
                                <span className="text-xs text-muted-foreground">
                                  Last eval: {new Date(staff.evaluationDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {staff.strengths && (
                              <p className="text-xs text-green-600 mt-1">
                                Strengths: {staff.strengths}
                              </p>
                            )}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Staff Tab */}
          <TabsContent value="manage-staff" className="space-y-6">
            <StaffManagement />
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
                    <Badge className="bg-red-500">{operationsLoading ? '...' : `${roomStats.occupied} rooms`}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Available</span>
                    <Badge className="bg-green-500">{operationsLoading ? '...' : `${roomStats.available} rooms`}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cleaning</span>
                    <Badge className="bg-yellow-500">{operationsLoading ? '...' : `${roomStats.cleaning} rooms`}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Maintenance</span>
                    <Badge className="bg-orange-500">{operationsLoading ? '...' : `${roomStats.maintenance} rooms`}</Badge>
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
                    <Badge>{operationsLoading ? '...' : `${kitchenStats.pendingOrders} orders`}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>In Progress</span>
                    <Badge className="bg-blue-500">{operationsLoading ? '...' : `${kitchenStats.inProgress} orders`}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed Today</span>
                    <Badge className="bg-green-500">{operationsLoading ? '...' : `${kitchenStats.completedToday} orders`}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Avg Prep Time</span>
                    <Badge variant="outline">{operationsLoading ? '...' : `${kitchenStats.avgPrepTime} mins`}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Reports Tab */}
          <TabsContent value="financial-reports" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Reports</CardTitle>
                    <CardDescription>Comprehensive financial analysis and reporting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Today's Revenue</p>
                          <p className="text-2xl font-bold">KES {revenueLoading ? '...' : revenueStats.todayRevenue.toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Live data</span>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">This Week</p>
                          <p className="text-2xl font-bold">KES {revenueLoading ? '...' : revenueStats.weekRevenue.toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Live data</span>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">This Month</p>
                          <p className="text-2xl font-bold">KES {revenueLoading ? '...' : revenueStats.monthRevenue.toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Live data</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <DailySalesReport />
                        <EmployeeSalesReport />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Order Management Tab */}
          <TabsContent value="order-management" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Management</CardTitle>
                    <CardDescription>Order modifications, voids, and audit trails</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PendingModifications />
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Analytics</CardTitle>
                    <CardDescription>Sales analytics, performance metrics, and insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <SalesAnalytics />
                      <EmployeePerformance />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system-health" className="space-y-6">
            <SystemHealth />
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content-management" className="space-y-6">
            <ContentManagement />
          </TabsContent>

          {/* Analytics Tab (Legacy) */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Reports</CardTitle>
                    <CardDescription>Comprehensive financial analysis and reporting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Today's Revenue</p>
                          <p className="text-2xl font-bold">KES {revenueLoading ? '...' : revenueStats.todayRevenue.toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Live data</span>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">This Week</p>
                          <p className="text-2xl font-bold">KES {revenueLoading ? '...' : revenueStats.weekRevenue.toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Live data</span>
                          </div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">This Month</p>
                          <p className="text-2xl font-bold">KES {revenueLoading ? '...' : revenueStats.monthRevenue.toLocaleString()}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Live data</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-2">
                        <DailySalesReport />
                        <EmployeeSalesReport />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Management</CardTitle>
                    <CardDescription>Order modifications, voids, and audit trails</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PendingModifications />
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Analytics</CardTitle>
                    <CardDescription>Sales analytics, performance metrics, and insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <SalesAnalytics />
                      <EmployeePerformance />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
