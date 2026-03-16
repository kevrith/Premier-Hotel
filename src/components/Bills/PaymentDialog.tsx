/**
 * PaymentDialog Component
 * Handles payment processing for bills with multiple payment methods
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-hot-toast';
import { billsApi } from '@/lib/api/bills';
import type { BillResponse, PaymentCreate } from '@/types/bills';
import { CreditCard, Smartphone, Banknote, Hotel, Loader2, QrCode, CheckCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { BillQRCode } from './BillQRCode';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillResponse;
  onPaymentSuccess: () => void;
}

// Load Paystack inline script
function usePaystackScript() {
  useEffect(() => {
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return;
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);
}

export function PaymentDialog({ open, onOpenChange, bill, onPaymentSuccess }: PaymentDialogProps) {
  usePaystackScript();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'room_charge'>('cash');
  const [amount, setAmount] = useState<string>(bill.total_amount.toString());
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardEmail, setCardEmail] = useState('');
  const [roomRef, setRoomRef] = useState(bill.room_number || '');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // M-Pesa STK push state
  const [stkCheckoutId, setStkCheckoutId] = useState<string | null>(null);
  const [stkStatus, setStkStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const remainingBalance = bill.total_amount - (bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

  useEffect(() => {
    if (!open) {
      // Reset STK state when dialog closes
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setStkCheckoutId(null);
      setStkStatus('idle');
    }
  }, [open]);

  // Poll M-Pesa STK status
  useEffect(() => {
    if (stkCheckoutId && stkStatus === 'pending') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const result = await billsApi.getMpesaSTKStatus(stkCheckoutId);
          if (result.status === 'completed') {
            clearInterval(pollIntervalRef.current!);
            setStkStatus('completed');
            toast.success('M-Pesa payment confirmed!');
            setTimeout(() => {
              onPaymentSuccess();
              onOpenChange(false);
            }, 1500);
          } else if (result.status === 'failed') {
            clearInterval(pollIntervalRef.current!);
            setStkStatus('failed');
            toast.error(result.message || 'M-Pesa payment was declined');
          }
        } catch (e) {
          // ignore poll errors
        }
      }, 3000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [stkCheckoutId, stkStatus]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value);
  };

  const handleSendSTKPush = async () => {
    if (!mpesaPhone || mpesaPhone.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const result = await billsApi.initiateMpesaSTK(bill.id, mpesaPhone, paymentAmount);
      if (result.success) {
        setStkCheckoutId(result.checkout_request_id);
        setStkStatus('pending');
        toast.success(result.customer_message || 'STK push sent! Check your phone.');
      } else {
        toast.error(result.message || 'Failed to send STK push');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to initiate M-Pesa payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaystackCard = async () => {
    if (!cardEmail || !cardEmail.includes('@')) {
      toast.error('Please enter a valid email address for Paystack');
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const result = await billsApi.initializePaystack(bill.id, cardEmail, paymentAmount);

      if (!result.success) {
        toast.error(result.message || 'Failed to initialize Paystack');
        setProcessing(false);
        return;
      }

      const { access_code, reference, public_key } = result;

      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        toast.error('Paystack is not loaded. Please refresh and try again.');
        setProcessing(false);
        return;
      }

      const handler = PaystackPop.setup({
        key: public_key,
        email: cardEmail,
        amount: Math.round(paymentAmount * 100),
        currency: 'KES',
        ref: reference,
        access_code: access_code,
        callback: async (response: any) => {
          // Payment completed on Paystack side
          try {
            await billsApi.verifyPaystack(response.reference || reference);
            toast.success('Card payment successful!');
            onPaymentSuccess();
            onOpenChange(false);
          } catch (e) {
            toast.error('Payment completed but verification failed. Please contact staff.');
          }
        },
        onClose: () => {
          toast('Payment window closed');
          setProcessing(false);
        },
      });

      handler.openIframe();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to open Paystack');
      setProcessing(false);
    }
  };

  const handleCashOrRoomPayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (paymentAmount > remainingBalance) {
      toast.error(`Amount cannot exceed ${formatCurrency(remainingBalance)}`);
      return;
    }
    if (paymentMethod === 'room_charge' && !roomRef) {
      toast.error('Please enter room number');
      return;
    }

    setProcessing(true);
    try {
      const paymentData: PaymentCreate = {
        bill_id: bill.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        notes,
      };
      if (paymentMethod === 'room_charge') {
        paymentData.room_charge_ref = roomRef;
      }

      await billsApi.processPayment(paymentData);
      toast.success('Payment processed successfully!');
      onPaymentSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === 'cash' || paymentMethod === 'room_charge') {
      handleCashOrRoomPayment();
    } else if (paymentMethod === 'mpesa') {
      handleSendSTKPush();
    } else if (paymentMethod === 'card') {
      handlePaystackCard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                Bill {bill.bill_number} — {formatCurrency(remainingBalance)} remaining
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowQRCode(true)} className="ml-4">
              <QrCode className="h-4 w-4 mr-1" />
              Show QR
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Pay</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={remainingBalance}
            />
            <p className="text-xs text-muted-foreground">Maximum: {formatCurrency(remainingBalance)}</p>
          </div>

          {/* Tabs */}
          <Tabs value={paymentMethod} onValueChange={(v) => {
            setPaymentMethod(v as any);
            setStkStatus('idle');
            setStkCheckoutId(null);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cash"><Banknote className="h-3 w-3 mr-1" />Cash</TabsTrigger>
              <TabsTrigger value="mpesa"><Smartphone className="h-3 w-3 mr-1" />M-Pesa</TabsTrigger>
              <TabsTrigger value="card"><CreditCard className="h-3 w-3 mr-1" />Card</TabsTrigger>
              <TabsTrigger value="room_charge"><Hotel className="h-3 w-3 mr-1" />Room</TabsTrigger>
            </TabsList>

            <TabsContent value="cash">
              <p className="text-sm text-muted-foreground pt-2">Accept cash from the customer and confirm below.</p>
            </TabsContent>

            <TabsContent value="mpesa" className="space-y-3 pt-2">
              {stkStatus === 'idle' && (
                <>
                  <Label htmlFor="mpesa_phone">M-Pesa Phone Number</Label>
                  <Input
                    id="mpesa_phone"
                    type="tel"
                    placeholder="254712345678"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Customer will receive an STK push prompt on their phone.</p>
                </>
              )}
              {stkStatus === 'pending' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for M-Pesa confirmation on {mpesaPhone}...
                  </AlertDescription>
                </Alert>
              )}
              {stkStatus === 'completed' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Payment confirmed!</AlertDescription>
                </Alert>
              )}
              {stkStatus === 'failed' && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    Payment was declined. Please try again.
                    <Button variant="link" className="p-0 h-auto text-red-700 ml-2" onClick={() => setStkStatus('idle')}>Retry</Button>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="card" className="space-y-3 pt-2">
              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>Powered by Paystack — Visa, Mastercard, and more accepted.</AlertDescription>
              </Alert>
              <Label htmlFor="card_email">Customer Email</Label>
              <Input
                id="card_email"
                type="email"
                placeholder="customer@email.com"
                value={cardEmail}
                onChange={(e) => setCardEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Required for Paystack payment receipt.</p>
            </TabsContent>

            <TabsContent value="room_charge" className="space-y-3 pt-2">
              <Label htmlFor="room_ref">Room Number</Label>
              <Input
                id="room_ref"
                placeholder="Room number"
                value={roomRef}
                onChange={(e) => setRoomRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Charge to guest's room bill.</p>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any payment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing || stkStatus === 'pending'}>
            Cancel
          </Button>
          {stkStatus !== 'pending' && stkStatus !== 'completed' && (
            <Button onClick={handlePayment} disabled={processing}>
              {processing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : paymentMethod === 'mpesa' ? (
                `Send STK Push`
              ) : paymentMethod === 'card' ? (
                `Pay with Paystack`
              ) : (
                `Pay ${formatCurrency(parseFloat(amount) || 0)}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <BillQRCode bill={bill} open={showQRCode} onOpenChange={setShowQRCode} />
    </Dialog>
  );
}
