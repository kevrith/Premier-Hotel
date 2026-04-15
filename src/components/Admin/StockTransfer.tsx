import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api/client';
import { Trash2, ChevronDown, ChevronRight, ArrowRight, Search, Shuffle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Location {
  id: string;
  name: string;
  type: string;
}

interface LocationStockItem {
  id: string;
  menu_item_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  cost_price: number;
}

interface TransferLine {
  menu_item_id: string;
  item_name: string;
  available: number;
  unit: string;
  quantity: number;
}

interface TransferRecord {
  transfer_number: string;
  transfer_date: string;
  from_location_name: string;
  to_location_name: string;
  item_name: string;
  quantity: number;
  unit: string;
  notes?: string;
  reversed?: boolean;
}

export function StockTransfer() {
  // Form state
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationStockItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Reference data
  const [locations, setLocations] = useState<Location[]>([]);
  const [sourceStock, setSourceStock] = useState<LocationStockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // History state
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [reversingGroup, setReversingGroup] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
    loadHistory();
  }, []);

  // Reload source stock when from-location changes
  useEffect(() => {
    if (fromLocationId) {
      loadSourceStock(fromLocationId);
    } else {
      setSourceStock([]);
    }
    // Clear lines when source changes
    setLines([]);
    setSearchQuery('');
  }, [fromLocationId]);

  // Filter source stock as user types
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const filtered = sourceStock.filter(
      (s) =>
        s.quantity > 0 &&
        (s.item_name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q))
    );
    setSearchResults(filtered.slice(0, 10));
    setShowDropdown(filtered.length > 0);
  }, [searchQuery, sourceStock]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadLocations() {
    try {
      const res = await api.get('/locations');
      setLocations(res.data || []);
    } catch {
      toast.error('Failed to load locations');
    }
  }

  async function loadSourceStock(locId: string) {
    setLoadingStock(true);
    try {
      const res = await api.get(`/location-stock/${locId}`);
      const items: LocationStockItem[] = (res.data?.items || []).map((i: any) => ({
        id: i.id,
        menu_item_id: i.menu_item_id,
        item_name: i.item_name,
        category: i.category || '',
        quantity: Number(i.quantity) || 0,
        unit: i.unit || 'piece',
        cost_price: Number(i.cost_price) || 0,
      }));
      setSourceStock(items);
    } catch {
      toast.error('Failed to load source location stock');
      setSourceStock([]);
    } finally {
      setLoadingStock(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await api.get('/location-stock/transfers?limit=100');
      setHistory(res.data || []);
    } catch {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  }

  function addItem(stockItem: LocationStockItem) {
    if (lines.some((l) => l.menu_item_id === stockItem.menu_item_id)) {
      setSearchQuery('');
      setShowDropdown(false);
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        menu_item_id: stockItem.menu_item_id,
        item_name: stockItem.item_name,
        available: stockItem.quantity,
        unit: stockItem.unit,
        quantity: 1,
      },
    ]);
    setSearchQuery('');
    setShowDropdown(false);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateQty(idx: number, value: string) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, quantity: parseFloat(value) || 0 } : l))
    );
  }

  async function handleSubmit() {
    if (!fromLocationId) {
      toast.error('Select a source location');
      return;
    }
    if (!toLocationId) {
      toast.error('Select a destination location');
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error('Source and destination must be different');
      return;
    }
    if (lines.length === 0) {
      toast.error('Add at least one item to transfer');
      return;
    }
    for (const l of lines) {
      if (l.quantity <= 0) {
        toast.error(`Quantity must be > 0 for "${l.item_name}"`);
        return;
      }
      if (l.quantity > l.available) {
        toast.error(`"${l.item_name}" exceeds available stock (${l.available})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        notes: notes || null,
        items: lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          item_name: l.item_name,
          quantity: l.quantity,
          unit: l.unit,
        })),
      };

      const res = await api.post('/location-stock/transfer-batch', payload);
      const d = res.data;
      const fromName = locations.find((l) => l.id === fromLocationId)?.name || '';
      const toName = locations.find((l) => l.id === toLocationId)?.name || '';
      toast.success(
        `${d.transfer_number}: ${d.items_transferred} item(s) moved from ${fromName} → ${toName}`
      );

      // Reset and reload
      setLines([]);
      setNotes('');
      setToLocationId('');
      loadSourceStock(fromLocationId);
      loadHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReverse(transferNumber: string) {
    const ok = await confirmDialog.confirm({
      title: `Reverse Transfer ${transferNumber}`,
      description: 'This will move all transferred stock back to the source location.',
      confirmLabel: 'Reverse',
      variant: 'warning',
    });
    if (!ok) return;
    setReversingGroup(transferNumber);
    try {
      const res = await api.post(`/location-stock/transfer/${transferNumber}/reverse`);
      toast.success(res.data?.message || `Transfer ${transferNumber} reversed`);
      loadHistory();
      // Reload source stock in case this transfer's from-location is currently selected
      if (fromLocationId) loadSourceStock(fromLocationId);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reverse transfer');
    } finally {
      setReversingGroup(null);
    }
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Group history by transfer_number
  const groupedHistory = history.reduce<Record<string, TransferRecord[]>>((acc, t) => {
    const key = t.transfer_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const groupKeys = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

  const fromLocationName = locations.find((l) => l.id === fromLocationId)?.name || '';
  const toLocationName = locations.find((l) => l.id === toLocationId)?.name || '';

  return (
    <div className="space-y-6">
      {/* ── Transfer Form ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shuffle className="h-5 w-5" />
            Distribute Stock Between Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Location selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label>
                From (Source) <span className="text-destructive">*</span>
              </Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="e.g. Central Store" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}{' '}
                      <span className="text-muted-foreground capitalize text-xs">({l.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center pb-1">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <Label>
                To (Destination) <span className="text-destructive">*</span>
              </Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="e.g. Bar A" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== fromLocationId)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}{' '}
                        <span className="text-muted-foreground capitalize text-xs">({l.type})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              placeholder="Optional transfer notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Item search — only shown once source is selected */}
          {fromLocationId && (
            <div ref={searchRef} className="relative">
              <Label>
                Search &amp; Add Items from{' '}
                <span className="font-semibold">{fromLocationName}</span>
              </Label>
              {loadingStock ? (
                <p className="text-sm text-muted-foreground mt-1">Loading stock…</p>
              ) : (
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Type item name or category…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim()) setShowDropdown(searchResults.length > 0);
                    }}
                  />
                </div>
              )}
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
                      <span className="font-medium">{item.item_name}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {item.category} · available: {item.quantity} {item.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transfer lines table */}
          {lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium min-w-[180px]">Item</th>
                    <th className="pb-2 font-medium w-28 text-right">Available</th>
                    <th className="pb-2 font-medium w-28 text-right">Qty to Transfer</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, idx) => (
                    <tr key={`${line.menu_item_id}-${idx}`}>
                      <td className="py-2 pr-2 font-medium">{line.item_name}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                        {line.available} {line.unit}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          min="0"
                          max={line.available}
                          step="0.001"
                          className={`h-8 w-28 text-right ml-auto ${line.quantity > line.available ? 'border-destructive' : ''}`}
                          value={line.quantity}
                          onChange={(e) => updateQty(idx, e.target.value)}
                        />
                        {line.quantity > line.available && (
                          <p className="text-destructive text-xs text-right mt-0.5">Exceeds stock</p>
                        )}
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
              </table>
            </div>
          ) : fromLocationId ? (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
              Use the search above to add items to transfer
            </p>
          ) : null}

          {lines.length > 0 && (
            <div className="flex items-center justify-between">
              {fromLocationName && toLocationName ? (
                <p className="text-sm text-muted-foreground">
                  {fromLocationName}{' '}
                  <ArrowRight className="h-3.5 w-3.5 inline" />{' '}
                  {toLocationName} · {lines.length} item{lines.length !== 1 ? 's' : ''}
                </p>
              ) : (
                <span />
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !fromLocationId || !toLocationId || lines.length === 0}
              >
                {submitting ? 'Transferring…' : 'Confirm Transfer'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Transfer History ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : groupKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transfers yet</p>
          ) : (
            <div className="space-y-2">
              {groupKeys.map((key) => {
                const group = groupedHistory[key];
                const first = group[0];
                const isOpen = expandedGroups.has(key);
                return (
                  <div key={key} className="border rounded-md overflow-hidden">
                    <div className="flex items-center">
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                        onClick={() => toggleGroup(key)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <Badge variant={first.reversed ? 'secondary' : 'outline'} className="font-mono text-xs shrink-0">
                            {key}
                          </Badge>
                          {first.reversed && (
                            <Badge variant="secondary" className="text-xs shrink-0">Reversed</Badge>
                          )}
                          <span className="font-medium truncate hidden sm:inline">
                            {first.from_location_name}{' '}
                            <ArrowRight className="h-3 w-3 inline" />{' '}
                            {first.to_location_name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {group.length} item{group.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs shrink-0 ml-2">
                          {first.transfer_date}
                        </span>
                      </button>
                      {!first.reversed && (
                        <button
                          type="button"
                          title="Reverse this transfer"
                          disabled={reversingGroup === key}
                          onClick={(e) => { e.stopPropagation(); handleReverse(key); }}
                          className="px-3 py-3 text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50"
                        >
                          <RotateCcw className={`h-4 w-4 ${reversingGroup === key ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>
                    {isOpen && (
                      <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {first.from_location_name} → {first.to_location_name}
                          </span>
                          <span>Date: {first.transfer_date}</span>
                          {first.notes && <span>Notes: {first.notes}</span>}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b">
                              <th className="pb-1 font-medium">Item</th>
                              <th className="pb-1 font-medium text-right">Qty</th>
                              <th className="pb-1 font-medium text-right">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {group.map((t, i) => (
                              <tr key={i}>
                                <td className="py-1.5">{t.item_name}</td>
                                <td className="py-1.5 text-right tabular-nums">{t.quantity}</td>
                                <td className="py-1.5 text-right text-muted-foreground">{t.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
