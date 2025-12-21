import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  Hotel,
  DollarSign,
  TrendingUp,
  Calendar,
  Settings,
  BarChart3,
  UserCog,
  BedDouble,
  Utensils,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import MenuImport from '@/components/Admin/MenuImport';

// Mock data for admin dashboard
const mockStats = {
  totalRevenue: 2450000,
  todayRevenue: 85000,
  totalBookings: 342,
  activeBookings: 28,
  totalUsers: 1250,
  newUsersToday: 15,
  occupancyRate: 78,
  averageRating: 4.6
};

const mockRecentBookings = [
  {
    id: 'BK-001',
    customer: 'John Doe',
    room: '301 - Executive Suite',
    checkIn: '2025-12-12',
    checkOut: '2025-12-15',
    status: 'confirmed',
    amount: 54000
  },
  {
    id: 'BK-002',
    customer: 'Jane Smith',
    room: '205 - Deluxe Suite',
    checkIn: '2025-12-13',
    checkOut: '2025-12-14',
    status: 'pending',
    amount: 12000
  },
  {
    id: 'BK-003',
    customer: 'Mike Johnson',
    room: '102 - Standard Room',
    checkIn: '2025-12-11',
    checkOut: '2025-12-13',
    status: 'checked-in',
    amount: 10000
  }
];

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'customer', status: 'active', joinedDate: '2025-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'customer', status: 'active', joinedDate: '2025-02-20' },
  { id: '3', name: 'Chef Mario', email: 'mario@premier.com', role: 'chef', status: 'active', joinedDate: '2024-11-01' },
  { id: '4', name: 'Waiter Tom', email: 'tom@premier.com', role: 'waiter', status: 'active', joinedDate: '2024-12-10' }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || role !== 'admin') {
    return null;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}! Here's what's happening today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total Revenue"
            value={`KES ${mockStats.totalRevenue.toLocaleString()}`}
            subtitle={`+KES ${mockStats.todayRevenue.toLocaleString()} today`}
            icon={DollarSign}
            trend="up"
            trendValue="+12.5% from last month"
          />
          <StatCard
            title="Active Bookings"
            value={mockStats.activeBookings}
            subtitle={`${mockStats.totalBookings} total bookings`}
            icon={Calendar}
            trend="up"
            trendValue="+5.2% from last week"
          />
          <StatCard
            title="Total Users"
            value={mockStats.totalUsers}
            subtitle={`+${mockStats.newUsersToday} new today`}
            icon={Users}
            trend="up"
            trendValue="+8.1% from last month"
          />
          <StatCard
            title="Occupancy Rate"
            value={`${mockStats.occupancyRate}%`}
            subtitle={`${mockStats.averageRating}★ avg rating`}
            icon={Hotel}
            trend="up"
            trendValue="+3.2% from last week"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Bookings */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Latest room reservations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{booking.customer}</p>
                            <Badge variant={
                              booking.status === 'confirmed' ? 'default' :
                              booking.status === 'checked-in' ? 'success' :
                              'secondary'
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{booking.room}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.checkIn} to {booking.checkOut}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">KES {booking.amount.toLocaleString()}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Real-time system monitoring</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Database</span>
                    </div>
                    <Badge className="bg-green-500">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Payment Gateway</span>
                    </div>
                    <Badge className="bg-green-500">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Backup Service</span>
                    </div>
                    <Badge className="bg-yellow-500">Running</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Email Service</span>
                    </div>
                    <Badge className="bg-green-500">Online</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <BedDouble className="h-4 w-4 mr-2" />
                    Manage Rooms
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Utensils className="h-4 w-4 mr-2" />
                    Update Menu
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Staff
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Manage room reservations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-4">
                    <Input placeholder="Search by booking ID or customer..." className="max-w-sm" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="checked-in">Checked In</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bookings List */}
                  <div className="border rounded-lg">
                    {mockRecentBookings.map((booking) => (
                      <div key={booking.id} className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{booking.id}</p>
                              <Badge>{booking.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{booking.customer}</p>
                            <p className="text-sm">{booking.room}</p>
                            <p className="text-xs text-muted-foreground">
                              {booking.checkIn} → {booking.checkOut}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">KES {booking.amount.toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">View</Button>
                              <Button size="sm" variant="outline">Edit</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <MenuImport />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage customers and staff accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-4">
                    <Input placeholder="Search by name or email..." className="max-w-sm" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="chef">Chef</SelectItem>
                        <SelectItem value="waiter">Waiter</SelectItem>
                        <SelectItem value="cleaner">Cleaner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>Add User</Button>
                  </div>

                  {/* Users Table */}
                  <div className="border rounded-lg">
                    {mockUsers.map((user) => (
                      <div key={user.id} className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{user.role}</Badge>
                              <span className="text-xs text-muted-foreground">Joined: {user.joinedDate}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-500">{user.status}</Badge>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure hotel management system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotelName">Hotel Name</Label>
                    <Input id="hotelName" defaultValue="Premier Hotel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input id="email" type="email" defaultValue="info@premierhotel.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input id="phone" defaultValue="+254 712 345 678" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkInTime">Default Check-in Time</Label>
                    <Input id="checkInTime" type="time" defaultValue="14:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOutTime">Default Check-out Time</Label>
                    <Input id="checkOutTime" type="time" defaultValue="12:00" />
                  </div>
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
