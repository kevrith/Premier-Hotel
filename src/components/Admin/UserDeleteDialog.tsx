/**
 * UserDeleteDialog Component
 * Dialog for permanently deleting users with safeguards
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2, XCircle, Ban } from 'lucide-react';
import { adminAPI } from '@/lib/api/admin-enhanced';
import { toast } from 'react-hot-toast';

interface UserDeleteDialogProps {
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

export function UserDeleteDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [obligations, setObligations] = useState<{
    has_obligations: boolean;
    unpaid_bills?: number;
    pending_orders?: number;
    active_bookings?: number;
  } | null>(null);
  const [checkingObligations, setCheckingObligations] = useState(false);

  // Check for active obligations when dialog opens
  useEffect(() => {
    if (open && user) {
      checkObligations();
    } else {
      // Reset state when dialog closes
      setConfirmationText('');
      setReason('');
      setObligations(null);
    }
  }, [open, user]);

  const checkObligations = async () => {
    if (!user) return;

    setCheckingObligations(true);
    try {
      // This will be handled by the backend when we try to delete
      // For now, we'll let the backend check during deletion
      setObligations({ has_obligations: false });
    } catch (error: any) {
      console.error('Error checking obligations:', error);
    } finally {
      setCheckingObligations(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    if (confirmationText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    setLoading(true);

    try {
      await adminAPI.deleteUser(user.id, {
        confirmation: confirmationText,
        reason: reason,
      });

      toast.success(`${user.full_name} has been permanently deleted`);
      onSuccess();
      onOpenChange(false);

      // Reset form
      setConfirmationText('');
      setReason('');
    } catch (error: any) {
      console.error('Deletion error:', error);

      // Parse error message for obligations
      if (error.message?.includes('obligations')) {
        toast.error(
          error.message || 'Cannot delete user with active obligations',
          { duration: 5000 }
        );
      } else if (error.message?.includes('last admin')) {
        toast.error('Cannot delete the last admin user');
      } else if (error.message?.includes('yourself')) {
        toast.error('You cannot delete your own account');
      } else {
        toast.error(error.message || 'Failed to delete user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isConfirmationValid = confirmationText === 'DELETE';
  const canProceed = isConfirmationValid && reason.trim() && !checkingObligations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Permanently Delete User
          </DialogTitle>
          <DialogDescription>
            This action is <strong className="text-red-600">IRREVERSIBLE</strong>. All data for{' '}
            <strong>{user.full_name}</strong> will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="rounded-lg border border-red-200 p-3 bg-red-50">
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

          {/* Checking Obligations */}
          {checkingObligations && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for active obligations...
              </div>
            </div>
          )}

          {/* Critical Warnings */}
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-red-900">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    <li>User account and profile</li>
                    <li>Login credentials</li>
                    <li>Personal information</li>
                    <li>All historical data</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-start gap-2">
                <Ban className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> Users with unpaid bills, pending orders, or active
                  bookings cannot be deleted. Deactivate them instead.
                </p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-red-900">
              Reason for Deletion *
            </Label>
            <Textarea
              id="reason"
              placeholder="Required: Why is this user being permanently deleted?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="border-red-200 focus:border-red-400"
            />
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-red-900">
              Type DELETE to Confirm *
            </Label>
            <Input
              id="confirmation"
              placeholder="Type DELETE in capital letters"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className={`font-mono ${
                confirmationText && !isConfirmationValid
                  ? 'border-red-400 focus:border-red-500'
                  : isConfirmationValid
                  ? 'border-green-400 focus:border-green-500'
                  : 'border-red-200'
              }`}
              autoComplete="off"
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-xs text-red-600">
                Must type exactly: DELETE
              </p>
            )}
          </div>

          {/* Final Warning */}
          <div className="rounded-lg border-2 border-red-400 bg-red-100 p-3">
            <p className="text-sm font-semibold text-red-900 text-center">
              ⚠️ THIS ACTION CANNOT BE UNDONE ⚠️
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canProceed || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting Permanently...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
