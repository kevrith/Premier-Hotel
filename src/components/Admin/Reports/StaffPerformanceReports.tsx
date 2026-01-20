import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, Star, TrendingUp, Download, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  sales: number;
  orders: number;
  avgOrderValue: number;
  rating: number;
  totalReviews: number;
}

interface TimeRecord {
  id: string;
  staff: string;
  role: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  overtime: number;
}

export function StaffPerformanceReports() {
  const [selectedRole, setSelectedRole] = useState('all');
  const [period, setPeriod] = useState('week');
  const { toast } = useToast();

  const staffPerformance: StaffMember[] = useMemo(() => [
    {
      id: '1',
      name: 'John Waiter',
      role: 'waiter',
      sales: 234000,
      orders: 156,
      avgOrderValue: 1500,
      rating: 4.8,
      totalReviews: 45
    },
    {
      id: '2',
      name: 'Mary Server',
      role: 'waiter',
      sales: 198000,
      orders: 132,
      avgOrderValue: 1500,
      rating: 4.6,
      totalReviews: 38
    },
    {
      id: '3',
      name: 'Chef Mike',
      role: 'chef',
      sales: 456000,
      orders: 304,
      avgOrderValue: 1500,
      rating: 4.9,
      totalReviews: 67
    },
    {
      id: '4',
      name: 'Sarah Chef',
      role: 'chef',
      sales: 423000,
      orders: 282,
      avgOrderValue: 1500,
      rating: 4.7,
      totalReviews: 56
    },
    {
      id: '5',
      name: 'Tom Cleaner',
      role: 'cleaner',
      sales: 0,
      orders: 89,
      avgOrderValue: 0,
      rating: 4.5,
      totalReviews: 23
    },
    {
      id: '6',
      name: 'Lisa Receptionist',
      role: 'manager',
      sales: 567000,
      orders: 234,
      avgOrderValue: 2423,
      rating: 4.9,
      totalReviews: 78
    }
  ], []);

  const timeRecords: TimeRecord[] = useMemo(() => [
    {
      id: '1',
      staff: 'John Waiter',
      role: 'waiter',
      date: '2025-12-25',
      clockIn: '08:00',
      clockOut: '16:00',
      hoursWorked: 8,
      overtime: 0
    },
    {
      id: '2',
      staff: 'Mary Server',
      role: 'waiter',
      date: '2025-12-25',
      clockIn: '09:00',
      clockOut: '18:30',
      hoursWorked: 9.5,
      overtime: 1.5
    },
    {
      id: '3',
      staff: 'Chef Mike',
      role: 'chef',
      date: '2025-12-25',
      clockIn: '06:00',
      clockOut: '14:00',
      hoursWorked: 8,
      overtime: 0
    },
    {
      id: '4',
      staff: 'Sarah Chef',
      role: 'chef',
      date: '2025-12-25',
      clockIn: '14:00',
      clockOut: '23:00',
      hoursWorked: 9,
      overtime: 1
    },
    {
      id: '5',
      staff: 'Tom Cleaner',
      role: 'cleaner',
      date: '2025-12-25',
      clockIn: '07:00',
      clockOut: '15:00',
      hoursWorked: 8,
      overtime: 0
    },
    {
      id: '6',
      staff: 'Lisa Receptionist',
      role: 'manager',
      date: '2025-12-25',
      clockIn: '08:00',
      clockOut: '17:00',
      hoursWorked: 9,
      overtime: 1
    }
  ], []);

  const orderProcessingTimes = useMemo(() => [
    { staff: 'John Waiter', avgProcessTime: 12, fastestOrder: 5, slowestOrder: 25, efficiency: 92 },
    { staff: 'Mary Server', avgProcessTime: 15, fastestOrder: 7, slowestOrder: 30, efficiency: 88 },
    { staff: 'Chef Mike', avgProcessTime: 18, fastestOrder: 10, slowestOrder: 35, efficiency: 95 },
    { staff: 'Sarah Chef', avgProcessTime: 20, fastestOrder: 12, slowestOrder: 38, efficiency: 90 },
    { staff: 'Tom Cleaner', avgProcessTime: 25, fastestOrder: 15, slowestOrder: 45, efficiency: 85 },
    { staff: 'Lisa Receptionist', avgProcessTime: 10, fastestOrder: 5, slowestOrder: 20, efficiency: 97 }
  ], []);

  const customerRatings = useMemo(() => [
    { staff: 'John Waiter', rating: 4.8, reviews: 45, positive: 42, negative: 3, comments: [
      { rating: 5, comment: 'Excellent service, very attentive' },
      { rating: 5, comment: 'Quick and professional' },
      { rating: 3, comment: 'Service was okay' }
    ]},
    { staff: 'Mary Server', rating: 4.6, reviews: 38, positive: 34, negative: 4, comments: [
      { rating: 5, comment: 'Very friendly and helpful' },
      { rating: 4, comment: 'Good service overall' }
    ]},
    { staff: 'Chef Mike', rating: 4.9, reviews: 67, positive: 65, negative: 2, comments: [
      { rating: 5, comment: 'Amazing food quality' },
      { rating: 5, comment: 'Best chef in town!' },
      { rating: 4, comment: 'Delicious meals' }
    ]},
    { staff: 'Sarah Chef', rating: 4.7, reviews: 56, positive: 52, negative: 4, comments: [
      { rating: 5, comment: 'Consistently good food' },
      { rating: 4, comment: 'Great taste' }
    ]},
    { staff: 'Tom Cleaner', rating: 4.5, reviews: 23, positive: 21, negative: 2, comments: [
      { rating: 5, comment: 'Rooms are spotless' },
      { rating: 4, comment: 'Very clean' }
    ]},
    { staff: 'Lisa Receptionist', rating: 4.9, reviews: 78, positive: 76, negative: 2, comments: [
      { rating: 5, comment: 'Super helpful and kind' },
      { rating: 5, comment: 'Made check-in seamless' }
    ]}
  ], []);

  const filteredStaff = useMemo(() => {
    if (selectedRole === 'all') return staffPerformance;
    return staffPerformance.filter(staff => staff.role === selectedRole);
  }, [selectedRole, staffPerformance]);

  const topPerformers = useMemo(() =>
    [...staffPerformance].sort((a, b) => b.sales - a.sales).slice(0, 3),
    [staffPerformance]
  );

  const totalSales = useMemo(() =>
    staffPerformance.reduce((sum, staff) => sum + staff.sales, 0),
    [staffPerformance]
  );

  const avgRating = useMemo(() =>
    staffPerformance.reduce((sum, staff) => sum + staff.rating, 0) / staffPerformance.length,
    [staffPerformance]
  );

  const totalOvertimeHours = useMemo(() =>
    timeRecords.reduce((sum, record) => sum + record.overtime, 0),
    [timeRecords]
  );

  const handleExport = (format: string) => {
    toast({
      title: "Export initiated",
      description: `Exporting staff performance report as ${format.toUpperCase()}...`
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffPerformance.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This {period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {avgRating.toFixed(1)} ★
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on customer reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Overtime Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOvertimeHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="waiter">Waiters</SelectItem>
                  <SelectItem value="chef">Chefs</SelectItem>
                  <SelectItem value="cleaner">Cleaners</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleExport('pdf')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((staff, index) => (
              <div key={staff.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{staff.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{staff.role}</p>
                  </div>
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                    #{index + 1}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sales:</span>
                    <span className="font-semibold">KES {staff.sales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders:</span>
                    <span>{staff.orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className={getRatingColor(staff.rating)}>
                      {staff.rating} ★
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">
            <TrendingUp className="h-4 w-4 mr-2" />
            Sales & Activity
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Clock className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="efficiency">
            Order Processing
          </TabsTrigger>
          <TabsTrigger value="ratings">
            <Star className="h-4 w-4 mr-2" />
            Ratings
          </TabsTrigger>
        </TabsList>

        {/* Sales & Activity Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Sales Performance</CardTitle>
              <CardDescription>Track sales and order activity by staff member</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => {
                    const performanceScore = (staff.sales / totalSales) * 100;
                    return (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{staff.role}</Badge>
                        </TableCell>
                        <TableCell>KES {staff.sales.toLocaleString()}</TableCell>
                        <TableCell>{staff.orders}</TableCell>
                        <TableCell>
                          {staff.sales > 0 ? `KES ${staff.avgOrderValue.toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{performanceScore.toFixed(1)}%</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${Math.min(performanceScore * 2, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clock-In/Out Records</CardTitle>
              <CardDescription>Track staff attendance and working hours</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Overtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.staff}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{record.role}</Badge>
                      </TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.clockIn}</TableCell>
                      <TableCell>{record.clockOut}</TableCell>
                      <TableCell>{record.hoursWorked}h</TableCell>
                      <TableCell>
                        {record.overtime > 0 ? (
                          <span className="text-orange-600 font-semibold">
                            +{record.overtime}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Processing Times</CardTitle>
              <CardDescription>Measure efficiency and speed metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Avg Time (min)</TableHead>
                    <TableHead>Fastest</TableHead>
                    <TableHead>Slowest</TableHead>
                    <TableHead>Efficiency Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderProcessingTimes.map((record) => (
                    <TableRow key={record.staff}>
                      <TableCell className="font-medium">{record.staff}</TableCell>
                      <TableCell>{record.avgProcessTime} min</TableCell>
                      <TableCell className="text-green-600">
                        {record.fastestOrder} min
                      </TableCell>
                      <TableCell className="text-red-600">
                        {record.slowestOrder} min
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{record.efficiency}%</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${record.efficiency}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.efficiency >= 90 ? 'default' : 'secondary'}>
                          {record.efficiency >= 90 ? 'Excellent' : 'Good'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Ratings by Staff Member</CardTitle>
              <CardDescription>Monitor customer satisfaction and feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Avg Rating</TableHead>
                    <TableHead>Total Reviews</TableHead>
                    <TableHead>Positive</TableHead>
                    <TableHead>Negative</TableHead>
                    <TableHead>Recent Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerRatings.map((rating) => (
                    <TableRow key={rating.staff}>
                      <TableCell className="font-medium">{rating.staff}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getRatingColor(rating.rating)}`}>
                          {rating.rating} ★
                        </span>
                      </TableCell>
                      <TableCell>{rating.reviews}</TableCell>
                      <TableCell className="text-green-600">{rating.positive}</TableCell>
                      <TableCell className="text-red-600">{rating.negative}</TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-xs">
                          {rating.comments.slice(0, 2).map((comment, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              <span className="font-semibold">{comment.rating}★:</span>{' '}
                              {comment.comment}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
