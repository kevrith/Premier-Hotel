import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api/client';
import { Trash2, ChevronDown, ChevronRight, Package, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  phone?: string;
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
  stock_quantity: number;
  cost_price: number;
}

interface ReceiptLine {
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
}

interface ReceiptHistoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  menu_item_id?: string;
}

interface Receipt {
  id: string;
  receipt_number: string;
  received_at: string;
  supplier_name: string;
  supplier_phone?: string;
  received_by_name: string;
  location_name?: string;
  total_cost: number;
  notes?: string;
  items: ReceiptHistoryItem[];
}

export function StockReceiving() {
  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [locationId, setLocationId] = useState('__none__');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ReceiptLine[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MenuItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Reference data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);

  // History state
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReferenceData();
    loadHistory();
  }, []);

  // Filter menu items as user types
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const filtered = allItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
    );
    setSearchResults(filtered.slice(0, 10));
    setShowDropdown(filtered.length > 0);
  }, [searchQuery, allItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadReferenceData() {
    try {
      const [supRes, locRes, itemRes] = await Promise.all([
        api.get('/purchase-orders/suppliers?limit=500'),
        api.get('/locations'),
        api.get('/stock/levels'),
      ]);
      setSuppliers(supRes.data?.suppliers || supRes.data || []);
      const locs: Location[] = locRes.data || [];
      setLocations(locs);
      // Auto-select the first store-type location (Central Store) so stock always lands somewhere
      const defaultLoc = locs.find(l => l.type === 'store') || locs[0];
      if (defaultLoc) setLocationId(defaultLoc.id);
      const raw: any[] = itemRes.data?.items || itemRes.data || [];
      setAllItems(
        raw.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category || '',
          stock_quantity: m.stock_quantity ?? m.quantity ?? 0,
          cost_price: m.cost_price ?? 0,
        }))
      );
    } catch {
      toast.error('Failed to load reference data');
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await api.get('/purchase-orders/direct-receive?limit=50');
      setReceipts(res.data || []);
    } catch {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  }

  function addItem(item: MenuItem) {
    // Skip if already added
    if (lines.some((l) => l.menu_item_id === item.id)) {
      setSearchQuery('');
      setShowDropdown(false);
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        menu_item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_cost: item.cost_price ?? 0,
      },
    ]);
    setSearchQuery('');
    setShowDropdown(false);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: 'quantity' | 'unit_cost', value: string) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: parseFloat(value) || 0 } : l))
    );
  }

  const runningTotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0);

  async function handleSubmit() {
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (lines.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    for (const l of lines) {
      if (l.quantity <= 0) {
        toast.error(`Quantity must be > 0 for "${l.item_name}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        supplier_id: supplierId,
        received_at: receivedAt,
        notes: notes || null,
        items: lines,
      };
      if (locationId && locationId !== '__none__') {
        payload.location_id = locationId;
      }

      const res = await api.post('/purchase-orders/direct-receive', payload);
      const d = res.data;
      toast.success(
        `Receipt ${d.receipt_number} saved — ${d.items_received} item(s), KES ${Number(d.total_cost).toLocaleString()}`
      );

      // Reset form
      setSupplierId('');
      setLocationId('__none__');
      setReceivedAt(new Date().toISOString().split('T')[0]);
      setNotes('');
      setLines([]);
      loadHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save receipt');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* ── New Receipt Form ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-5 w-5" />
            Receive Stock from Supplier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier…" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Receive into Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Central store / none" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No specific location —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}{' '}
                      <span className="text-muted-foreground capitalize text-xs">({l.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Date Received</Label>
              <Input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Item search */}
          <div ref={searchRef} className="relative">
            <Label>Search &amp; Add Items</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Type item name or category to add…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setShowDropdown(searchResults.length > 0);
                }}
              />
            </div>
            {showDropdown && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-md">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addItem(item);
                    }}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {item.category} · stock: {item.stock_quantity}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line items table */}
          {lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium min-w-[180px]">Item</th>
                    <th className="pb-2 font-medium w-28 text-right">Qty</th>
                    <th className="pb-2 font-medium w-32 text-right">Unit Cost (KES)</th>
                    <th className="pb-2 font-medium w-28 text-right">Subtotal</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, idx) => (
                    <tr key={`${line.menu_item_id}-${idx}`}>
                      <td className="py-2 pr-2 font-medium">{line.item_name}</td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-8 w-24 text-right ml-auto"
                          value={line.quantity || ''}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-8 w-32 text-right ml-auto"
                          value={line.unit_cost || ''}
                          onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {(line.quantity * line.unit_cost).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={3} className="pt-3 text-right pr-2">
                      Total
                    </td>
                    <td className="pt-3 text-right tabular-nums pr-2">
                      KES{' '}
                      {runningTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
              Use the search above to add items to this receipt
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting || lines.length === 0 || !supplierId}
            >
              {submitting
                ? 'Saving…'
                : `Save Receipt${lines.length > 0 ? ` (${lines.length} item${lines.length !== 1 ? 's' : ''})` : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Receiving History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Receiving History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No receipts yet</p>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="border rounded-md overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(r.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {expandedIds.has(r.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {r.receipt_number}
                      </Badge>
                      <span className="font-medium truncate">{r.supplier_name}</span>
                      {r.location_name && (
                        <span className="text-muted-foreground text-xs hidden sm:inline">
                          → {r.location_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-2">
                      <span className="text-muted-foreground text-xs hidden sm:inline">
                        {r.received_at}
                      </span>
                      <span className="font-semibold tabular-nums">
                        KES{' '}
                        {Number(r.total_cost).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </button>

                  {expandedIds.has(r.id) && (
                    <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>Date: {r.received_at}</span>
                        {r.received_by_name && <span>Received by: {r.received_by_name}</span>}
                        {r.location_name && <span>Location: {r.location_name}</span>}
                        {r.notes && <span>Notes: {r.notes}</span>}
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="pb-1 font-medium">Item</th>
                            <th className="pb-1 font-medium text-right">Qty</th>
                            <th className="pb-1 font-medium text-right">Unit Cost</th>
                            <th className="pb-1 font-medium text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(r.items || []).map((item) => (
                            <tr key={item.id}>
                              <td className="py-1.5">{item.item_name}</td>
                              <td className="py-1.5 text-right tabular-nums">{item.quantity}</td>
                              <td className="py-1.5 text-right tabular-nums">
                                {Number(item.unit_cost).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-1.5 text-right tabular-nums font-medium">
                                {Number(item.subtotal).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
