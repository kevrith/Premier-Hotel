import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus, KeyRound, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/lib/api/admin';
import { useAuth } from '@/contexts/AuthContext';

interface UserAddDialogProps {
  onUserAdded: () => void;
}

const STAFF_ROLES = ['waiter', 'chef', 'cleaner', 'housekeeping', 'manager'];

export function UserAddDialog({ onUserAdded }: UserAddDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pin: '',
    full_name: '',
    phone_number: '',
    role: 'customer' as 'customer' | 'waiter' | 'chef' | 'cleaner' | 'housekeeping' | 'manager' | 'admin' | 'owner',
  });
  const { toast } = useToast();

  const isStaff = STAFF_ROLES.includes(formData.role);

  const getAvailableRoles = () => {
    const currentUserRole = user?.role;
    if (currentUserRole === 'owner' || currentUserRole === 'admin') {
      return [
        { value: 'customer', label: 'Customer' },
        { value: 'waiter', label: 'Waiter' },
        { value: 'chef', label: 'Chef' },
        { value: 'cleaner', label: 'Cleaner' },
        { value: 'housekeeping', label: 'Housekeeping' },
        { value: 'manager', label: 'Manager' },
        { value: 'admin', label: 'Admin' },
        { value: 'owner', label: 'Owner' },
      ];
    } else if (currentUserRole === 'manager') {
      return [
        { value: 'customer', label: 'Customer' },
        { value: 'waiter', label: 'Waiter' },
        { value: 'chef', label: 'Chef' },
        { value: 'cleaner', label: 'Cleaner' },
        { value: 'housekeeping', label: 'Housekeeping' },
      ];
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate PIN for staff
      if (isStaff && formData.pin && !/^\d{4,6}$/.test(formData.pin)) {
        toast({ title: 'Invalid PIN', description: 'PIN must be 4–6 digits', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const payload: any = {
        full_name: formData.full_name,
        role: formData.role,
        phone_number: formData.phone_number || undefined,
      };

      if (isStaff) {
        if (formData.email) payload.email = formData.email;
        if (formData.password) payload.password = formData.password;
        if (formData.pin) payload.pin = formData.pin;
      } else {
        payload.email = formData.email;
        payload.password = formData.password;
      }

      await adminAPI.createUser(payload);

      toast({
        title: 'User created successfully',
        description: `${formData.full_name} has been added as ${formData.role}${isStaff && formData.pin ? ' with PIN' : ''}`,
      });

      setFormData({ email: '', password: '', pin: '', full_name: '', phone_number: '', role: 'customer' });
      setIsOpen(false);
      onUserAdded();
    } catch (error: any) {
      toast({
        title: 'Error creating user',
        description: error.response?.data?.detail || error.message || 'Failed to create user account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 px-6 text-base">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Full Name */}
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </div>

          {/* Role — pick this first so fields adapt */}
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff: PIN field (primary login method) */}
          {isStaff && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-3 space-y-3">
              <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Staff can log in using their name + PIN from the login screen. Email and password are optional.</span>
              </div>
              <div>
                <Label htmlFor="pin" className="flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5" />
                  PIN (4–6 digits)
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={formData.pin}
                  onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <Label htmlFor="email">
              Email {!isStaff && '*'}{isStaff && <span className="text-muted-foreground text-xs ml-1">(optional)</span>}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required={!isStaff}
              placeholder={isStaff ? 'optional' : ''}
            />
          </div>

          {/* Password — hidden for staff unless they type an email */}
          {(!isStaff || formData.email) && (
            <div>
              <Label htmlFor="password">
                Password {!isStaff && '*'}{isStaff && <span className="text-muted-foreground text-xs ml-1">(optional)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required={!isStaff}
                minLength={isStaff ? undefined : 6}
                placeholder={isStaff ? 'optional' : ''}
              />
            </div>
          )}

          {/* Phone */}
          <div>
            <Label htmlFor="phone_number">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="+254..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : 'Create User'}
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
