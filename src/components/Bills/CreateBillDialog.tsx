/**
 * CreateBillDialog Component
 * Creates a bill from unpaid orders at a table or room
 */

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { billsApi } from '@/lib/api/bills';
import type { UnpaidOrdersResponse, BillResponse } from '@/types/bills';
import { Loader2, Receipt, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocationType?: 'table' | 'room';
  defaultLocation?: string;
  onBillCreated: (bill: BillResponse) => void;
}

export function CreateBillDialog({
  open,
  onOpenChange,
  defaultLocationType = 'table',
  defaultLocation = '',
  onBillCreated,
}: CreateBillDialogProps) {
  const [locationType, setLocationType] = useState<'table' | 'room'>(defaultLocationType);
  const [location, setLocation] = useState(defaultLocation);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrdersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (defaultLocationType) setLocationType(defaultLocationType);
    if (defaultLocation) setLocation(defaultLocation);
  }, [defaultLocationType, defaultLocation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(value);
  };

  const fetchUnpaidOrders = async () => {
    if (!location) {
      toast.error('Please enter a location');
      return;
    }

    setLoading(true);
    try {
      const data = await billsApi.getUnpaidOrders(locationType, location);
      setUnpaidOrders(data);

      if (data.order_count === 0) {
        toast.error(`No unpaid orders found for ${locationType} ${location}`);
      } else {
        toast.success(`Found ${data.order_count} unpaid order(s)`);
      }
    } catch (error: any) {
      console.error('Error fetching unpaid orders:', error);
      toast.error(error.response?.data?.detail || 'Failed to fetch unpaid orders');
      setUnpaidOrders(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBill = async () => {
    if (!unpaidOrders || unpaidOrders.order_count === 0) {
      toast.error('No unpaid orders to bill');
      return;
    }

    setCreating(true);
    try {
      const billData = {
        location_type: locationType,
        location,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
      };

      const bill = await billsApi.createBill(billData);
      toast.success(`Bill ${bill.bill_number} created successfully!`);
      onBillCreated(bill);
      onOpenChange(false);

      // Reset form
      setLocation('');
      setCustomerName('');
      setCustomerPhone('');
      setUnpaidOrders(null);
    } catch (error: any) {
      console.error('Error creating bill:', error);
      toast.error(error.response?.data?.detail || 'Failed to create bill');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create New Bill
          </DialogTitle>
          <DialogDescription>
            Generate a bill from unpaid orders at a table or room.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Type */}
          <div className="space-y-2">
            <Label htmlFor="location_type">Location Type</Label>
            <Select value={locationType} onValueChange={(v) => setLocationType(v as any)}>
              <SelectTrigger id="location_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="room">Room</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Number */}
          <div className="space-y-2">
            <Label htmlFor="location">
              {locationType === 'table' ? 'Table Number' : 'Room Number'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder={locationType === 'table' ? 'e.g., 12' : 'e.g., 305'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchUnpaidOrders()}
              />
              <Button onClick={fetchUnpaidOrders} disabled={loading || !location}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
              </Button>
            </div>
          </div>

          {/* Unpaid Orders Preview */}
          {unpaidOrders && unpaidOrders.order_count > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    Found {unpaidOrders.order_count} unpaid order(s)
                  </p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(unpaidOrders.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (16%):</span>
                      <span>{formatCurrency(unpaidOrders.tax_included)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total:</span>
                      <span>{formatCurrency(unpaidOrders.total_amount)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Orders from: {unpaidOrders.orders.map(o => o.waiter_name).join(', ')}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer Details (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name (Optional)</Label>
            <Input
              id="customer_name"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_phone">Customer Phone (Optional)</Label>
            <Input
              id="customer_phone"
              type="tel"
              placeholder="254712345678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBill}
            disabled={creating || !unpaidOrders || unpaidOrders.order_count === 0}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Bill'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
