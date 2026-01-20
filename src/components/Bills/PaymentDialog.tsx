/**
 * PaymentDialog Component
 * Handles payment processing for bills with multiple payment methods
 */

import { useState } from 'react';
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
import { toast } from 'react-hot-toast';
import { billsApi } from '@/lib/api/bills';
import type { BillResponse, PaymentCreate } from '@/types/bills';
import { CreditCard, Smartphone, Banknote, Hotel, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillResponse;
  onPaymentSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, bill, onPaymentSuccess }: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'room_charge'>('cash');
  const [amount, setAmount] = useState<string>(bill.total_amount.toString());
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [roomRef, setRoomRef] = useState(bill.room_number || '');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const remainingBalance = bill.total_amount - (bill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
  const maxAmount = remainingBalance;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(value);
  };

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);

    // Validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentAmount > maxAmount) {
      toast.error(`Amount cannot exceed ${formatCurrency(maxAmount)}`);
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaPhone) {
      toast.error('Please enter M-Pesa phone number');
      return;
    }

    if (paymentMethod === 'card' && !cardRef) {
      toast.error('Please enter card transaction reference');
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

      if (paymentMethod === 'mpesa') {
        paymentData.mpesa_phone = mpesaPhone;
      } else if (paymentMethod === 'card') {
        paymentData.card_transaction_ref = cardRef;
      } else if (paymentMethod === 'room_charge') {
        paymentData.room_charge_ref = roomRef;
      }

      await billsApi.processPayment(paymentData);

      toast.success('Payment processed successfully!');
      onPaymentSuccess();
      onOpenChange(false);

      // Reset form
      setAmount(maxAmount.toString());
      setMpesaPhone('');
      setCardRef('');
      setNotes('');
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Bill {bill.bill_number} - {formatCurrency(maxAmount)} remaining
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Pay</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              max={maxAmount}
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {formatCurrency(maxAmount)}
            </p>
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cash" className="flex items-center gap-1">
                <Banknote className="h-3 w-3" />
                Cash
              </TabsTrigger>
              <TabsTrigger value="mpesa" className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                M-Pesa
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Card
              </TabsTrigger>
              <TabsTrigger value="room_charge" className="flex items-center gap-1">
                <Hotel className="h-3 w-3" />
                Room
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Accept cash payment from the customer.
              </p>
            </TabsContent>

            <TabsContent value="mpesa" className="space-y-2">
              <Label htmlFor="mpesa_phone">M-Pesa Phone Number</Label>
              <Input
                id="mpesa_phone"
                type="tel"
                placeholder="254712345678"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Customer will receive STK push to their phone.
              </p>
            </TabsContent>

            <TabsContent value="card" className="space-y-2">
              <Label htmlFor="card_ref">Card Transaction Reference</Label>
              <Input
                id="card_ref"
                placeholder="Enter card transaction ref"
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the reference from your card terminal.
              </p>
            </TabsContent>

            <TabsContent value="room_charge" className="space-y-2">
              <Label htmlFor="room_ref">Room Number</Label>
              <Input
                id="room_ref"
                placeholder="Room number"
                value={roomRef}
                onChange={(e) => setRoomRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Charge to guest's room bill.
              </p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(parseFloat(amount) || 0)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
