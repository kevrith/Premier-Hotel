import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Download, Star, Receipt, CreditCard, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { checkinCheckoutService } from '@/lib/api/checkin-checkout';
import bookingService from '@/lib/api/services/bookingService';
import toast from 'react-hot-toast';

interface BillItem {
  description: string;
  amount: number;
  date?: string;
}

export default function ExpressCheckOut() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<any>(null);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [damageCharge, setDamageCharge] = useState(0);
  const [minibarCharges, setMinibarCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  // Feedback state
  const [overallRating, setOverallRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [returnIncentiveAccepted, setReturnIncentiveAccepted] = useState(false);

  useEffect(() => {
    fetchCheckoutData();
  }, [bookingId]);

  const fetchCheckoutData = async () => {
    if (!bookingId) return;

    try {
      const booking = await bookingService.getBookingById(bookingId);
      setBookingData(booking);

      // Get check-in data
      const checkins = await checkinCheckoutService.getCheckins();
      const checkin = checkins.find((c: any) => c.booking_id === bookingId);
      setCheckInData(checkin);

      // Build bill items
      const items: BillItem[] = [
        {
          description: `${booking.room_type} - Room Charges`,
          amount: booking.total_amount || 0,
          date: new Date(booking.check_in_date).toLocaleDateString(),
        },
      ];

      // Add any service charges from the booking
      // This would come from room service, spa, etc.
      // For now, we'll just show the base room charge

      setBillItems(items);
    } catch (error) {
      console.error('Error fetching checkout data:', error);
      toast.error('Failed to load checkout details');
    }
  };

  const calculateTotal = () => {
    const roomCharges = billItems.reduce((sum, item) => sum + item.amount, 0);
    const additionalCharges = damageCharge + minibarCharges + otherCharges;
    const subtotal = roomCharges + additionalCharges;
    const deposit = checkInData?.deposit_amount || 0;
    const total = subtotal - deposit;
    return { roomCharges, additionalCharges, subtotal, deposit, total };
  };

  const handleReviewBill = () => {
    setStep(2);
  };

  const handleProcessCheckout = async () => {
    setLoading(true);
    try {
      if (!checkInData) {
        toast.error('Check-in record not found');
        return;
      }

      const totals = calculateTotal();

      // Create checkout record
      const checkout = await checkinCheckoutService.createCheckout({
        checkin_id: checkInData.id,
        checkout_type: 'express',
        status: 'pending',
      });

      // Process checkout
      const processedCheckout = await checkinCheckoutService.processCheckout(checkout.id, {
        room_condition: damageCharge > 0 ? 'damaged' : 'good',
        damage_charge: damageCharge,
        minibar_charge: minibarCharges,
        other_charges: otherCharges,
        total_amount: totals.total,
        notes: `Express checkout - Overall rating: ${overallRating}/5`,
      });

      // Complete checkout
      await checkinCheckoutService.completeCheckout(processedCheckout.id);

      setCheckoutComplete(true);
      toast.success('Checkout completed successfully!');

      // TODO: Send feedback to backend
      console.log('Feedback:', { overallRating, feedback, wouldRecommend });
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Failed to complete checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      if (!bookingId) return;
      await bookingService.downloadReceipt(bookingId);
      toast.success('Receipt downloaded');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout details...</p>
        </div>
      </div>
    );
  }

  if (checkoutComplete) {
    const totals = calculateTotal();

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Thank You!</CardTitle>
            <CardDescription className="text-lg">
              Your checkout is complete. We hope you enjoyed your stay!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Final Bill Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Room Charges</span>
                  <span className="font-medium">KES {totals.roomCharges.toLocaleString()}</span>
                </div>
                {totals.additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Additional Charges</span>
                    <span className="font-medium">KES {totals.additionalCharges.toLocaleString()}</span>
                  </div>
                )}
                {totals.deposit > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Deposit Refund</span>
                    <span className="font-medium">- KES {totals.deposit.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Due</span>
                  <span className="text-blue-600">KES {Math.max(0, totals.total).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {returnIncentiveAccepted && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-600" />
                  Special Offer for Your Next Visit!
                </h4>
                <p className="text-sm text-amber-900 mb-2">
                  You've earned a <strong>15% discount</strong> on your next booking with us!
                </p>
                <p className="text-xs text-amber-700">
                  Use code: <strong className="font-mono bg-white px-2 py-1 rounded">RETURN15</strong> when booking your next stay.
                  Valid for 6 months.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleDownloadReceipt}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/')}
              >
                Return to Home
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              A copy of your receipt has been sent to {bookingData.guest_email || 'your email'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = calculateTotal();

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
              <span className="font-medium hidden sm:inline">Review Bill</span>
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300'
              }`}>
                {step > 2 ? <CheckCircle className="h-6 w-6" /> : '2'}
              </div>
              <span className="font-medium hidden sm:inline">Feedback</span>
            </div>
          </div>
        </div>

        {/* Step 1: Bill Review */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Review Your Bill
              </CardTitle>
              <CardDescription>
                Please review your charges before checking out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Guest Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Guest Name</p>
                    <p className="font-medium">{bookingData.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Room Number</p>
                    <p className="font-medium">{checkInData?.room_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stay Duration</p>
                    <p className="font-medium">
                      {new Date(bookingData.check_in_date).toLocaleDateString()} - {new Date(bookingData.check_out_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill Items */}
              <div>
                <h3 className="font-semibold mb-3">Charges</h3>
                <div className="space-y-2">
                  {billItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.date && <p className="text-xs text-muted-foreground">{item.date}</p>}
                      </div>
                      <p className="font-semibold">KES {item.amount.toLocaleString()}</p>
                    </div>
                  ))}

                  {/* Additional Charges Input */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor="minibar">Minibar Charges</Label>
                        <Input
                          id="minibar"
                          type="number"
                          min="0"
                          value={minibarCharges}
                          onChange={(e) => setMinibarCharges(parseFloat(e.target.value) || 0)}
                          className="mt-1 max-w-xs"
                        />
                      </div>
                      <p className="font-semibold">KES {minibarCharges.toLocaleString()}</p>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor="damage">Damage Charges</Label>
                        <Input
                          id="damage"
                          type="number"
                          min="0"
                          value={damageCharge}
                          onChange={(e) => setDamageCharge(parseFloat(e.target.value) || 0)}
                          className="mt-1 max-w-xs"
                        />
                      </div>
                      <p className="font-semibold">KES {damageCharge.toLocaleString()}</p>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor="other">Other Charges</Label>
                        <Input
                          id="other"
                          type="number"
                          min="0"
                          value={otherCharges}
                          onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                          className="mt-1 max-w-xs"
                        />
                      </div>
                      <p className="font-semibold">KES {otherCharges.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill Summary */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Bill Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Room Charges</span>
                    <span>KES {totals.roomCharges.toLocaleString()}</span>
                  </div>
                  {totals.additionalCharges > 0 && (
                    <div className="flex justify-between">
                      <span>Additional Charges</span>
                      <span>KES {totals.additionalCharges.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>KES {totals.subtotal.toLocaleString()}</span>
                  </div>
                  {totals.deposit > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Security Deposit Refund</span>
                      <span>- KES {totals.deposit.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-blue-600">KES {Math.max(0, totals.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {totals.total < 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Refund Due</p>
                    <p className="text-sm text-green-700">
                      You will receive a refund of KES {Math.abs(totals.total).toLocaleString()} to your original payment method.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleReviewBill} size="lg">
                  Proceed to Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Feedback */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>How was your stay?</CardTitle>
              <CardDescription>
                Your feedback helps us improve our service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Star Rating */}
              <div>
                <Label>Overall Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= overallRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <Label htmlFor="feedback">Tell us about your experience</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you enjoy most? What could we improve?"
                  rows={5}
                  className="mt-2"
                />
              </div>

              {/* Recommendation */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recommend"
                  checked={wouldRecommend}
                  onCheckedChange={(checked) => setWouldRecommend(checked as boolean)}
                />
                <Label htmlFor="recommend" className="cursor-pointer">
                  I would recommend Premier Hotel to others
                </Label>
              </div>

              {/* Return Incentive */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Come back and save 15%!</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Book your next stay within 6 months and get 15% off your total booking.
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="incentive"
                        checked={returnIncentiveAccepted}
                        onCheckedChange={(checked) => setReturnIncentiveAccepted(checked as boolean)}
                      />
                      <Label htmlFor="incentive" className="cursor-pointer text-sm">
                        Yes, send me my discount code!
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back to Bill
                </Button>
                <Button
                  onClick={handleProcessCheckout}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? 'Processing...' : 'Complete Checkout'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
