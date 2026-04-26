// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, Save, CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Briefcase, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OfficeItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  min_stock: number;
  is_active: boolean;
}

interface StockRow {
  item_id: string;
  name: string;
  unit: string;
  category: string;
  min_stock: number;
  opening_stock: number;
  received: number;
  used: number;
  closing_stock: number;
  notes: string;
  log_id?: string;
}

interface Props {
  readOnly?: boolean;
  branchId?: string;
}

const UNITS = ['pieces', 'boxes', 'rolls', 'reams', 'packets', 'bottles', 'kg', 'litres'];
const CATEGORIES = ['General', 'Dining', 'Hygiene', 'Stationery', 'Tools', 'Cleaning', 'Other'];

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function StockTakeTab({ readOnly, branchId }: { readOnly: boolean; branchId?: string }) {
  const { role } = useAuth();
  const canEdit = !readOnly && ['admin', 'manager'].includes(role || '');

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const loadDates = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (branchId) params.branch_id = branchId;
      const res = await api.get('/kitchen-stock/office/daily/dates', { params });
      const dates: string[] = res.data || [];
      if (!dates.includes(today)) dates.unshift(today);
      setAvailableDates(dates);
    } catch {
      setAvailableDates([today]);
    }
  }, [branchId, today]);

  const loadStock = useCallback(async (stockDate: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { stock_date: stockDate };
      if (branchId) params.branch_id = branchId;
      const res = await api.get('/kitchen-stock/office/daily', { params });
      setRows((res.data.items || []).map((it: any) => ({
        item_id: it.item_id,
        name: it.name,
        unit: it.unit,
        category: it.category,
        min_stock: it.min_stock ?? 0,
        opening_stock: it.opening_stock ?? 0,
        received: it.received ?? 0,
        used: it.used ?? 0,
        closing_stock: it.closing_stock ?? 0,
        notes: it.notes ?? '',
        log_id: it.log_id,
      })));
    } catch {
      toast.error('Failed to load office stock');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadDates(); }, [loadDates]);
  useEffect(() => { loadStock(selectedDate); }, [selectedDate, loadStock]);

  const update = (idx: number, field: keyof StockRow, value: string | number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      if (['opening_stock', 'received', 'used'].includes(field as string)) {
        updated.closing_stock = updated.opening_stock + updated.received - updated.used;
        if (updated.closing_stock < 0) updated.closing_stock = 0;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const params: Record<string, string> = { stock_date: selectedDate };
      if (branchId) params.branch_id = branchId;
      await api.post('/kitchen-stock/office/daily', rows, { params });
      toast.success('Office stock saved');
      await loadDates();
    } catch {
      toast.error('Failed to save office stock');
    } finally {
      setSaving(false);
    }
  };

  const navigate = (dir: 'prev' | 'next') => {
    const idx = availableDates.indexOf(selectedDate);
    if (dir === 'prev' && idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
    if (dir === 'next' && idx > 0) setSelectedDate(availableDates[idx - 1]);
  };

  const isToday = selectedDate === today;
  const idx = availableDates.indexOf(selectedDate);

  // Group by category
  const byCategory: Record<string, StockRow[]> = {};
  rows.forEach(r => {
    const cat = r.category || 'General';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });
  const rowIndex = (row: StockRow) => rows.findIndex(r => r.item_id === row.item_id);

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
          <button
            className="px-2 py-2 hover:bg-muted disabled:opacity-40 transition-colors"
            onClick={() => navigate('prev')}
            disabled={idx >= availableDates.length - 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 min-w-[200px]">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent border-0 outline-none text-sm font-medium text-foreground cursor-pointer"
            />
          </div>
          <button
            className="px-2 py-2 hover:bg-muted disabled:opacity-40 transition-colors"
            onClick={() => navigate('next')}
            disabled={idx <= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {isToday && <Badge className="bg-green-500/10 text-green-700 border-green-500/30">Today</Badge>}
        {selectedDate !== today && (
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>Go to Today</Button>
        )}

        <Button variant="ghost" size="sm" onClick={() => loadStock(selectedDate)} disabled={loading} className="ml-auto">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        {canEdit && (
          <Button onClick={handleSave} disabled={saving || loading} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : 'Save Stock'}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{fmt(selectedDate)}</p>

      {/* Stock table by category */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, catRows]) => (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-semibold">Item</th>
                        <th className="text-center px-3 py-2.5 font-semibold min-w-[90px]">Opening</th>
                        <th className="text-center px-3 py-2.5 font-semibold min-w-[90px]">Received</th>
                        <th className="text-center px-3 py-2.5 font-semibold min-w-[90px]">Used</th>
                        <th className="text-center px-3 py-2.5 font-semibold min-w-[90px]">Closing</th>
                        <th className="text-center px-3 py-2.5 font-semibold min-w-[70px]">Min</th>
                        <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catRows.map((row, ci) => {
                        const i = rowIndex(row);
                        const isLow = row.closing_stock < row.min_stock && row.min_stock > 0;
                        return (
                          <tr key={row.item_id} className={`border-b last:border-0 ${ci % 2 === 0 ? '' : 'bg-muted/20'} ${isLow ? 'bg-amber-500/5' : ''}`}>
                            <td className="px-4 py-2 font-medium">
                              {row.name}
                              <span className="text-xs text-muted-foreground ml-1">({row.unit})</span>
                            </td>
                            {(['opening_stock', 'received', 'used'] as const).map(field => (
                              <td key={field} className="px-3 py-2 text-center">
                                {canEdit ? (
                                  <Input
                                    type="number"
                                    min={0}
                                    step="1"
                                    placeholder="0"
                                    value={row[field] || ''}
                                    onChange={e => update(i, field, parseFloat(e.target.value) || 0)}
                                    className="w-20 text-center h-8 mx-auto"
                                  />
                                ) : <span>{row[field]}</span>}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center font-semibold">
                              {canEdit ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  placeholder="0"
                                  value={row.closing_stock || ''}
                                  onChange={e => update(i, 'closing_stock', parseFloat(e.target.value) || 0)}
                                  className={`w-20 text-center h-8 mx-auto ${isLow ? 'border-amber-400' : ''}`}
                                />
                              ) : <span className={isLow ? 'text-amber-600 font-bold' : ''}>{row.closing_stock}</span>}
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-muted-foreground">{row.min_stock}</td>
                            <td className="px-3 py-2 text-center">
                              {row.closing_stock <= 0 ? (
                                <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">Out</Badge>
                              ) : isLow ? (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">Low</Badge>
                              ) : (
                                <Badge className="bg-green-500/10 text-green-700 border-green-500/30 text-xs">OK</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {canEdit ? (
                                <Input
                                  value={row.notes}
                                  onChange={e => update(i, 'notes', e.target.value)}
                                  placeholder="Note"
                                  className="h-8 min-w-[100px]"
                                />
                              ) : <span className="text-muted-foreground">{row.notes || '—'}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Date history pills */}
      {availableDates.length > 1 && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs text-muted-foreground pt-1">Recent dates:</span>
          {availableDates.slice(0, 10).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                d === selectedDate
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted hover:bg-muted/80 border-border text-muted-foreground'
              }`}
            >
              {d === today ? 'Today' : d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsTab({ readOnly }: { readOnly: boolean }) {
  const { role } = useAuth();
  const canEdit = !readOnly && ['admin', 'manager'].includes(role || '');

  const [items, setItems] = useState<OfficeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState<OfficeItem | null>(null);
  const [deleting, setDeleting] = useState<OfficeItem | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'pieces', category: 'General', min_stock: 0, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kitchen-stock/office/items');
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load office items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', unit: 'pieces', category: 'General', min_stock: 0, sort_order: items.length + 1 });
    setShowDialog(true);
  };

  const openEdit = (item: OfficeItem) => {
    setEditing(item);
    setForm({ name: item.name, unit: item.unit, category: item.category, min_stock: item.min_stock, sort_order: 0 });
    setShowDialog(true);
  };

  const openDelete = (item: OfficeItem) => {
    setDeleting(item);
    setShowDeleteConfirm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/kitchen-stock/office/items/${editing.id}`, form);
        toast.success('Item updated');
      } else {
        await api.post('/kitchen-stock/office/items', form);
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

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/kitchen-stock/office/items/${deleting.id}`);
      toast.success(`"${deleting.name}" removed`);
      setShowDeleteConfirm(false);
      load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {canEdit ? 'Add, edit, or remove items tracked in the office.' : 'View-only list of office stock items.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canEdit && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />Add Item
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold">Item</th>
                    <th className="text-center px-4 py-3 font-semibold">Category</th>
                    <th className="text-center px-4 py-3 font-semibold">Unit</th>
                    <th className="text-center px-4 py-3 font-semibold">Min Stock</th>
                    {canEdit && <th className="text-right px-4 py-3 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-2.5 font-medium">{item.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{item.unit}</td>
                      <td className="px-4 py-2.5 text-center">{item.min_stock}</td>
                      {canEdit && (
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDelete(item)}
                              className="text-muted-foreground hover:text-red-500" title="Remove">
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
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Office Item' : 'Add Office Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Item Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Serviettes" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, category: c }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
                      {c}
                    </button>
                  ))}
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
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Minimum Stock</Label>
                <Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                {editing ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      {canEdit && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove "{deleting?.name}"?</DialogTitle>
              <DialogDescription>
                The item will be removed from the office stock catalogue. Existing stock records for this item are preserved.
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

export function OfficeStockTake({ readOnly = false, branchId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-blue-500" />
        <div>
          <h3 className="font-semibold">Office Stock</h3>
          <p className="text-xs text-muted-foreground">Track serviettes, tissues, stationery, and other office supplies.</p>
        </div>
      </div>

      <Tabs defaultValue="stock-take" className="w-full">
        <TabsList className="h-auto">
          <TabsTrigger value="stock-take" className="text-xs sm:text-sm">Stock Take</TabsTrigger>
          <TabsTrigger value="items" className="text-xs sm:text-sm">Item Catalogue</TabsTrigger>
        </TabsList>
        <TabsContent value="stock-take" className="mt-4">
          <StockTakeTab readOnly={readOnly} branchId={branchId} />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          <ItemsTab readOnly={readOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
