import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Users, MoreHorizontal, UserX, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminAPI, User } from '@/lib/api/admin';
import { StaffAddDialog } from './StaffAddDialog';
import { format } from 'date-fns';

export function StaffManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Staff roles that managers can manage
  const staffRoles = ['waiter', 'chef', 'cleaner'];

  useEffect(() => {
    fetchStaff();
  }, [roleFilter]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const data = await adminAPI.listUsers();
      // Filter to only show staff roles
      const staffUsers = data.filter(user => staffRoles.includes(user.role));
      setUsers(staffUsers);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('Role updated successfully');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleDelete = async (user: User) => {
    try {
      await adminAPI.deactivateUser(user.id);
      toast.success(`${user.full_name} has been removed from staff`);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove staff member');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      waiter: 'secondary',
      chef: 'secondary',
      cleaner: 'secondary'
    };
    return variants[role] || 'outline';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Management
          </CardTitle>
          <CardDescription>
            Manage hotel staff members - create, update, and remove staff accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Manage staff with role-based permissions
            </div>
            <StaffAddDialog onStaffAdded={fetchStaff} />
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="waiter">Waiter</SelectItem>
                <SelectItem value="chef">Chef</SelectItem>
                <SelectItem value="cleaner">Cleaner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading staff...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No staff members found</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.phone_number || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* Change Role */}
                            <DropdownMenuItem asChild>
                              <div className="px-2 py-1">
                                <Select
                                  value={user.role}
                                  onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                                >
                                  <SelectTrigger className="w-full h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="waiter">Waiter</SelectItem>
                                    <SelectItem value="chef">Chef</SelectItem>
                                    <SelectItem value="cleaner">Cleaner</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Staff
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No dialog needed since we handle deletion directly */}
    </div>
  );
}