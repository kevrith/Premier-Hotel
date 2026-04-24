// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Leaf, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  category: string;
  current_stock: number;
  min_stock: number;
  sort_order: number;
  is_active: boolean;
  notes?: string;
}

interface Props {
  readOnly?: boolean;
}

const UNITS = ['kg', 'litres', 'pieces', 'grams', 'ml', 'packs', 'bags', 'bunches', 'loaves', 'dozen', 'trays'];
const CATEGORIES = ['Vegetables', 'Oils & Spices', 'Dry Goods', 'Dairy & Fats', 'Protein', 'Beverages', 'General'];

const EMPTY_FORM = { name: '', unit: 'kg', category: 'Vegetables', current_stock: 0, min_stock: 0, sort_order: 0, notes: '' };

export function IngredientsManagement({ readOnly = false }: Props) {
  const { role } = useAuth();
  const canEdit = !readOnly && ['admin', 'manager'].includes(role || '');

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const grouped = items.reduce<Record<string, Ingredient[]>>((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kitchen-stock/ingredients', { params: { include_inactive: false } });
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: Ingredient) => {
    setEditing(item);
    setForm({
      name: item.name,
      unit: item.unit,
      category: item.category,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      sort_order: item.sort_order,
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/kitchen-stock/ingredients/${editing.id}`, form);
        toast.success('Ingredient updated');
      } else {
        await api.post('/kitchen-stock/ingredients', form);
        toast.success('Ingredient added');
      }
      setDialogOpen(false);
      await load();
    } catch {
      toast.error('Failed to save ingredient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Ingredient) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    try {
      await api.delete(`/kitchen-stock/ingredients/${item.id}`);
      toast.success('Ingredient deactivated');
      await load();
    } catch {
      toast.error('Failed to deactivate ingredient');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-lg">Ingredients Management</CardTitle>
                <CardDescription>Manage the raw ingredient catalogue used in daily stock takes.</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Add Ingredient
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Badge variant="outline">{items.length} active ingredients</Badge>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-center px-2 py-2 font-medium w-20">Unit</th>
                      <th className="text-center px-2 py-2 font-medium w-28">Current Stock</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Min Stock</th>
                      <th className="text-left px-2 py-2 font-medium">Notes</th>
                      {canEdit && <th className="text-center px-2 py-2 font-medium w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map(item => {
                      const isLow = item.current_stock <= item.min_stock && item.min_stock > 0;
                      return (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">
                            {item.name}
                            {isLow && <Badge variant="destructive" className="ml-2 text-xs">Low</Badge>}
                          </td>
                          <td className="px-2 py-2 text-center text-muted-foreground text-xs">{item.unit}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={isLow ? 'text-red-600 font-semibold' : ''}>
                              {item.current_stock ?? 0}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center text-muted-foreground">{item.min_stock ?? 0}</td>
                          <td className="px-2 py-2 text-muted-foreground text-xs">{item.notes || '—'}</td>
                          {canEdit && (
                            <td className="px-2 py-2 text-center">
                              <div className="flex gap-1 justify-center">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No ingredients yet. {canEdit ? 'Click "Add Ingredient" to get started.' : ''}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g. Spinach" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Current Stock</Label>
                <Input type="number" min="0" step="0.001" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Min Stock (alert)</Label>
                <Input type="number" min="0" step="0.001" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} placeholder="Any notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
