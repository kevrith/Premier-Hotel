import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '@/lib/api/admin';

interface StaffAddDialogProps {
  onStaffAdded: () => void;
}

export function StaffAddDialog({ onStaffAdded }: StaffAddDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    role: 'waiter' as 'waiter' | 'chef' | 'cleaner'
  });

  const staffRoles = [
    { value: 'waiter', label: 'Waiter' },
    { value: 'chef', label: 'Chef' },
    { value: 'cleaner', label: 'Cleaner' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await adminAPI.createUser(formData);
      
      toast.success(`${formData.full_name} has been added as ${formData.role}`);

      // Reset form and close dialog
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone_number: '',
        role: 'waiter'
      });
      setIsOpen(false);
      onStaffAdded();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create staff account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 px-6 text-base">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="+254..."
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : 'Create Staff'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}