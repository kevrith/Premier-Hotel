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
    role: 'waiter' as 'waiter' | 'chef' | 'cleaner',
    pin: '',
  });

  const staffRoles = [
    { value: 'waiter', label: 'Waiter' },
    { value: 'chef', label: 'Chef' },
    { value: 'cleaner', label: 'Cleaner' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!formData.email && !formData.pin) {
      toast.error('Provide at least an email/password or a PIN for login');
      return;
    }
    if (formData.pin && (!/^\d{4,6}$/.test(formData.pin))) {
      toast.error('PIN must be 4–6 digits');
      return;
    }
    if (formData.email && formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        full_name: formData.full_name,
        role: formData.role,
        phone_number: formData.phone_number || undefined,
      };
      if (formData.email) payload.email = formData.email;
      if (formData.password) payload.password = formData.password;
      if (formData.pin) payload.pin = formData.pin;

      await adminAPI.createUser(payload);

      toast.success(`${formData.full_name} has been added as ${formData.role}`);
      setFormData({ email: '', password: '', full_name: '', phone_number: '', role: 'waiter', pin: '' });
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
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="full_name"
              placeholder="e.g. John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
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

          <div className="space-y-2">
            <Label htmlFor="pin">
              PIN <span className="text-muted-foreground text-xs">(4–6 digits, for quick login)</span>
            </Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              placeholder="e.g. 1234"
              maxLength={6}
              value={formData.pin}
              onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Optional: add email login credentials if the staff member needs app access.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@premierhotel.co.ke"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                placeholder="+254..."
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
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
