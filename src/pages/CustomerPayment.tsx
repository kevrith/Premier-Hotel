/**
 * Customer Payment Page
 * Public page where customers can pay their bills via QR code
 * No authentication required
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { billsApi } from '@/lib/api/bills';
import type { BillResponse } from '@/types/bills';
import {
  Receipt,
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  MapPin,
  DollarSign,
} from 'lucide-react';

export default function CustomerPayment() {
  const { billNumber } = useParams<{ billNumber: string }>();
  const navigate = useNavigate();

  const [bill, setBill] = useState<BillResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => {
    if (billNumber) {
      fetchBill();
    }
  }, [billNumber]);

  const fetchBill = async () => {
    if (!billNumber) return;

    setLoading(true);
    try {
      const data = await billsApi.getBillByNumber(billNumber);
      setBill(data);

      if (data.payment_status === 'paid') {
        toast.success('This bill has already been paid!');
      }
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      toast.error('Bill not found. Please check the QR code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(value);
  };

  const getRemainingBalance = () => {
    if (!bill) return 0;
    const paid = bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return bill.total_amount - paid;
  };

  const handleMpesaPayment = async () => {
    if (!mpesaPhone || mpesaPhone.length < 12) {
      toast.error('Please enter a valid phone number (254XXXXXXXXX)');
      return;
    }

    if (!bill) return;

    setProcessing(true);
    try {
      await billsApi.processPayment({
        bill_id: bill.id,
        amount: getRemainingBalance(),
        payment_method: 'mpesa',
        mpesa_phone: mpesaPhone,
        notes: 'Customer self-payment via QR code',
      });

      setPaymentSuccess(true);
      toast.success('Payment initiated! Please check your phone for M-Pesa prompt.');

      // Refresh bill after 3 seconds
      setTimeout(() => {
        fetchBill();
      }, 3000);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardExpiry || !cardCvv) {
      toast.error('Please fill in all card details');
      return;
    }

    if (!bill) return;

    setProcessing(true);
    try {
      // In production, this would integrate with a payment gateway
      await billsApi.processPayment({
        bill_id: bill.id,
        amount: getRemainingBalance(),
        payment_method: 'card',
        card_transaction_ref: `CARD-${Date.now()}`,
        notes: 'Customer self-payment via QR code',
      });

      setPaymentSuccess(true);
      toast.success('Payment successful!');

      // Refresh bill
      setTimeout(() => {
        fetchBill();
      }, 2000);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Bill Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We couldn't find this bill. Please check the QR code and try again.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingBalance = getRemainingBalance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Receipt className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Premier Hotel</h1>
          <p className="text-muted-foreground">Secure Payment Portal</p>
        </div>

        {/* Bill Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Bill {bill.bill_number}
                </CardTitle>
                <CardDescription>
                  {bill.location_type === 'table' ? `Table ${bill.table_number}` : `Room ${bill.room_number}`}
                </CardDescription>
              </div>
              <Badge
                className={
                  bill.payment_status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }
              >
                {bill.payment_status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {bill.customer_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{bill.customer_name}</span>
              </div>
            )}

            <Separator />

            {/* Order Summary */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Order Summary</h4>
              {bill.orders.map((order) => (
                <div key={order.order_id} className="space-y-1 text-sm">
                  <div className="text-xs text-muted-foreground">Order #{order.order_number}</div>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between pl-3">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (16%):</span>
                <span>{formatCurrency(bill.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total:
                </span>
                <span>{formatCurrency(bill.total_amount)}</span>
              </div>

              {bill.payments && bill.payments.length > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid:</span>
                    <span>
                      -{formatCurrency(bill.payments.reduce((sum, p) => sum + p.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-orange-600">
                    <span>Remaining:</span>
                    <span>{formatCurrency(remainingBalance)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {bill.payment_status !== 'paid' && !paymentSuccess ? (
          <Card>
            <CardHeader>
              <CardTitle>Pay Your Bill</CardTitle>
              <CardDescription>Choose your preferred payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mpesa" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    M-Pesa
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Card
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mpesa" className="space-y-4 pt-4">
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertDescription>
                      Enter your M-Pesa registered phone number. You'll receive an STK push to
                      complete the payment.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="mpesa_phone">Phone Number</Label>
                    <Input
                      id="mpesa_phone"
                      type="tel"
                      placeholder="254712345678"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      disabled={processing}
                    />
                  </div>

                  <Button
                    onClick={handleMpesaPayment}
                    disabled={processing || !mpesaPhone}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Pay {formatCurrency(remainingBalance)} via M-Pesa</>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="card" className="space-y-4 pt-4">
                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription>
                      Your payment is secure and encrypted. We accept Visa, Mastercard, and
                      American Express.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="card_number">Card Number</Label>
                      <Input
                        id="card_number"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        disabled={processing}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          disabled={processing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          type="password"
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          disabled={processing}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCardPayment}
                    disabled={processing || !cardNumber || !cardExpiry || !cardCvv}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Pay {formatCurrency(remainingBalance)} via Card</>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : paymentSuccess ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">Payment Initiated!</h3>
              <p className="text-center text-green-700 mb-4">
                {paymentMethod === 'mpesa'
                  ? 'Please check your phone for the M-Pesa prompt to complete payment.'
                  : 'Your payment has been processed successfully.'}
              </p>
              <Button variant="outline" onClick={fetchBill}>
                Check Status
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">Payment Complete!</h3>
              <p className="text-center text-green-700">
                Thank you for your payment. Your bill has been settled.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Secured by Premier Hotel Payment System</p>
          <p className="mt-1">Need help? Contact our staff</p>
        </div>
      </div>
    </div>
  );
}
