import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingUp, Star, MessageSquare, Download, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CustomerInsightsReports() {
  const { toast } = useToast();

  const orderPatterns = useMemo(() => [
    {
      customer: 'Alice Johnson',
      totalOrders: 45,
      avgOrderValue: 3500,
      totalSpent: 157500,
      favoriteCategory: 'Room Bookings',
      lastVisit: '2025-12-24',
      frequency: 'Weekly'
    },
    {
      customer: 'Bob Smith',
      totalOrders: 32,
      avgOrderValue: 2800,
      totalSpent: 89600,
      favoriteCategory: 'Restaurant',
      lastVisit: '2025-12-25',
      frequency: 'Bi-weekly'
    },
    {
      customer: 'Carol White',
      totalOrders: 67,
      avgOrderValue: 4200,
      totalSpent: 281400,
      favoriteCategory: 'Events & Catering',
      lastVisit: '2025-12-23',
      frequency: 'Weekly'
    },
    {
      customer: 'David Brown',
      totalOrders: 23,
      avgOrderValue: 5600,
      totalSpent: 128800,
      favoriteCategory: 'Room Bookings',
      lastVisit: '2025-12-20',
      frequency: 'Monthly'
    },
    {
      customer: 'Emma Davis',
      totalOrders: 89,
      avgOrderValue: 2100,
      totalSpent: 186900,
      favoriteCategory: 'Restaurant',
      lastVisit: '2025-12-25',
      frequency: 'Daily'
    }
  ], []);

  const bookingFrequency = useMemo(() => [
    {
      customer: 'Alice Johnson',
      roomBookings: 12,
      avgStayDuration: 3.5,
      preferredRoomType: 'Deluxe Suite',
      totalNights: 42,
      seasonalPreference: 'Summer'
    },
    {
      customer: 'Bob Smith',
      roomBookings: 8,
      avgStayDuration: 2.0,
      preferredRoomType: 'Standard Room',
      totalNights: 16,
      seasonalPreference: 'Winter'
    },
    {
      customer: 'Carol White',
      roomBookings: 18,
      avgStayDuration: 4.2,
      preferredRoomType: 'Presidential Suite',
      totalNights: 75,
      seasonalPreference: 'All Year'
    },
    {
      customer: 'David Brown',
      roomBookings: 6,
      avgStayDuration: 5.0,
      preferredRoomType: 'Deluxe Suite',
      totalNights: 30,
      seasonalPreference: 'Spring'
    }
  ], []);

  const loyaltyProgram = useMemo(() => [
    {
      customer: 'Alice Johnson',
      memberSince: '2024-01-15',
      tier: 'Gold',
      pointsEarned: 15750,
      pointsRedeemed: 5000,
      pointsBalance: 10750,
      rewardsUsed: 8
    },
    {
      customer: 'Bob Smith',
      memberSince: '2024-06-10',
      tier: 'Silver',
      pointsEarned: 8960,
      pointsRedeemed: 3000,
      pointsBalance: 5960,
      rewardsUsed: 4
    },
    {
      customer: 'Carol White',
      memberSince: '2023-11-20',
      tier: 'Platinum',
      pointsEarned: 28140,
      pointsRedeemed: 12000,
      pointsBalance: 16140,
      rewardsUsed: 15
    },
    {
      customer: 'David Brown',
      memberSince: '2024-09-05',
      tier: 'Silver',
      pointsEarned: 12880,
      pointsRedeemed: 4000,
      pointsBalance: 8880,
      rewardsUsed: 5
    },
    {
      customer: 'Emma Davis',
      memberSince: '2024-03-12',
      tier: 'Gold',
      pointsEarned: 18690,
      pointsRedeemed: 7000,
      pointsBalance: 11690,
      rewardsUsed: 10
    }
  ], []);

  const feedbackAnalysis = useMemo(() => [
    {
      category: 'Service Quality',
      positive: 234,
      neutral: 45,
      negative: 12,
      avgRating: 4.6,
      topComments: [
        'Excellent and attentive staff',
        'Quick service',
        'Very professional team'
      ]
    },
    {
      category: 'Food Quality',
      positive: 198,
      neutral: 38,
      negative: 8,
      avgRating: 4.8,
      topComments: [
        'Delicious meals',
        'Fresh ingredients',
        'Great variety'
      ]
    },
    {
      category: 'Room Cleanliness',
      positive: 267,
      neutral: 23,
      negative: 5,
      avgRating: 4.9,
      topComments: [
        'Spotless rooms',
        'Attention to detail',
        'Very clean facilities'
      ]
    },
    {
      category: 'Value for Money',
      positive: 176,
      neutral: 67,
      negative: 18,
      avgRating: 4.3,
      topComments: [
        'Reasonable prices',
        'Good quality for price',
        'Worth the cost'
      ]
    },
    {
      category: 'Amenities',
      positive: 145,
      neutral: 54,
      negative: 12,
      avgRating: 4.4,
      topComments: [
        'Great facilities',
        'Good wifi',
        'Nice gym and pool'
      ]
    }
  ], []);

  const totalCustomers = orderPatterns.length;
  const totalRevenue = useMemo(() =>
    orderPatterns.reduce((sum, customer) => sum + customer.totalSpent, 0),
    [orderPatterns]
  );
  const avgCustomerValue = totalRevenue / totalCustomers;
  const totalLoyaltyMembers = loyaltyProgram.length;

  const handleExport = (format: string) => {
    toast({
      title: "Export initiated",
      description: `Exporting customer insights as ${format.toUpperCase()}...`
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum': return 'bg-purple-500';
      case 'gold': return 'bg-yellow-500';
      case 'silver': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {Math.round(avgCustomerValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average per customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Loyalty Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoyaltyMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Enrolled in program
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Customer Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">4.6 ★</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('pdf')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => handleExport('excel')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patterns">
            <TrendingUp className="h-4 w-4 mr-2" />
            Order Patterns
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Room Bookings
          </TabsTrigger>
          <TabsTrigger value="loyalty">
            <Gift className="h-4 w-4 mr-2" />
            Loyalty Program
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </TabsTrigger>
        </TabsList>

        {/* Order Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Ordering Patterns</CardTitle>
              <CardDescription>
                Analyze customer behavior and spending habits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Favorite Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Visit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderPatterns.map((customer) => (
                    <TableRow key={customer.customer}>
                      <TableCell className="font-medium">{customer.customer}</TableCell>
                      <TableCell>{customer.totalOrders}</TableCell>
                      <TableCell className="font-semibold">
                        KES {customer.totalSpent.toLocaleString()}
                      </TableCell>
                      <TableCell>KES {customer.avgOrderValue.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.favoriteCategory}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{customer.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.lastVisit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">High-Value Customers</p>
                  <p className="text-xl font-bold text-blue-600">
                    {orderPatterns.filter(c => c.totalSpent > 150000).length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Frequent Visitors</p>
                  <p className="text-xl font-bold text-green-600">
                    {orderPatterns.filter(c => c.frequency === 'Daily' || c.frequency === 'Weekly').length}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-purple-600">
                    KES {totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Booking Frequency</CardTitle>
              <CardDescription>
                Track customer booking patterns and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Bookings</TableHead>
                    <TableHead>Total Nights</TableHead>
                    <TableHead>Avg Stay Duration</TableHead>
                    <TableHead>Preferred Room Type</TableHead>
                    <TableHead>Seasonal Preference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingFrequency.map((booking) => (
                    <TableRow key={booking.customer}>
                      <TableCell className="font-medium">{booking.customer}</TableCell>
                      <TableCell>{booking.roomBookings}</TableCell>
                      <TableCell>{booking.totalNights} nights</TableCell>
                      <TableCell>{booking.avgStayDuration} days</TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.preferredRoomType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{booking.seasonalPreference}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Most Popular Room Types</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Deluxe Suite</span>
                      <Badge>2 bookings</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Presidential Suite</span>
                      <Badge>1 booking</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Standard Room</span>
                      <Badge>1 booking</Badge>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Booking Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bookings:</span>
                      <span className="font-semibold">
                        {bookingFrequency.reduce((sum, b) => sum + b.roomBookings, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Nights:</span>
                      <span className="font-semibold">
                        {bookingFrequency.reduce((sum, b) => sum + b.totalNights, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Stay:</span>
                      <span className="font-semibold">
                        {(bookingFrequency.reduce((sum, b) => sum + b.avgStayDuration, 0) / bookingFrequency.length).toFixed(1)} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty Program Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Program Usage</CardTitle>
              <CardDescription>
                Track member activity and reward redemption
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Member Since</TableHead>
                    <TableHead>Points Earned</TableHead>
                    <TableHead>Points Redeemed</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Rewards Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loyaltyProgram.map((member) => (
                    <TableRow key={member.customer}>
                      <TableCell className="font-medium">{member.customer}</TableCell>
                      <TableCell>
                        <Badge className={getTierColor(member.tier)}>
                          {member.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.memberSince}
                      </TableCell>
                      <TableCell>{member.pointsEarned.toLocaleString()}</TableCell>
                      <TableCell className="text-orange-600">
                        {member.pointsRedeemed.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {member.pointsBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>{member.rewardsUsed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Platinum Members</p>
                  <p className="text-xl font-bold text-purple-600">
                    {loyaltyProgram.filter(m => m.tier === 'Platinum').length}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Gold Members</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {loyaltyProgram.filter(m => m.tier === 'Gold').length}
                  </p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Silver Members</p>
                  <p className="text-xl font-bold text-gray-600">
                    {loyaltyProgram.filter(m => m.tier === 'Silver').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Feedback Analysis</CardTitle>
              <CardDescription>
                Analyze customer sentiment and satisfaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Positive</TableHead>
                    <TableHead>Neutral</TableHead>
                    <TableHead>Negative</TableHead>
                    <TableHead>Avg Rating</TableHead>
                    <TableHead>Sentiment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackAnalysis.map((feedback) => {
                    const total = feedback.positive + feedback.neutral + feedback.negative;
                    const positivePercent = (feedback.positive / total) * 100;
                    return (
                      <TableRow key={feedback.category}>
                        <TableCell className="font-medium">{feedback.category}</TableCell>
                        <TableCell className="text-green-600">{feedback.positive}</TableCell>
                        <TableCell className="text-gray-600">{feedback.neutral}</TableCell>
                        <TableCell className="text-red-600">{feedback.negative}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{feedback.avgRating} ★</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={positivePercent >= 80 ? 'default' : 'secondary'}>
                              {positivePercent.toFixed(0)}% Positive
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Top Customer Comments by Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedbackAnalysis.slice(0, 4).map((feedback) => (
                    <div key={feedback.category} className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">{feedback.category}</h5>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {feedback.topComments.map((comment, idx) => (
                          <li key={idx}>• {comment}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
