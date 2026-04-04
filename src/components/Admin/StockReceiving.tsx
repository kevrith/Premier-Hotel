import React, { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2, PackageCheck, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
  contact_person?: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

interface ReceiveItem {
  menu_item_id: string;
  item_name: string;
  quantity: string;
  unit_cost: string;
  notes: string;
}

interface Receipt {
  id: string;
  receipt_number: string;
  supplier_name: string;
  supplier_phone?: string;
  received_by_name: string;
  location_name?: string;
  received_at: string;
  total_cost: number;
  notes?: string;
  items: {
    id: string;
    item_name: string;
    quantity: number;
    unit_cost: number;
    subtotal: number;
  }[];
}

const emptyItem = (): ReceiveItem => ({
  menu_item_id: '',
  item_name: '',
  quantity: '',
  unit_cost: '',
  notes: '',
});

export function StockReceiving() {
  const { toast } = useToast();

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiveItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // History
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New supplier dialog
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    loadReferenceData();
    loadHistory();
  }, []);

  const loadReferenceData = async () => {
    setLoadingRef(true);
    try {
      const [supRes, locRes, menuRes] = await Promise.all([
        api.get('/purchase-orders/suppliers'),
        api.get('/locations'),
        api.get('/menu/items?limit=500'),
      ]);
      setSuppliers((supRes.data as any)?.suppliers || supRes.data || []);
      setLocations((locRes.data as any) || []);
      const raw = (menuRes.data as any);
      setMenuItems((raw?.items || raw || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category || '',
      })));
    } catch {
      toast({ title: 'Error', description: 'Failed to load reference data', variant: 'destructive' });
    } finally {
      setLoadingRef(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/purchase-orders/direct-receive?limit=30');
      setReceipts((res.data as any) || []);
    } catch {
      // silently ignore history load failure
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setSavingSupplier(true);
    try {
      const res = await api.post('/purchase-orders/suppliers', {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
        contact_person: newSupplierContact.trim() || undefined,
      });
      const created = (res.data as any);
      const newSup: Supplier = { id: created.id, name: created.name, phone: created.phone };
      setSuppliers(prev => [newSup, ...prev]);
      setSupplierId(newSup.id);
      setShowNewSupplier(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      setNewSupplierContact('');
      toast({ title: 'Success', description: `Supplier "${newSup.name}" created` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.detail || 'Failed to create supplier', variant: 'destructive' });
    } finally {
      setSavingSupplier(false);
    }
  };

  const updateItem = (index: number, field: keyof ReceiveItem, value: string) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, [field]: value };
      // Auto-fill item name when menu item is selected
      if (field === 'menu_item_id' && value) {
        const mi = menuItems.find(m => m.id === value);
        if (mi) updated.item_name = mi.name;
      }
      return updated;
    }));
  };

  const addRow = () => setItems(prev => [...prev, emptyItem()]);

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((sum, it) => {
    const q = parseFloat(it.quantity) || 0;
    const c = parseFloat(it.unit_cost) || 0;
    return sum + q * c;
  }, 0);

  const handleSubmit = async () => {
    if (!supplierId) {
      toast({ title: 'Supplier required', description: 'Please select or create a supplier', variant: 'destructive' });
      return;
    }
    const validItems = items.filter(it => it.item_name.trim() && parseFloat(it.quantity) > 0);
    if (!validItems.length) {
      toast({ title: 'No items', description: 'Add at least one item with a name and quantity', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierId,
        location_id: locationId || undefined,
        received_at: receivedAt,
        notes: notes.trim() || undefined,
        items: validItems.map(it => ({
          menu_item_id: it.menu_item_id || undefined,
          item_name: it.item_name.trim(),
          quantity: parseFloat(it.quantity),
          unit_cost: parseFloat(it.unit_cost) || 0,
          notes: it.notes.trim() || undefined,
        })),
      };
      const res = await api.post('/purchase-orders/direct-receive', payload);
      const result = res.data as any;
      toast({
        title: 'Stock received',
        description: `${result.receipt_number} — ${result.items_received} items, KES ${result.total_cost.toLocaleString()}`,
      });
      // Reset form
      setSupplierId('');
      setLocationId('');
      setNotes('');
      setItems([emptyItem()]);
      setReceivedAt(new Date().toISOString().split('T')[0]);
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.detail || 'Failed to receive stock', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRef) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Receive Form ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Receive Stock
          </CardTitle>
          <CardDescription>
            Record goods received from a supplier. Stock quantities update immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Supplier + Date + Location row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>
                Supplier <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className={!supplierId ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Select supplier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.phone ? ` · ${s.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowNewSupplier(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Date Received</Label>
              <Input
                type="date"
                value={receivedAt}
                onChange={e => setReceivedAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Receive Into (Location)</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations / unspecified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific location</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} <span className="text-muted-foreground text-xs">({l.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Menu Item</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-[110px]">Qty</TableHead>
                  <TableHead className="w-[130px]">Unit Cost (KES)</TableHead>
                  <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const subtotal = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={it.menu_item_id}
                          onValueChange={v => updateItem(idx, 'menu_item_id', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Link to menu item…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— no link —</SelectItem>
                            {menuItems.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} {m.category ? `(${m.category})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-sm"
                          placeholder="e.g. Soda 300ml"
                          value={it.item_name}
                          onChange={e => updateItem(idx, 'item_name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={it.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={it.unit_cost}
                          onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {subtotal > 0 ? `KES ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={items.length === 1}
                          className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Grand Total</div>
              <div className="text-xl font-bold">
                KES {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="e.g. Delivery note #123, partial order…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
              Receive Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Receiving History ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Receiving History</CardTitle>
            <button
              type="button"
              onClick={loadHistory}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No receipts yet.</p>
          ) : (
            <div className="space-y-2">
              {receipts.map(rec => (
                <div key={rec.id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">{rec.receipt_number}</Badge>
                      <span className="font-medium text-sm">{rec.supplier_name}</span>
                      {rec.location_name && (
                        <Badge variant="secondary" className="text-xs">{rec.location_name}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(rec.received_at), 'dd MMM yyyy')}
                      </span>
                      <span className="text-xs text-muted-foreground">by {rec.received_by_name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-sm">
                        KES {Number(rec.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {expandedId === rec.id
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {expandedId === rec.id && (
                    <div className="border-t px-4 py-3 bg-muted/20">
                      {rec.notes && (
                        <p className="text-xs text-muted-foreground mb-3">Note: {rec.notes}</p>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Unit Cost</TableHead>
                            <TableHead className="text-xs text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rec.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm py-1.5">{item.item_name}</TableCell>
                              <TableCell className="text-sm py-1.5 text-right">{item.quantity}</TableCell>
                              <TableCell className="text-sm py-1.5 text-right">
                                KES {Number(item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-sm py-1.5 text-right font-medium">
                                KES {Number(item.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="text-right mt-2 font-bold text-sm">
                        Total: KES {Number(rec.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── New Supplier Dialog ── */}
      <Dialog open={showNewSupplier} onOpenChange={setShowNewSupplier}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Nairobi Beverages Ltd"
                value={newSupplierName}
                onChange={e => setNewSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                placeholder="+254 7XX XXX XXX"
                value={newSupplierPhone}
                onChange={e => setNewSupplierPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input
                placeholder="Contact name"
                value={newSupplierContact}
                onChange={e => setNewSupplierContact(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowNewSupplier(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateSupplier} disabled={savingSupplier || !newSupplierName.trim()}>
                {savingSupplier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Supplier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
