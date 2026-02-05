import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { adminAPI } from '@/lib/api/admin';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions?: string[];
}

interface PermissionsDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_inventory', label: 'Manage Inventory', description: 'Update inventory items and stock movements' },
  { id: 'view_reports', label: 'View Reports', description: 'Access analytics and reports' },
  { id: 'manage_recipes', label: 'Manage Recipes', description: 'Create and edit recipes' },
];

export function PermissionsDialog({ user, open, onClose, onSuccess }: PermissionsDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(user?.permissions || []);
  const [loading, setLoading] = useState(false);

  const handleToggle = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await adminAPI.updateUserPermissions(user.id, selectedPermissions);
      toast.success('Permissions updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Permissions - {user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Grant special permissions to {user.email} ({user.role})
          </p>
          {AVAILABLE_PERMISSIONS.map(permission => (
            <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded">
              <Checkbox
                id={permission.id}
                checked={selectedPermissions.includes(permission.id)}
                onCheckedChange={() => handleToggle(permission.id)}
              />
              <div className="flex-1">
                <Label htmlFor={permission.id} className="font-semibold cursor-pointer">
                  {permission.label}
                </Label>
                <p className="text-sm text-muted-foreground">{permission.description}</p>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
