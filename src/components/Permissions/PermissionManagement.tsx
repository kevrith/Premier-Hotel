import React, { useState, useEffect } from 'react';
import { permissionsApi, Permission, UserPermissions } from '@/lib/api/permissions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, User } from 'lucide-react';

export const PermissionManagement: React.FC = () => {
  const [staff, setStaff] = useState<UserPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffData, permissionsData] = await Promise.all([
        permissionsApi.getAllStaffPermissions(),
        permissionsApi.getAvailable(),
      ]);
      setStaff(staffData);
      setPermissions(permissionsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load permissions data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: UserPermissions) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || []);
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((p) => p !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await permissionsApi.updateUserPermissions(selectedUser.id, selectedPermissions);
      
      setStaff((prev) =>
        prev.map((s) =>
          s.id === selectedUser.id ? { ...s, permissions: selectedPermissions } : s
        )
      );

      toast({
        title: 'Success',
        description: `Permissions updated for ${selectedUser.full_name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Members
          </CardTitle>
          <CardDescription>Select a staff member to manage permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedUser?.id === user.id
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="font-medium">{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <Badge variant="outline" className="mt-1">
                {user.role}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {user.permissions?.length || 0} permissions
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {selectedUser ? `Permissions for ${selectedUser.full_name}` : 'Select a staff member'}
          </CardTitle>
          <CardDescription>
            {selectedUser
              ? `Assign custom permissions to ${selectedUser.role}`
              : 'Choose a staff member from the list to manage their permissions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {perms.map((perm) => (
                      <div key={perm.key} className="flex items-start space-x-3">
                        <Checkbox
                          id={perm.key}
                          checked={selectedPermissions.includes(perm.key)}
                          onCheckedChange={() => handleTogglePermission(perm.key)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={perm.key}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {perm.label}
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Permissions
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a staff member to manage their permissions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
