import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/lib/api/admin';
import { useAuth } from '@/contexts/AuthContext';

interface UserAddDialogProps {
  onUserAdded: () => void;
}

export function UserAddDialog({ onUserAdded }: UserAddDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    role: 'customer' as 'customer' | 'waiter' | 'chef' | 'cleaner' | 'manager' | 'admin'
  });
  const { toast } = useToast();

  // Define available roles based on current user's role
  const getAvailableRoles = () => {
    const currentUserRole = user?.role;

    if (currentUserRole === 'owner' || currentUserRole === 'admin') {
      return [
        { value: 'customer', label: 'Customer' },
        { value: 'waiter', label: 'Waiter' },
        { value: 'chef', label: 'Chef' },
        { value: 'cleaner', label: 'Cleaner' },
        { value: 'manager', label: 'Manager' },
        { value: 'admin', label: 'Admin' },
        { value: 'owner', label: 'Owner' }
      ];
    } else if (currentUserRole === 'manager') {
      return [
        { value: 'customer', label: 'Customer' },
        { value: 'waiter', label: 'Waiter' },
        { value: 'chef', label: 'Chef' },
        { value: 'cleaner', label: 'Cleaner' }
      ];
    }
    return [];
  };

  const availableRoles = getAvailableRoles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    setIsLoading(true);

    try {
      console.log('Calling adminAPI.createUser...');
      // Create user via admin API
      const result = await adminAPI.createUser(formData);
      console.log('User created successfully:', result);

      toast({
        title: "User created successfully",
        description: `${formData.full_name} has been added as ${formData.role}`,
      });

      // Reset form and close dialog
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone_number: '',
        role: 'customer'
      });
      setIsOpen(false);
      onUserAdded();
    } catch (error: any) {
      console.error('Error creating user:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: "Error creating user",
        description: error.message || "Failed to create user account",
        variant: "destructive"
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
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
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
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
