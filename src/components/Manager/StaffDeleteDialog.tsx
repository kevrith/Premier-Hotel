import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI, User } from '@/lib/api/admin';

interface StaffDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export function StaffDeleteDialog({ open, onOpenChange, user, onSuccess }: StaffDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await adminAPI.deactivateUser(user.id);
      toast.success(`${user.full_name} has been removed from staff`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove staff member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Remove Staff Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{user?.full_name}</strong> from the staff? 
            This action will deactivate their account and they will no longer be able to access the system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 pt-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Removing...' : 'Remove Staff'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}