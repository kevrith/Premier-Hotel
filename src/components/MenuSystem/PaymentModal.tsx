// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ordersAPI, { type OrderItem } from '@/lib/api/orders';

interface CartItem {
  id: string;
  itemId?: string;
  name: string;
  price: number;
  basePrice?: number;
  quantity: number;
  customizations?: string[];
  special_instructions?: string | null;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  selectedLocationId: string;
  locationNotes?: string;
  onOrderPlaced: (orderId: string) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  cartItems,
  selectedLocationId,
  locationNotes,
  onOrderPlaced,
}: PaymentModalProps) {
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOfflineMode] = useState(!navigator.onLine);

  const subtotal = cartItems.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  const serviceCharge = Math.round(subtotal * 0.1);
  const total = subtotal + serviceCharge;

  const handlePlaceOrder = async () => {
    if (!selectedLocationId) {
      toast({
        title: 'Location Required',
        description: 'Please select a delivery location',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const orderItems: OrderItem[] = cartItems.map((item: CartItem) => ({
        menu_item_id: item.itemId || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price || item.basePrice || 0,
        special_instructions: item.special_instructions || undefined,
      }));

      const createdOrder = await ordersAPI.create({
        location: selectedLocationId,
        location_type: 'table',
        items: orderItems,
        special_instructions: specialInstructions || undefined,
      });

      toast({
        title: 'Order Placed Successfully!',
        description: `Your order #${createdOrder.id?.toString().slice(0, 8) || 'NEW'} has been placed. ${
          paymentMethod === 'cash'
            ? 'Please have cash ready upon delivery.'
            : 'Payment confirmation will be sent shortly.'
        }`,
      });

      onOrderPlaced(createdOrder.id);
      onClose();
    } catch (err: unknown) {
      console.error('Error placing order:', err);
      const errorMessage =
        (err as any)?.response?.data?.detail ||
        (err as any)?.message ||
        'There was an error placing your order. Please try again.';
      toast({
        title: 'Order Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            {isOfflineMode ? (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="text-sm">Offline Mode - Order will sync when online</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm">Online</span>
              </>
            )}
          </div>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>KES {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>KES {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Service Charge (10%)</span>
                <span>KES {serviceCharge.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">KES {total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="cash" id="cash" />
                <Banknote className="h-5 w-5" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay when your order arrives</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="mobile_money" id="mobile_money" />
                <Smartphone className="h-5 w-5" />
                <Label htmlFor="mobile_money" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">M-Pesa</p>
                    <p className="text-sm text-muted-foreground">Pay via mobile money</p>
                  </div>
                </Label>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>

              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 opacity-50">
                <RadioGroupItem value="card" id="card" disabled />
                <CreditCard className="h-5 w-5" />
                <Label htmlFor="card" className="flex-1">
                  <div>
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-sm text-muted-foreground">Pay with your card</p>
                  </div>
                </Label>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </RadioGroup>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Special Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Any additional requests for your order?"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Place Order Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={isProcessing || !selectedLocationId}
          >
            {isProcessing ? 'Processing...' : `Place Order - KES ${total.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
