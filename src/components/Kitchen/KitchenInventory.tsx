// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Package, Plus, Minus, AlertTriangle, RefreshCw, Pencil, Trash2, Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface KitchenItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  current_quantity: number;
  min_stock: number;
  sort_order: number;
  is_active: boolean;
  notes?: string;
}

interface Props {
  readOnly?: boolean;
}

const UNITS = ['kg', 'litres', 'pieces', 'grams', 'ml', 'packs', 'bags', 'dozen', 'trays'];
const CATEGORIES = ['Protein', 'Dairy', 'Grains', 'Vegetables', 'Snacks', 'Oils', 'Spices', 'Beverages', 'General'];
const REASONS = ['', 'Restocked', 'Used in cooking', 'Spoilage', 'Theft', 'Breakage', 'Transfer', 'Correction', 'Other'];

export function KitchenInventory({ readOnly = false }: Props) {
  const { role } = useAuth();
  const { hasPermission } = usePermissions();

  const canAdjust = !readOnly && (
    ['admin', 'manager', 'chef'].includes(role || '') ||
    hasPermission('can_manage_kitchen_inventory')
  );
  const canCrud = !readOnly && ['admin', 'manager'].includes(role || '');

  const [items, setItems] = useState<KitchenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<KitchenItem | null>(null);
  const [delta, setDelta] = useState('0');
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', unit: 'kg', category: 'General',
    current_quantity: 0, min_stock: 0, sort_order: 0, notes: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kitchen-stock/items');
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load kitchen inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowStock = items.filter(i => i.is_active && i.current_quantity < i.min_stock && i.min_stock > 0);

  // ── Adjust stock ──────────────────────────────────────────────────────────
  const openAdjust = (item: KitchenItem) => {
    setSelected(item);
    setDelta('0');
    setReason('');
    setShowAdjust(true);
  };

  const handleAdjust = async () => {
    if (!selected) return;
    const d = parseFloat(delta);
    if (isNaN(d) || d === 0) { toast.error('Enter a non-zero adjustment'); return; }
    const newQty = selected.current_quantity + d;
    if (newQty < 0) { toast.error('Cannot reduce below zero'); return; }
    setAdjusting(true);
    try {
      await api.post(`/kitchen-stock/items/${selected.id}/adjust`, { delta: d, reason });
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, current_quantity: newQty } : i));
      toast.success(`${selected.name} updated to ${newQty.toFixed(2)} ${selected.unit}`);
      setShowAdjust(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  // ── Add / Edit item ───────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', unit: 'kg', category: 'General', current_quantity: 0, min_stock: 0, sort_order: items.length + 1, notes: '' });
    setShowForm(true);
  };

  const openEdit = (item: KitchenItem) => {
    setSelected(item);
    setForm({
      name: item.name, unit: item.unit, category: item.category,
      current_quantity: item.current_quantity, min_stock: item.min_stock,
      sort_order: item.sort_order, notes: item.notes || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/kitchen-stock/items/${selected.id}`, form);
        toast.success('Item updated');
      } else {
        await api.post('/kitchen-stock/items', form);
        toast.success('Item added');
      }
      setShowForm(false);
      load();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete item ───────────────────────────────────────────────────────────
  const openDelete = (item: KitchenItem) => {
    setSelected(item);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/kitchen-stock/items/${selected.id}`);
      toast.success(`"${selected.name}" removed`);
      setShowDeleteConfirm(false);
      load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Group by category ─────────────────────────────────────────────────────
  const grouped: Record<string, KitchenItem[]> = {};
  items.filter(i => i.is_active).forEach(item => {
    const cat = item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base">Kitchen Inventory</h3>
          <p className="text-xs text-muted-foreground">
            {canAdjust
              ? canCrud
                ? 'Full access — adjust quantities, add, edit, or remove items.'
                : 'Adjust stock quantities. Contact admin to add/remove items.'
              : 'View-only — contact kitchen staff or manager to update.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCrud && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-red-400 border-2 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Warning — {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below minimum
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {lowStock.map(item => (
                <Badge key={item.id} variant="destructive" className="text-xs">
                  {item.name}: {item.current_quantity} {item.unit} (min {item.min_stock})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items grid by category */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No items in kitchen inventory.</p>
          {canCrud && <Button size="sm" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add First Item</Button>}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{cat}</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catItems.map(item => {
                  const isLow = item.min_stock > 0 && item.current_quantity < item.min_stock;
                  const isOut = item.current_quantity <= 0;
                  return (
                    <Card key={item.id} className={`relative ${isOut ? 'border-red-400' : isLow ? 'border-orange-300' : ''}`}>
                      {/* CRUD actions for admin/manager */}
                      {canCrud && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{item.category}</CardDescription>
                          </div>
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            {canCrud && (
                              <>
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit item"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => openDelete(item)}
                                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <Package className={`h-4 w-4 mt-0.5 ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-muted-foreground'}`} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-3xl font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : ''}`}>
                              {item.current_quantity % 1 === 0 ? item.current_quantity : item.current_quantity.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground text-sm">{item.unit}</span>
                          </div>
                          {item.min_stock > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Min stock: {item.min_stock} {item.unit}
                            </p>
                          )}
                        </div>

                        {isOut ? (
                          <Badge className="w-full justify-center bg-red-500/10 text-red-600 border-red-400/40">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge className="w-full justify-center bg-orange-500/10 text-orange-600 border-orange-400/40">
                            <AlertTriangle className="h-3 w-3 mr-1" />Low Stock
                          </Badge>
                        ) : null}

                        {canAdjust ? (
                          <Button
                            onClick={() => openAdjust(item)}
                            className="w-full h-11 text-sm font-semibold"
                            variant={isLow ? 'default' : 'outline'}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Adjust Stock
                          </Button>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2">
                            <Eye className="h-3.5 w-3.5" />
                            View only
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Adjust Stock Dialog ── */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock: {selected?.name}</DialogTitle>
            <DialogDescription>
              Current: <strong>{selected?.current_quantity} {selected?.unit}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Adjustment Amount ({selected?.unit})
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-11 w-11 flex-shrink-0"
                  onClick={() => setDelta(d => (parseFloat(d) - 1).toString())}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={delta}
                  onChange={e => setDelta(e.target.value)}
                  className="text-center text-xl h-11 font-semibold"
                  step="0.1"
                />
                <Button variant="outline" size="icon" className="h-11 w-11 flex-shrink-0"
                  onClick={() => setDelta(d => (parseFloat(d) + 1).toString())}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Positive = add stock · Negative = reduce stock
              </p>
            </div>

            {selected && delta !== '0' && !isNaN(parseFloat(delta)) && (
              <div className={`p-3 rounded-lg ${parseFloat(delta) < 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}>
                <p className="text-xs text-muted-foreground">New quantity will be:</p>
                <p className="text-2xl font-bold mt-0.5">
                  {Math.max(0, selected.current_quantity + (parseFloat(delta) || 0)).toFixed(2)} {selected.unit}
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Reason (optional)</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => (
                    <SelectItem key={r} value={r || '__none__'}>{r || 'No reason'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjust(false)} className="h-11">Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjusting} className="h-11 font-semibold">
              {adjusting && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Dialog ── */}
      {canCrud && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selected ? 'Edit Item' : 'Add Kitchen Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chicken" />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium mb-1.5 block">Unit</Label>
                <div className="flex flex-wrap gap-1.5">
                  {UNITS.map(u => (
                    <button key={u} type="button" onClick={() => setForm(f => ({ ...f, unit: u }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.unit === u ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
                      {u}
                    </button>
                  ))}
                </div>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Or type custom unit" className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Current Quantity</Label>
                  <Input type="number" min={0} step="0.1" value={form.current_quantity}
                    onChange={e => setForm(f => ({ ...f, current_quantity: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Min Stock (alert below)</Label>
                  <Input type="number" min={0} step="0.1" value={form.min_stock}
                    onChange={e => setForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium mb-1.5 block">Notes (optional)</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Storage notes, supplier info…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                {selected ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {canCrud && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove "{selected?.name}"?</DialogTitle>
              <DialogDescription>
                The item will be deactivated and hidden from the inventory. Historical stock records are preserved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Remove Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
