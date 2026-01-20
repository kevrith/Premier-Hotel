import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, Loader2, CheckCircle, AlertCircle, User, Calendar, Home, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/Inventory/BarcodeScanner';
import { checkinCheckoutService } from '@/lib/api/checkin-checkout';
import bookingService from '@/lib/api/services/bookingService';
import toast from 'react-hot-toast';

export default function ExpressCheckIn() {
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [bookingData, setBookingData] = useState<any>(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [roomDetails, setRoomDetails] = useState<any>(null);

  const handleScan = async (scannedCode: string) => {
    setScannerOpen(false);

    try {
      // Parse QR code data
      const qrData = JSON.parse(scannedCode);

      if (qrData.type !== 'HOTEL_BOOKING') {
        toast.error('Invalid QR code. Please scan a valid booking QR code.');
        return;
      }

      setBookingId(qrData.bookingId);
      await processCheckIn(qrData.bookingId);
    } catch (error) {
      // If not JSON, assume it's a direct booking ID
      setBookingId(scannedCode);
      await processCheckIn(scannedCode);
    }
  };

  const processCheckIn = async (id: string) => {
    setLoading(true);
    try {
      // 1. Fetch booking details
      const booking = await bookingService.getBookingById(id);
      setBookingData(booking);

      // 2. Check if guest registration exists
      const registrations = await checkinCheckoutService.getGuestRegistrations();
      const existingRegistration = registrations.find((r: any) => r.booking_id === id);

      if (!existingRegistration) {
        toast.error('Please complete pre-arrival registration first');
        navigate(`/pre-arrival-registration/${id}`);
        return;
      }

      // 3. Create check-in record
      const checkin = await checkinCheckoutService.createCheckin({
        booking_id: id,
        registration_id: existingRegistration.id,
        checkin_type: 'express',
        status: 'pending',
      });

      // 4. Process check-in (assign room, generate key card)
      const processedCheckin = await checkinCheckoutService.processCheckin(checkin.id, {
        room_number: booking.room_number || 'TBD',
        key_card_number: `KEY-${Date.now()}`,
        deposit_amount: 0, // Assuming pre-paid
        notes: 'Express check-in via QR code',
      });

      // 5. Complete check-in
      await checkinCheckoutService.completeCheckin(processedCheckin.id);

      setRoomDetails({
        roomNumber: processedCheckin.room_number,
        keyCard: processedCheckin.key_card_number,
        checkInTime: new Date().toLocaleTimeString(),
      });

      setCheckInSuccess(true);
      toast.success('Check-in completed successfully!');
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error(error.response?.data?.detail || 'Failed to process check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!bookingId.trim()) {
      toast.error('Please enter a booking ID');
      return;
    }
    await processCheckIn(bookingId);
  };

  if (checkInSuccess && roomDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to Premier Hotel!</CardTitle>
            <CardDescription>Your check-in is complete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Room Number</p>
                  <p className="text-2xl font-bold text-blue-600">{roomDetails.roomNumber}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guest Name</p>
                    <p className="font-medium">{bookingData?.guest_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out Date</p>
                    <p className="font-medium">
                      {bookingData?.check_out_date ? new Date(bookingData.check_out_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in Time</p>
                    <p className="font-medium">{roomDetails.checkInTime}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Digital Key Card:</strong> {roomDetails.keyCard}
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Please collect your physical key card from the front desk.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Important Information:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Breakfast is served from 7:00 AM to 10:00 AM</li>
                <li>Check-out time is 11:00 AM</li>
                <li>Wi-Fi password is available at the front desk</li>
                <li>Room service is available 24/7</li>
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate('/profile')}
            >
              Go to My Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Express Check-In</CardTitle>
            <CardDescription>
              Scan your booking QR code or enter your booking ID for instant check-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code Scanner Option */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Scan className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Scan QR Code</h3>
              <p className="text-muted-foreground mb-6">
                Use your device camera to scan the QR code from your booking confirmation
              </p>
              <Button
                size="lg"
                onClick={() => setScannerOpen(true)}
                disabled={loading}
              >
                <Scan className="h-5 w-5 mr-2" />
                Open QR Scanner
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-muted-foreground">OR</span>
              </div>
            </div>

            {/* Manual Booking ID Entry */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="bookingId">Enter Booking ID</Label>
                <Input
                  id="bookingId"
                  type="text"
                  placeholder="e.g., BK123456"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualCheckIn()}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Your booking ID can be found in your confirmation email
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleManualCheckIn}
                disabled={loading || !bookingId.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing Check-In...
                  </>
                ) : (
                  'Proceed with Check-In'
                )}
              </Button>
            </div>

            {/* Help Section */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Need Help?</h4>
                  <p className="text-sm text-muted-foreground">
                    If you haven't completed pre-arrival registration, you'll be redirected to complete it first.
                    For assistance, please contact our front desk at +254 700 000000.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Booking QR Code</DialogTitle>
            <DialogDescription>
              Position your booking QR code within the camera frame
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setScannerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
