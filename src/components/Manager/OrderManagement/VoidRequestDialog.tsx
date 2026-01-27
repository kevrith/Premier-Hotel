import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, DollarSign, User, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { orderManagementService, type VoidRequest } from '@/lib/api/order-management';

interface VoidRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number;
  onVoidSuccess: () => void;
}

export function VoidRequestDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  orderTotal, 
  onVoidSuccess 
}: VoidRequestDialogProps) {
  const [reason, setReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for voiding this order');
      return;
    }

    if (!managerPin) {
      toast.error('Manager PIN is required');
      return;
    }

    setIsLoading(true);
    try {
      const voidRequest: VoidRequest = {
        order_id: orderId,
        reason: reason.trim(),
        amount: orderTotal,
        manager_pin: managerPin
      };

      await orderManagementService.requestVoid(voidRequest);
      toast.success('Void request submitted successfully');
      onVoidSuccess();
      onOpenChange(false);
      // Reset form
      setReason('');
      setManagerPin('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit void request');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Order Void</DialogTitle>
          <DialogDescription>
            Submit a request to void this order. Manager approval is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="font-medium">{orderId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Order Total</p>
                <p className="font-medium">{formatCurrency(orderTotal)}</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Important</p>
              <p className="text-yellow-700">
                Voiding an order will completely remove it from the system. 
                This action requires manager approval and will be logged for audit purposes.
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Void</Label>
            <Textarea
              id="reason"
              placeholder="Please describe why this order needs to be voided..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Manager PIN */}
          <div className="space-y-2">
            <Label htmlFor="managerPin">Manager PIN</Label>
            <div className="flex gap-2">
              <Input
                id="managerPin"
                type="password"
                placeholder="Enter manager PIN"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="h-4 w-4" />
                Required for approval
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !reason.trim() || !managerPin}
            >
              {isLoading ? 'Submitting...' : 'Submit Void Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}