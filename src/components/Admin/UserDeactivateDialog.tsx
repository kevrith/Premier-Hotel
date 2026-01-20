/**
 * UserDeactivateDialog Component
 * Dialog for deactivating users with reason tracking
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/api/admin-enhanced';
import { toast } from 'react-hot-toast';

interface UserDeactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  onSuccess: () => void;
}

export function UserDeactivateDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserDeactivateDialogProps) {
  const [reason, setReason] = useState('Resigned');
  const [customReason, setCustomReason] = useState('');
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    if (!user) return;

    if (reason === 'Other' && !customReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setLoading(true);

    try {
      const finalReason = reason === 'Other' ? customReason : reason;

      await adminAPI.deactivateUser(user.id, {
        reason: finalReason,
        termination_date: terminationDate,
        notes: notes || undefined,
      });

      toast.success(`${user.full_name} has been deactivated`);
      onSuccess();
      onOpenChange(false);

      // Reset form
      setReason('Resigned');
      setCustomReason('');
      setNotes('');
      setTerminationDate(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      console.error('Deactivation error:', error);
      toast.error(error.message || 'Failed to deactivate user');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Deactivate User
          </DialogTitle>
          <DialogDescription>
            Deactivating <strong>{user.full_name}</strong> will immediately block their login
            access. Historical data will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="rounded-lg border p-3 bg-gray-50">
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">Role:</span>{' '}
                <span className="capitalize">{user.role}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Termination *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Resigned">Resigned</SelectItem>
                <SelectItem value="Fired">Fired</SelectItem>
                <SelectItem value="Contract Ended">Contract Ended</SelectItem>
                <SelectItem value="Leave of Absence">Leave of Absence</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
                <SelectItem value="Other">Other (Specify)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {reason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Specify Reason *</Label>
              <Input
                id="customReason"
                placeholder="Enter reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          )}

          {/* Termination Date */}
          <div className="space-y-2">
            <Label htmlFor="terminationDate">Termination Date *</Label>
            <Input
              id="terminationDate"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm text-orange-800">
              <strong>Warning:</strong> This user will be immediately logged out and unable to
              access the system. This action can be reversed by reactivating the user.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={loading || (reason === 'Other' && !customReason.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Deactivate User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
