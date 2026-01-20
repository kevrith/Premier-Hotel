import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText, CreditCard, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { checkinCheckoutService } from '@/lib/api/checkin-checkout';
import bookingService from '@/lib/api/services/bookingService';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [checkInComplete, setCheckInComplete] = useState(false);

  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const fetchBookingData = async () => {
    if (!bookingId) return;

    try {
      const booking = await bookingService.getBookingById(bookingId);
      setBookingData(booking);

      // Try to fetch existing registration
      const registrations = await checkinCheckoutService.getGuestRegistrations();
      const registration = registrations.find((r: any) => r.booking_id === bookingId);
      if (registration) {
        setRegistrationData(registration);
        setStep(2); // Skip to verification if registration exists
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    }
  };

  const handleVerifyInformation = async () => {
    setLoading(true);
    try {
      if (!registrationData) {
        toast.error('Registration data not found. Please complete pre-arrival registration.');
        navigate(`/pre-arrival-registration/${bookingId}`);
        return;
      }

      setStep(2);
    } catch (error) {
      toast.error('Failed to verify information');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCheckIn = async () => {
    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      // Create check-in record
      const checkin = await checkinCheckoutService.createCheckin({
        booking_id: bookingId!,
        registration_id: registrationData.id,
        checkin_type: 'standard',
        status: 'pending',
        special_requests: specialRequests,
      });

      // Process check-in (assign room, generate key card)
      const keyCardNumber = `KEY-${Date.now()}`;
      const processedCheckin = await checkinCheckoutService.processCheckin(checkin.id, {
        room_number: bookingData.room_number || `${Math.floor(Math.random() * 400) + 100}`,
        key_card_number: keyCardNumber,
        deposit_amount: depositAmount,
        notes: specialRequests || 'Standard check-in',
      });

      setRoomNumber(processedCheckin.room_number);

      // Complete check-in
      await checkinCheckoutService.completeCheckin(processedCheckin.id);

      setCheckInComplete(true);
      toast.success('Check-in completed successfully!');
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete check-in');
    } finally {
      setLoading(false);
    }
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (checkInComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Welcome to Premier Hotel!</CardTitle>
            <CardDescription className="text-lg">
              Your room is ready. Enjoy your stay!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <Key className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Your Room</p>
                <p className="text-3xl font-bold text-blue-600">{roomNumber}</p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">Booking Details</p>
                <p className="text-sm"><strong>Guest:</strong> {bookingData.guest_name}</p>
                <p className="text-sm"><strong>Check-out:</strong> {new Date(bookingData.check_out_date).toLocaleDateString()}</p>
                <p className="text-sm"><strong>Room Type:</strong> {bookingData.room_type}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Important Information</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-amber-900">
                <li>Please collect your key card from the front desk</li>
                <li>Breakfast hours: 7:00 AM - 10:00 AM</li>
                <li>Check-out time: 11:00 AM</li>
                <li>Wi-Fi credentials are available in your room</li>
                <li>Room service available 24/7</li>
              </ul>
            </div>

            {depositAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Security Deposit:</strong> KES {depositAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will be refunded at check-out if there are no damages or extra charges.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => navigate('/profile')}>
                Go to Dashboard
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate('/services')}>
                Explore Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? 'border-primary bg-primary text-white' : 'border-gray-300'
              }`}>
                {step > 1 ? <CheckCircle className="h-6 w-6" /> : '1'}
              </div>
              <span className="font-medium hidden sm:inline">Verify Info</span>
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300'
              }`}>
                {step > 2 ? <CheckCircle className="h-6 w-6" /> : '2'}
              </div>
              <span className="font-medium hidden sm:inline">Confirm</span>
            </div>
          </div>
        </div>

        {/* Step 1: Verify Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Information</CardTitle>
              <CardDescription>
                Please review your registration details before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {registrationData ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Personal Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {registrationData.first_name} {registrationData.last_name}</p>
                        <p><strong>Email:</strong> {registrationData.email}</p>
                        <p><strong>Phone:</strong> {registrationData.phone}</p>
                        <p><strong>Nationality:</strong> {registrationData.nationality}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        ID Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>ID Type:</strong> {registrationData.id_type}</p>
                        <p><strong>ID Number:</strong> {registrationData.id_number}</p>
                        <p><strong>Expiry Date:</strong> {registrationData.id_expiry_date}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Arrival Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      {registrationData.estimated_arrival_time && (
                        <p><strong>Estimated Arrival:</strong> {registrationData.estimated_arrival_time}</p>
                      )}
                      {registrationData.special_requests && (
                        <div>
                          <strong>Special Requests:</strong>
                          <p className="text-muted-foreground mt-1">{registrationData.special_requests}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/pre-arrival-registration/${bookingId}`)}
                    >
                      Edit Information
                    </Button>
                    <Button onClick={handleVerifyInformation} disabled={loading}>
                      Confirm & Continue
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No pre-arrival registration found. Please complete registration first.
                  </p>
                  <Button onClick={() => navigate(`/pre-arrival-registration/${bookingId}`)}>
                    Complete Registration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Final Confirmation */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Final Check-In Confirmation</CardTitle>
              <CardDescription>
                Review the details and complete your check-in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Booking ID:</strong> {bookingId}</p>
                    <p><strong>Guest:</strong> {bookingData.guest_name}</p>
                    <p><strong>Room Type:</strong> {bookingData.room_type}</p>
                    <p><strong>Check-in:</strong> {new Date(bookingData.check_in_date).toLocaleDateString()}</p>
                    <p><strong>Check-out:</strong> {new Date(bookingData.check_out_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Total Amount:</strong> KES {bookingData.total_amount?.toLocaleString()}</p>
                    <p><strong>Payment Status:</strong> <span className="text-green-600">Paid</span></p>
                    <div className="pt-2">
                      <Label htmlFor="deposit">Security Deposit (Optional)</Label>
                      <Input
                        id="deposit"
                        type="number"
                        min="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="special_requests">Additional Requests (Optional)</Label>
                <Textarea
                  id="special_requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests or preferences..."
                  rows={3}
                />
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-3">Terms & Conditions</h3>
                <div className="text-sm space-y-2 text-muted-foreground mb-4 max-h-40 overflow-y-auto">
                  <p>• Check-in time is from 2:00 PM. Early check-in subject to availability.</p>
                  <p>• Check-out time is 11:00 AM. Late check-out may incur additional charges.</p>
                  <p>• Guests are responsible for any damages to hotel property.</p>
                  <p>• Smoking is prohibited in all rooms and public areas.</p>
                  <p>• Pets are not allowed unless prior arrangement has been made.</p>
                  <p>• The hotel reserves the right to refuse service to anyone.</p>
                  <p>• Security deposit (if applicable) will be refunded upon checkout inspection.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    I accept the terms and conditions
                  </Label>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleProcessCheckIn}
                  disabled={loading || !termsAccepted}
                  size="lg"
                >
                  {loading ? 'Processing...' : 'Complete Check-In'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
