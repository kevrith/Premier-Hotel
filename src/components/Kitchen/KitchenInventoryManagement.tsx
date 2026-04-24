// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, Plus, Pencil, Package, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface KitchenItem {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  readOnly?: boolean;
}

const UNITS = ['kg', 'litres', 'pieces', 'grams', 'ml', 'packs', 'bags', 'dozen', 'trays'];

export function KitchenInventoryManagement({ readOnly = false }: Props) {
  const { role } = useAuth();
  const canEdit = !readOnly && ['admin', 'manager'].includes(role || '');

  const [items, setItems] = useState<KitchenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<KitchenItem | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kitchen-stock/items');
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load kitchen items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', unit: 'kg', sort_order: items.length + 1 });
    setShowDialog(true);
  };

  const openEdit = (item: KitchenItem) => {
    setEditing(item);
    setForm({ name: item.name, unit: item.unit, sort_order: item.sort_order });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/kitchen-stock/items/${editing.id}`, form);
        toast.success('Item updated');
      } else {
        await api.post('/kitchen-stock/items', form);
        toast.success('Item added');
      }
      setShowDialog(false);
      load();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: KitchenItem) => {
    try {
      await api.put(`/kitchen-stock/items/${item.id}`, { is_active: !item.is_active });
      toast.success(item.is_active ? 'Item deactivated' : 'Item activated');
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                Kitchen Inventory Items
              </CardTitle>
              <CardDescription>
                {canEdit
                  ? 'Manage the list of tracked kitchen ingredients and supplies.'
                  : 'View-only — only admin/manager can add or edit items.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {canEdit && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No kitchen items yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Item Name</th>
                    <th className="text-center px-4 py-3 font-semibold">Unit</th>
                    <th className="text-center px-4 py-3 font-semibold">Status</th>
                    {canEdit && <th className="text-right px-4 py-3 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className={`border-b last:border-0 ${!item.is_active ? 'opacity-50' : ''} ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-3 text-muted-foreground">{item.sort_order || i + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">{item.unit}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={item.is_active
                          ? 'bg-green-500/10 text-green-700 border-green-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                        }>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={item.is_active ? 'text-muted-foreground' : 'text-green-600'}
                              onClick={() => toggleActive(item)}
                            >
                              {item.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      {canEdit && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Kitchen Item' : 'Add Kitchen Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Item Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Chicken"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Unit *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {UNITS.map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, unit: u }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.unit === u
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border hover:bg-muted/80'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <Input
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Or type custom unit"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  min={1}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
