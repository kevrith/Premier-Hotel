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
import { Plus, Pencil, Trash2, UtensilsCrossed, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface UtensilItem {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  notes?: string;
}

interface Props {
  readOnly?: boolean;
}

const CATEGORIES = ['Crockery', 'Glassware', 'Cutlery', 'Equipment', 'Table', 'General'];
const EMPTY_FORM = { name: '', category: 'Crockery', sort_order: 0, notes: '' };

export function UtensilsManagement({ readOnly = false }: Props) {
  const { role } = useAuth();
  const canEdit = !readOnly && ['admin', 'manager'].includes(role || '');

  const [items, setItems] = useState<UtensilItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UtensilItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const grouped = items.reduce<Record<string, UtensilItem[]>>((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kitchen-stock/utensils');
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load utensils');
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

  const openEdit = (item: UtensilItem) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, sort_order: item.sort_order, notes: item.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/kitchen-stock/utensils/${editing.id}`, form);
        toast.success('Item updated');
      } else {
        await api.post('/kitchen-stock/utensils', form);
        toast.success('Item added');
      }
      setDialogOpen(false);
      await load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: UtensilItem) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    try {
      await api.delete(`/kitchen-stock/utensils/${item.id}`);
      toast.success('Item deactivated');
      await load();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Utensils Catalogue</CardTitle>
                <CardDescription>Manage the list of cups, plates, cutlery, glasses and equipment used in stock counts.</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
              {canEdit && (
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Badge variant="outline">{items.length} active items</Badge>
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
                      <th className="text-left px-3 py-2 font-medium">Notes</th>
                      {canEdit && <th className="text-center px-2 py-2 font-medium w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map(item => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{item.name}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{item.notes || '—'}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Utensil Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g. Dinner Plates" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
            <div>
              <Label>Sort Order</Label>
              <Input type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
