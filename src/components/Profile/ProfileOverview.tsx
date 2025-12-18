import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingStore } from '@/stores/bookingStore';
import { useCartStore } from '@/stores/cartStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  ShoppingCart,
  Star,
  Award,
  TrendingUp,
  BedDouble,
  UtensilsCrossed,
  Clock,
  ArrowRight
} from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';

export default function ProfileOverview() {
  const { user } = useAuth();
  const { bookings } = useBookingStore();
  const { items } = useCartStore();

  // Calculate stats
  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter(
    (b) => isFuture(new Date(b.checkIn)) && b.status !== 'cancelled'
  ).length;
  const completedBookings = bookings.filter(
    (b) => isPast(new Date(b.checkOut)) || b.status === 'completed'
  ).length;

  // Mock data for orders and loyalty points
  const totalOrders = 12;
  const loyaltyPoints = 1250;
  const memberTier = 'Silver';

  // Recent activity (mock data + actual bookings)
  const recentActivity = [
    ...bookings.slice(0, 3).map((booking) => ({
      id: booking.id,
      type: 'booking',
      title: `Booked ${booking.roomType}`,
      description: `${format(new Date(booking.checkIn), 'MMM d')} - ${format(new Date(booking.checkOut), 'MMM d, yyyy')}`,
      date: booking.createdAt || new Date().toISOString(),
      icon: BedDouble,
      link: '/my-bookings'
    })),
    {
      id: 'order1',
      type: 'order',
      title: 'Food Order Delivered',
      description: 'Grilled Salmon, Caesar Salad',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      icon: UtensilsCrossed,
      link: '/menu'
    }
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const stats = [
    {
      title: 'Total Bookings',
      value: totalBookings,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Loyalty Points',
      value: loyaltyPoints.toLocaleString(),
      icon: Award,
      color: 'text-gold-600',
      bgColor: 'bg-gold-50 dark:bg-gold-900/20'
    },
    {
      title: 'Member Status',
      value: memberTier,
      icon: Star,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    }
  ];

  const quickActions = [
    {
      title: 'Browse Rooms',
      description: 'Find your perfect stay',
      icon: BedDouble,
      link: '/rooms',
      color: 'bg-blue-500'
    },
    {
      title: 'Order Food',
      description: 'Delicious meals delivered',
      icon: UtensilsCrossed,
      link: '/menu',
      color: 'bg-green-500'
    },
    {
      title: 'My Bookings',
      description: 'View reservations',
      icon: Calendar,
      link: '/my-bookings',
      color: 'bg-purple-500'
    },
    {
      title: 'Loyalty Rewards',
      description: 'Redeem your points',
      icon: Award,
      link: '/profile?tab=loyalty',
      color: 'bg-gold-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back, {user.firstName}!</CardTitle>
          <CardDescription>
            Here's an overview of your activity at Premier Hotel
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Shortcuts to popular features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  to={action.link}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted transition-colors group"
                >
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id}>
                      <Link
                        to={activity.link}
                        className="flex items-start gap-3 hover:bg-muted p-2 rounded-lg transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.date), 'MMM d, yyyy " h:mm a')}
                          </p>
                        </div>
                      </Link>
                      {index < recentActivity.length - 1 && <Separator className="mt-4" />}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      {upcomingBookings > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Stays</CardTitle>
                <CardDescription>
                  You have {upcomingBookings} upcoming {upcomingBookings === 1 ? 'reservation' : 'reservations'}
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link to="/my-bookings">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings
                .filter((b) => isFuture(new Date(b.checkIn)) && b.status !== 'cancelled')
                .slice(0, 2)
                .map((booking) => (
                  <div key={booking.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{booking.roomType}</p>
                        <p className="text-sm text-muted-foreground">Room {booking.roomNumber}</p>
                      </div>
                      <Badge className="bg-blue-500">Upcoming</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(booking.checkIn), 'MMM d')} - {format(new Date(booking.checkOut), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Membership Progress
          </CardTitle>
          <CardDescription>You're a {memberTier} member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to Gold</span>
                <span className="font-semibold">{loyaltyPoints} / 2500 points</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-gold transition-all"
                  style={{ width: `${(loyaltyPoints / 2500) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Earn {2500 - loyaltyPoints} more points to unlock Gold tier benefits!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
