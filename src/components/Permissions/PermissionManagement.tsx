import React, { useState, useEffect } from 'react';
import { permissionsApi, Permission, UserPermissions } from '@/lib/api/permissions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, User, MapPin, RefreshCw } from 'lucide-react';
import api from '@/lib/api/client';

interface Location {
  id: string;
  name: string;
  type: string;
}

export const PermissionManagement: React.FC = () => {
  const [staff, setStaff] = useState<UserPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [assignedLocation, setAssignedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffData, permissionsData, locsRes] = await Promise.all([
        permissionsApi.getAllStaffPermissions(),
        permissionsApi.getAvailable(),
        api.get('/locations'),
      ]);
      setStaff(staffData);
      setPermissions(permissionsData);
      setLocations((locsRes.data as any) || []);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to load permissions data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: UserPermissions) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || []);
    setAssignedLocation((user as any).assigned_location_id || '');
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((p) => p !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await permissionsApi.updateUserPermissions(selectedUser.id, selectedPermissions);
      setStaff((prev) =>
        prev.map((s) => s.id === selectedUser.id ? { ...s, permissions: selectedPermissions } : s)
      );
      toast({ title: 'Success', description: `Permissions updated for ${selectedUser.full_name}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update permissions', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedUser) return;
    setSavingLocation(true);
    try {
      await api.post('/location-stock/assign-staff', {
        user_id: selectedUser.id,
        location_id: assignedLocation || null,
      });
      setStaff((prev) =>
        prev.map((s) => s.id === selectedUser.id
          ? { ...s, assigned_location_id: assignedLocation || null } as any
          : s)
      );
      toast({ title: 'Success', description: `Bar assignment saved for ${selectedUser.full_name}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.detail || 'Failed to save bar assignment', variant: 'destructive' });
    } finally {
      setSavingLocation(false);
    }
  };

  const getLocationName = (locId: string | undefined) => {
    if (!locId) return null;
    return locations.find(l => l.id === locId)?.name || null;
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const barLocations = locations.filter(l => l.type === 'bar');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Staff list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5" />
              Staff Members
            </CardTitle>
            <button
              type="button"
              onClick={loadData}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <CardDescription>Select a staff member to manage permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No staff found.</p>
          ) : (
            staff.map((user) => {
              const locName = getLocationName((user as any).assigned_location_id);
              return (
                <div
                  key={user.id}
                  onClick={(e) => { e.stopPropagation(); handleSelectUser(user); }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <Badge variant="outline" className="text-xs">{user.role}</Badge>
                    {locName && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />{locName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {user.permissions?.length || 0} permissions
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Permissions + Bar assignment panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {selectedUser ? `${selectedUser.full_name}` : 'Select a staff member'}
          </CardTitle>
          <CardDescription>
            {selectedUser
              ? `${selectedUser.role} — manage permissions and bar assignment`
              : 'Choose a staff member from the list'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-6">
              {/* Bar Assignment */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Bar Assignment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Assign this staff member to a bar location. Multiple staff can share the same bar.
                </p>
                <div className="flex gap-2 items-center">
                  <Select value={assignedLocation || 'none'} onValueChange={v => setAssignedLocation(v === 'none' ? '' : v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="No bar assigned (all access)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No bar assigned</SelectItem>
                      {barLocations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleSaveLocation} disabled={savingLocation}>
                    {savingLocation && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>

              {/* Permissions */}
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
                          <label htmlFor={perm.key} className="text-sm font-medium leading-none cursor-pointer">
                            {perm.label}
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">{perm.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                <Button onClick={handleSavePermissions} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Permissions
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a staff member to manage their permissions and bar assignment
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
