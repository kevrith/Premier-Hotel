import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PreArrivalRegistration as PreArrivalRegistrationComponent } from '@/components/CheckIn/PreArrivalRegistration';
import bookingService from '@/lib/api/services/bookingService';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PreArrivalRegistration() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    if (!bookingId) {
      toast.error('Booking ID is required');
      navigate('/my-bookings');
      return;
    }

    setLoading(true);
    try {
      const booking = await bookingService.getBookingById(bookingId);
      setBookingDetails({
        checkInDate: booking.check_in_date || booking.checkIn,
        checkOutDate: booking.check_out_date || booking.checkOut,
        roomType: booking.room_type || booking.roomType,
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone,
      });
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
      navigate('/my-bookings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!bookingDetails) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <PreArrivalRegistrationComponent
        bookingId={bookingId!}
        bookingDetails={bookingDetails}
      />
    </div>
  );
}
