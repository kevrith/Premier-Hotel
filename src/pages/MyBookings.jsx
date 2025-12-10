import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingStore } from '@/stores/bookingStore';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Users,
  Clock,
  BedDouble,
  MapPin,
  Phone,
  Mail,
  Download,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Star,
  MessageSquare
} from 'lucide-react';
import { format, isPast, isFuture, isToday, differenceInDays } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { bookings, fetchBookings, cancelBooking } = useBookingStore();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      toast.error('Please login to view your bookings');
      navigate('/login', { state: { from: '/my-bookings' } });
      return;
    }

    // Fetch bookings
    const loadBookings = async () => {
      setIsLoading(true);
      try {
        await fetchBookings();
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load bookings');
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, [isAuthenticated, navigate, fetchBookings]);

  if (!isAuthenticated) {
    return null;
  }

  const getBookingStatus = (booking) => {
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    const today = new Date();

    if (booking.status === 'cancelled') {
      return 'cancelled';
    } else if (booking.status === 'completed') {
      return 'completed';
    } else if (isPast(checkOutDate)) {
      return 'completed';
    } else if (isToday(checkInDate) || (isPast(checkInDate) && isFuture(checkOutDate))) {
      return 'active';
    } else if (isFuture(checkInDate)) {
      return 'upcoming';
    }
    return 'unknown';
  };

  const canCancel = (booking) => {
    const checkInDate = new Date(booking.checkIn);
    const hoursUntilCheckIn = differenceInDays(checkInDate, new Date()) * 24;
    return hoursUntilCheckIn > 24 && booking.status !== 'cancelled' && booking.status !== 'completed';
  };

  const handleCancelClick = (booking) => {
    setSelectedBooking(booking);
    setIsCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    try {
      const result = await cancelBooking(selectedBooking.id);
      if (result.success) {
        toast.success('Booking cancelled successfully');
        setIsCancelDialogOpen(false);
        setSelectedBooking(null);
      } else {
        toast.error(result.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadReceipt = (booking) => {
    // Mock download - in production, this would fetch a PDF from the server
    toast.success('Receipt downloaded');
  };

  const handleLeaveReview = (booking) => {
    // Navigate to review page
    toast.info('Review feature coming soon!');
  };

  const upcomingBookings = bookings.filter((b) => getBookingStatus(b) === 'upcoming');
  const activeBookings = bookings.filter((b) => getBookingStatus(b) === 'active');
  const pastBookings = bookings.filter((b) => ['completed', 'cancelled'].includes(getBookingStatus(b)));

  const getStatusBadge = (status) => {
    const statusConfig = {
      upcoming: { color: 'bg-blue-500', label: 'Upcoming' },
      active: { color: 'bg-green-500', label: 'Active' },
      completed: { color: 'bg-gray-500', label: 'Completed' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.completed;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const BookingCard = ({ booking }) => {
    const status = getBookingStatus(booking);
    const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />
                {booking.roomType}
              </CardTitle>
              <CardDescription>
                Booking #{booking.id} • Room {booking.roomNumber}
              </CardDescription>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Booking Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Check-in
              </p>
              <p className="font-semibold">{format(new Date(booking.checkIn), 'MMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground">2:00 PM</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Check-out
              </p>
              <p className="font-semibold">{format(new Date(booking.checkOut), 'MMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground">12:00 PM</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Duration</p>
              <p className="font-semibold">{nights} night{nights !== 1 ? 's' : ''}</p>
            </div>

            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Guests
              </p>
              <p className="font-semibold">{booking.guests}</p>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>KES {booking.pricing.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>KES {booking.pricing.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">KES {booking.pricing.total.toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to={`/rooms/${booking.roomId}`}>
                <MapPin className="h-4 w-4 mr-2" />
                View Room
              </Link>
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(booking)}>
              <Download className="h-4 w-4 mr-2" />
              Receipt
            </Button>

            {canCancel(booking) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelClick(booking)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}

            {status === 'completed' && !booking.hasReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLeaveReview(booking)}
              >
                <Star className="h-4 w-4 mr-2" />
                Review
              </Button>
            )}
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <>
              <Separator />
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Special Requests</p>
                <p className="text-sm">{booking.specialRequests}</p>
              </div>
            </>
          )}

          {/* Cancellation Notice */}
          {status === 'upcoming' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                Free cancellation until{' '}
                {format(new Date(new Date(booking.checkIn).getTime() - 24 * 60 * 60 * 1000), 'MMM d, h:mm a')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ title, description, actionText, actionLink }) => (
    <div className="text-center py-12">
      <BedDouble className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {actionText && actionLink && (
        <Button asChild>
          <Link to={actionLink}>{actionText}</Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">Manage your room reservations</p>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No Bookings Yet"
            description="You haven't made any room reservations. Start exploring our beautiful rooms!"
            actionText="Browse Rooms"
            actionLink="/rooms"
          />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="all">
                All ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {bookings.length === 0 ? (
                <EmptyState
                  title="No Bookings"
                  description="You don't have any bookings yet."
                  actionText="Browse Rooms"
                  actionLink="/rooms"
                />
              ) : (
                bookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              {upcomingBookings.length === 0 ? (
                <EmptyState
                  title="No Upcoming Bookings"
                  description="You don't have any upcoming reservations."
                  actionText="Book a Room"
                  actionLink="/rooms"
                />
              ) : (
                upcomingBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              {activeBookings.length === 0 ? (
                <EmptyState
                  title="No Active Bookings"
                  description="You don't have any active stays right now."
                />
              ) : (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="text-sm text-green-900 dark:text-green-100">
                        <p className="font-semibold mb-1">Welcome!</p>
                        <p>Hope you're enjoying your stay. Need anything? Contact reception at +254 712 345 678</p>
                      </div>
                    </div>
                  </div>

                  {activeBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
                </>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-6">
              {pastBookings.length === 0 ? (
                <EmptyState
                  title="No Past Bookings"
                  description="Your completed and cancelled bookings will appear here."
                />
              ) : (
                pastBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Cancel Booking Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">{selectedBooking.roomType}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Room {selectedBooking.roomNumber}</p>
                  <p>
                    {format(new Date(selectedBooking.checkIn), 'MMM d')} -{' '}
                    {format(new Date(selectedBooking.checkOut), 'MMM d, yyyy')}
                  </p>
                  <p className="font-semibold text-foreground mt-2">
                    Refund: KES {selectedBooking.pricing.total.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div className="text-sm text-yellow-900 dark:text-yellow-100">
                    <p className="font-semibold mb-1">Refund Policy</p>
                    <p>
                      Since you're cancelling more than 24 hours before check-in, you'll receive a full refund
                      within 5-7 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
