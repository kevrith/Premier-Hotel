import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, UserCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tablesAPI, RestaurantTable } from '@/lib/api/tables';
import apiClient from '@/lib/api/client';

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

const STATUS_COLORS: Record<RestaurantTable['status'], string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  occupied: 'bg-blue-100 text-blue-800 border-blue-200',
  reserved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<RestaurantTable['status'], string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  inactive: 'Inactive',
};

const EMPTY_FORM = {
  name: '',
  section: '',
  capacity: 4,
  notes: '',
  status: 'available' as RestaurantTable['status'],
};

export function TableManagement() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [waiters, setWaiters] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Add/Edit dialog
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Assign waiter dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningTable, setAssigningTable] = useState<RestaurantTable | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('none');
  const [assigning, setAssigning] = useState(false);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tablesData, staffData] = await Promise.all([
        tablesAPI.getAll(),
        apiClient.get('/staff/').then((r) => r.data).catch(() => []),
      ]);
      setTables(tablesData);
      const waiterList = (staffData as StaffMember[]).filter((s) => s.role === 'waiter');
      setWaiters(waiterList);
    } catch (err) {
      console.error('Failed to load tables:', err);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    inactive: tables.filter((t) => t.status === 'inactive').length,
  };

  const sections = Array.from(new Set(tables.map((t) => t.section).filter(Boolean) as string[])).sort();

  const filteredTables =
    sectionFilter === 'all' ? tables : tables.filter((t) => t.section === sectionFilter);

  // ── Form dialog helpers ────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingTable(null);
    setFormData(EMPTY_FORM);
    setShowFormDialog(true);
  };

  const openEditDialog = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormData({
      name: table.name,
      section: table.section ?? '',
      capacity: table.capacity,
      notes: table.notes ?? '',
      status: table.status,
    });
    setShowFormDialog(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Table name is required');
      return;
    }
    try {
      setSaving(true);
      if (editingTable) {
        const updated = await tablesAPI.update(editingTable.id, {
          name: formData.name.trim(),
          section: formData.section.trim() || undefined,
          capacity: formData.capacity,
          notes: formData.notes.trim() || undefined,
          status: formData.status,
        });
        setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success('Table updated');
      } else {
        const created = await tablesAPI.create({
          name: formData.name.trim(),
          section: formData.section.trim() || undefined,
          capacity: formData.capacity,
          notes: formData.notes.trim() || undefined,
        });
        setTables((prev) => [...prev, created]);
        toast.success('Table created');
      }
      setShowFormDialog(false);
    } catch (err) {
      console.error('Failed to save table:', err);
      toast.error('Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  // ── Assign waiter helpers ──────────────────────────────────────────────────

  const openAssignDialog = (table: RestaurantTable) => {
    setAssigningTable(table);
    setSelectedWaiterId(table.assigned_waiter_id ?? 'none');
    setShowAssignDialog(true);
  };

  const handleAssignWaiter = async () => {
    if (!assigningTable) return;
    try {
      setAssigning(true);
      const waiterId = selectedWaiterId === 'none' ? null : selectedWaiterId;
      const updated = await tablesAPI.assignWaiter(assigningTable.id, waiterId);
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(waiterId ? 'Waiter assigned' : 'Waiter unassigned');
      setShowAssignDialog(false);
    } catch (err) {
      console.error('Failed to assign waiter:', err);
      toast.error('Failed to assign waiter');
    } finally {
      setAssigning(false);
    }
  };

  // ── Delete helpers ─────────────────────────────────────────────────────────

  const openDeleteDialog = (table: RestaurantTable) => {
    setDeletingTable(table);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingTable) return;
    try {
      setDeleting(true);
      await tablesAPI.delete(deletingTable.id);
      setTables((prev) => prev.filter((t) => t.id !== deletingTable.id));
      toast.success('Table deleted');
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Failed to delete table:', err);
      toast.error('Failed to delete table');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Restaurant Tables</h2>
          <p className="text-muted-foreground text-sm">Manage dining tables, sections, and waiter assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Total Tables</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-3xl font-bold text-green-600">{stats.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Occupied</p>
            <p className="text-3xl font-bold text-blue-600">{stats.occupied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-3xl font-bold text-gray-500">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Filter */}
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sectionFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSectionFilter('all')}
          >
            All Sections
          </Button>
          {sections.map((sec) => (
            <Button
              key={sec}
              variant={sectionFilter === sec ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSectionFilter(sec)}
            >
              {sec}
            </Button>
          ))}
        </div>
      )}

      {/* Tables Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTables.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No tables found. Add your first table to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <Card key={table.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{table.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${STATUS_COLORS[table.status]}`}
                  >
                    {STATUS_LABELS[table.status]}
                  </Badge>
                </div>
                {table.section && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    {table.section}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{table.capacity} guests</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Waiter</span>
                  <span className="font-medium">
                    {table.assigned_waiter?.full_name ?? (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </span>
                </div>
                {table.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2">{table.notes}</p>
                )}
                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(table)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openAssignDialog(table)}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(table)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
            <DialogDescription>
              {editingTable ? 'Update table details below.' : 'Fill in the details to create a new table.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="table-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="table-name"
                placeholder="e.g. Tokyo, Table 1, VIP Terrace"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-section">Section</Label>
              <Input
                id="table-section"
                placeholder="e.g. Indoor, Terrace, Bar"
                value={formData.section}
                onChange={(e) => setFormData((f) => ({ ...f, section: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-capacity">Capacity</Label>
              <Input
                id="table-capacity"
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))
                }
              />
            </div>

            {editingTable && (
              <div className="space-y-2">
                <Label htmlFor="table-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, status: v as RestaurantTable['status'] }))
                  }
                >
                  <SelectTrigger id="table-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="table-notes">Notes</Label>
              <Input
                id="table-notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={saving || !formData.name.trim()}>
              {saving ? 'Saving...' : editingTable ? 'Save Changes' : 'Create Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Waiter Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Waiter</DialogTitle>
            <DialogDescription>
              Select a waiter to assign to <strong>{assigningTable?.name}</strong>, or choose "Unassign" to remove the current assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Waiter</Label>
              <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a waiter..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassign —</SelectItem>
                  {waiters.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.full_name}
                    </SelectItem>
                  ))}
                  {waiters.length === 0 && (
                    <SelectItem value="none" disabled>
                      No waiters found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssignWaiter} disabled={assigning}>
              {assigning ? 'Saving...' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingTable?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
