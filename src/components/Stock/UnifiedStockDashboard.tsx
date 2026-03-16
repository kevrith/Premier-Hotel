/**
 * Enterprise Unified Stock Dashboard
 * Single view for all inventory — all departments, all categories.
 * Used by Owner (read-only), Admin, and Manager (receive + adjust).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Package, AlertTriangle, TrendingDown, CheckCircle2, BarChart2,
  RefreshCw, Search, Download, ArrowDownToLine, SlidersHorizontal,
  ChevronDown, ChevronRight, Layers, FileSpreadsheet
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockItem {
  id: string;
  name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  unit: string;
  cost_price: number;
  base_price: number;
  track_inventory: boolean;
  is_available: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  cost_value?: number;
  selling_value?: number;
  value?: number; // alias for cost_value
}

interface Movement {
  id: string;
  type: 'receipt' | 'adjustment';
  item_name: string;
  date: string;
  performed_by?: string;
  change: string;
  supplier?: string;
  unit_cost?: number;
  total_cost?: number;
  invoice_number?: string;
  notes?: string;
  quantity_before?: number;
  quantity_after?: number;
  reason?: string;
}

interface GroupStats { count: number; lowStock: number; outOfStock: number; costValue: number; sellingValue: number; }

export type StockMode = 'owner' | 'manager' | 'admin';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const STATUS_CFG = {
  in_stock:     { label: 'In Stock',     cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400' },
  low_stock:    { label: 'Low Stock',    cls: 'bg-amber-500/10  text-amber-700  border-amber-200  dark:text-amber-400' },
  out_of_stock: { label: 'Out of Stock', cls: 'bg-rose-500/10   text-rose-700   border-rose-200   dark:text-rose-400' },
};

const ROW_BG = {
  in_stock:     '',
  low_stock:    'bg-amber-500/5',
  out_of_stock: 'bg-rose-500/5',
};

// ─── Quick Receive Dialog ─────────────────────────────────────────────────────
function QuickReceiveDialog({
  item,
  open,
  onClose,
  onDone,
}: {
  item: StockItem | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoice, setInvoice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setQty(''); setCost(item?.cost_price?.toString() || ''); setSupplier(''); setInvoice(''); setNotes(''); } }, [open, item]);

  const submit = async () => {
    if (!qty || !cost) { toast.error('Quantity and unit cost required'); return; }
    setSaving(true);
    try {
      await api.post('/stock/receive', {
        menu_item_id: item!.id,
        quantity: parseFloat(qty),
        unit_cost: parseFloat(cost),
        supplier: supplier || undefined,
        invoice_number: invoice || undefined,
        notes: notes || undefined,
      });
      toast.success(`Received ${qty} ${item?.unit || 'units'} of ${item?.name}`);
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to receive stock');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
            Receive Stock — {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quantity ({item.unit || 'units'}) *</Label>
              <Input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 24" autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit Cost (KES) *</Label>
              <Input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 50" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Supplier</Label>
            <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Nairobi Distributors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Invoice Number</Label>
              <Input value={invoice} onChange={e => setInvoice(e.target.value)} placeholder="INV-0001" />
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              {qty && cost && (
                <p className="text-xs text-muted-foreground pb-2">
                  Total: <span className="font-semibold text-foreground">{fmt(parseFloat(qty || '0') * parseFloat(cost || '0'))}</span>
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
            Current stock: <span className="font-semibold text-foreground">{item.stock_quantity} {item.unit}</span>
            {qty && <> → New: <span className="font-semibold text-emerald-600">{(item.stock_quantity + parseFloat(qty || '0')).toFixed(2)} {item.unit}</span></>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Saving...' : 'Confirm Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Adjust Dialog ──────────────────────────────────────────────────────
function QuickAdjustDialog({
  item,
  open,
  onClose,
  onDone,
}: {
  item: StockItem | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('Physical stocktake');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open && item) setNewQty(item.stock_quantity.toString()); }, [open, item]);

  const submit = async () => {
    if (newQty === '') { toast.error('New quantity required'); return; }
    setSaving(true);
    try {
      await api.post('/stock/adjust', {
        menu_item_id: item!.id,
        new_quantity: parseFloat(newQty),
        reason,
      });
      toast.success(`Adjusted ${item?.name} to ${newQty} ${item?.unit || 'units'}`);
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;
  const diff = parseFloat(newQty || '0') - item.stock_quantity;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
            Adjust Stock — {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">New Quantity ({item.unit || 'units'})</Label>
            <Input type="number" min="0" step="0.01" value={newQty} onChange={e => setNewQty(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          {newQty !== '' && (
            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              Change: <span className={`font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(2)} {item.unit}
              </span> ({item.stock_quantity} → {newQty})
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Save Adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Movement History ─────────────────────────────────────────────────────────
function MovementHistory({ apiBase }: { apiBase: string }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receipt' | 'adjustment'>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${apiBase}/movements`, {
        params: { start_date: dateRange.start, end_date: dateRange.end },
      });
      setMovements(res.data.movements || []);
    } catch {
      toast.error('Failed to load movement history');
    }
    setLoading(false);
  }, [apiBase, dateRange]);

  useEffect(() => { load(); }, [load]);

  const filtered = movements.filter(m => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (search && !m.item_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCost = movements.filter(m => m.type === 'receipt').reduce((s, m) => s + (m.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-9 text-sm w-36" value={dateRange.start}
            onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-9 text-sm w-36" value={dateRange.end}
            onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} />
        </div>
        {(['all', 'receipt', 'adjustment'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${typeFilter === t ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted border-border'}`}>
            {t === 'all' ? 'All' : capitalize(t) + 's'}
          </button>
        ))}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Item name..." className="pl-8 h-9 text-sm w-36"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Receipts', value: movements.filter(m => m.type === 'receipt').length, cls: 'text-emerald-600' },
          { label: 'Adjustments', value: movements.filter(m => m.type === 'adjustment').length, cls: 'text-indigo-600' },
          { label: 'Total Cost Received', value: fmt(totalCost), cls: 'text-foreground' },
        ].map(({ label, value, cls }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`font-bold text-lg ${cls}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm animate-pulse">Loading movements...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground text-sm">
          No movements found for this period
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-y bg-muted/40">
                  {['Date', 'Item', 'Dept', 'Type', 'Change', 'Details'].map(h => (
                    <th key={h} className={`p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide
                      ${h === 'Date' || h === 'Item' ? 'text-left pl-4' : h === 'Type' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 pl-4 text-muted-foreground whitespace-nowrap text-xs">{m.date}</td>
                    <td className="p-3 font-semibold">{m.item_name}</td>
                    <td className="p-3 text-xs text-muted-foreground capitalize">—</td>
                    <td className="p-3 text-center">
                      {m.type === 'receipt' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                          <ArrowDownToLine className="h-3 w-3" />Receipt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-200">
                          <SlidersHorizontal className="h-3 w-3" />Adjust
                        </span>
                      )}
                    </td>
                    <td className={`p-3 font-bold font-mono ${m.change?.startsWith('+') ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {m.change}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs max-w-xs truncate">
                      {m.type === 'receipt' ? (
                        <>
                          {m.supplier && <span className="font-medium text-foreground">{m.supplier} · </span>}
                          {fmt(m.unit_cost || 0)}/unit · Total {fmt(m.total_cost || 0)}
                          {m.invoice_number && ` · Inv: ${m.invoice_number}`}
                          {m.notes && ` · ${m.notes}`}
                        </>
                      ) : (
                        <>{m.quantity_before} → {m.quantity_after} · {(m.reason || '').toLowerCase()}</>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UnifiedStockDashboard({ mode = 'owner' }: { mode?: StockMode }) {
  const canEdit = mode === 'admin' || mode === 'manager';
  // Owner uses owner endpoints for movements; everyone uses /stock/levels for balances
  const movementsBase = mode === 'owner' ? '/owner/stock' : '/owner/stock';

  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'balances' | 'movements'>('balances');

  const [receiveItem, setReceiveItem] = useState<StockItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock/levels');
      const raw: StockItem[] = res.data || [];
      const enriched = raw.map(i => ({
        ...i,
        cost_value: (i.stock_quantity || 0) * (i.cost_price || 0),
        selling_value: (i.stock_quantity || 0) * (i.base_price || 0),
        value: (i.stock_quantity || 0) * (i.cost_price || 0),
      }));
      setItems(enriched);
    } catch {
      toast.error('Failed to load stock data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived state
  const allCategories = [...new Set(items.map(i => i.category))].sort();

  const filtered = items.filter(i => {
    if (statusFilter !== 'all' && i.stock_status !== statusFilter) return false;
    if (selectedCats.size > 0 && !selectedCats.has(i.category)) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, StockItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  // Summary stats (from full items list, not filtered)
  const summary = {
    total: items.length,
    inStock: items.filter(i => i.stock_status === 'in_stock').length,
    lowStock: items.filter(i => i.stock_status === 'low_stock').length,
    outOfStock: items.filter(i => i.stock_status === 'out_of_stock').length,
    totalCostValue: items.reduce((s, i) => s + (i.cost_value || 0), 0),
    totalSellingValue: items.reduce((s, i) => s + (i.selling_value || 0), 0),
  };

  const toggleCat = (cat: string) =>
    setSelectedCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });

  const toggleGroup = (cat: string) =>
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });

  // Export CSV
  const exportCSV = () => {
    const header = 'Item,Category,Balance,Unit,Reorder Level,Status,Cost Price,Selling Price,Value (Cost),Value (Selling)';
    const rows = filtered.map(i =>
      `"${i.name}","${i.category}",${i.stock_quantity},"${i.unit || ''}",${i.reorder_level || 0},"${STATUS_CFG[i.stock_status].label}",${i.cost_price || 0},${i.base_price || 0},${(i.cost_value || 0).toFixed(2)},${(i.selling_value || 0).toFixed(2)}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `stock-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = filtered.map(i => ({
        Item: i.name,
        Category: capitalize(i.category),
        'On Hand': i.stock_quantity,
        Unit: i.unit || '',
        'Reorder Level': i.reorder_level || 0,
        Status: STATUS_CFG[i.stock_status].label,
        'Cost Price (KES)': i.cost_price || 0,
        'Selling Price (KES)': i.base_price || 0,
        'Value at Cost (KES)': parseFloat((i.cost_value || 0).toFixed(2)),
        'Value at Selling (KES)': parseFloat((i.selling_value || 0).toFixed(2)),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Balances');
      XLSX.writeFile(wb, `stock-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      toast.error('Excel export failed');
    }
  };

  const groupStats = (groupItems: StockItem[]): GroupStats => ({
    count: groupItems.length,
    lowStock: groupItems.filter(i => i.stock_status === 'low_stock').length,
    outOfStock: groupItems.filter(i => i.stock_status === 'out_of_stock').length,
    costValue: groupItems.reduce((s, i) => s + (i.cost_value || 0), 0),
    sellingValue: groupItems.reduce((s, i) => s + (i.selling_value || 0), 0),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Stock Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All departments · {items.length} tracked items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportExcel}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit border">
        {([
          { id: 'balances', label: 'Current Stock' },
          { id: 'movements', label: 'Receipts & Movements' },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'movements' ? (
        <MovementHistory apiBase={movementsBase} />
      ) : (
        <div className="flex gap-4">
          {/* Left sidebar — category filters */}
          <aside className="hidden lg:block w-44 shrink-0 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Departments</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedCats(new Set())}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors
                  ${selectedCats.size === 0 ? 'bg-foreground/10 font-semibold' : 'hover:bg-muted'}`}>
                All Departments
                <span className="ml-1.5 text-xs text-muted-foreground">({items.length})</span>
              </button>
              {allCategories.map(cat => {
                const count = items.filter(i => i.category === cat).length;
                const alerts = items.filter(i => i.category === cat && i.stock_status !== 'in_stock').length;
                return (
                  <button key={cat} onClick={() => toggleCat(cat)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between
                      ${selectedCats.has(cat) ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'hover:bg-muted'}`}>
                    <span className="capitalize">{cat}</span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">{count}</span>
                      {alerts > 0 && <span className="text-rose-500 font-bold">{alerts}⚠</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { label: 'Tracked SKUs',     value: summary.total,                        icon: Package,       cls: 'text-indigo-600' },
                { label: 'In Stock',         value: summary.inStock,                      icon: CheckCircle2,  cls: 'text-emerald-600' },
                { label: 'Low Stock',        value: summary.lowStock,                     icon: TrendingDown,  cls: 'text-amber-600' },
                { label: 'Out of Stock',     value: summary.outOfStock,                   icon: AlertTriangle, cls: 'text-rose-600' },
                { label: 'Value (Cost)',     value: fmt(summary.totalCostValue),          icon: BarChart2,     cls: 'text-slate-700' },
                { label: 'Value (Selling)',  value: fmt(summary.totalSellingValue),       icon: BarChart2,     cls: 'text-indigo-700' },
              ].map(({ label, value, icon: Icon, cls }) => (
                <Card key={label} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                        <p className={`text-base font-bold leading-tight ${cls}`}>{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search + status filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search items..." className="pl-9 h-9 text-sm"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap
                    ${statusFilter === s ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted border-border'}`}>
                  {s === 'all' ? 'All' : STATUS_CFG[s].label}
                </button>
              ))}
            </div>

            {/* Mobile category bar */}
            <div className="lg:hidden flex gap-1.5 flex-wrap">
              <button onClick={() => setSelectedCats(new Set())}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                  ${selectedCats.size === 0 ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted border-border'}`}>
                All
              </button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => toggleCat(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs border capitalize transition-colors
                    ${selectedCats.has(cat) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-background hover:bg-muted border-border'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Grouped table */}
            {loading ? (
              <div className="py-20 text-center text-muted-foreground text-sm animate-pulse">Loading stock data...</div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed rounded-xl">
                <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="font-semibold text-muted-foreground">No items match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">Try clearing search or adjusting filters</p>
              </div>
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y bg-muted/40">
                        <th className="p-3 pl-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-5"></th>
                        <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</th>
                        <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                        <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reorder</th>
                        <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost Price</th>
                        <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selling Price</th>
                        <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value (Cost)</th>
                        <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value (Selling)</th>
                        {canEdit && <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => {
                        const stats = groupStats(catItems);
                        const collapsed = collapsedGroups.has(cat);
                        return (
                          <React.Fragment key={cat}>
                            {/* Group header row */}
                            <tr
                              className="bg-muted/30 border-y border-border/60 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleGroup(cat)}>
                              <td className="p-3 pl-5">
                                {collapsed
                                  ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                              </td>
                              <td className="p-3" colSpan={2}>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold capitalize text-foreground">{cat}</span>
                                  <span className="text-xs text-muted-foreground">{stats.count} item{stats.count !== 1 ? 's' : ''}</span>
                                  {stats.outOfStock > 0 && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                      {stats.outOfStock} out
                                    </span>
                                  )}
                                  {stats.lowStock > 0 && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                      {stats.lowStock} low
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right text-xs text-muted-foreground" colSpan={3}></td>
                              <td className="p-3 text-right font-semibold text-sm text-slate-600">
                                {fmt(stats.costValue)}
                              </td>
                              <td className="p-3 text-right font-semibold text-sm text-indigo-700 dark:text-indigo-400">
                                {fmt(stats.sellingValue)}
                              </td>
                              {canEdit && <td />}
                            </tr>

                            {/* Item rows */}
                            {!collapsed && catItems.map(item => {
                              const cfg = STATUS_CFG[item.stock_status];
                              const isLow = item.stock_status === 'low_stock';
                              const isOut = item.stock_status === 'out_of_stock';
                              return (
                                <tr key={item.id}
                                  className={`border-b last:border-0 hover:bg-muted/10 transition-colors ${ROW_BG[item.stock_status]}`}>
                                  <td className="p-3 pl-5"></td>
                                  <td className="p-3 pl-2">
                                    <p className="font-medium">{item.name}</p>
                                    {!item.is_available && (
                                      <span className="text-[10px] text-muted-foreground">Hidden from menu</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className={`font-mono font-bold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                      {item.stock_quantity}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                                  </td>
                                  <td className="p-3 text-right text-muted-foreground text-xs">
                                    {item.reorder_level || 0} <span>{item.unit}</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
                                      {cfg.label}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right text-muted-foreground text-xs">
                                    {item.cost_price ? fmt(item.cost_price) : '—'}
                                  </td>
                                  <td className="p-3 text-right text-muted-foreground text-xs">
                                    {item.base_price ? fmt(item.base_price) : '—'}
                                  </td>
                                  <td className="p-3 text-right font-semibold text-xs text-slate-600">
                                    {item.cost_value ? fmt(item.cost_value) : '—'}
                                  </td>
                                  <td className="p-3 text-right font-semibold text-xs text-emerald-700 dark:text-emerald-400">
                                    {item.selling_value ? fmt(item.selling_value) : '—'}
                                  </td>
                                  {canEdit && (
                                    <td className="p-3 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <Button variant="ghost" size="sm"
                                          className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                          onClick={() => setReceiveItem(item)}>
                                          <ArrowDownToLine className="h-3 w-3 mr-1" />Receive
                                        </Button>
                                        <Button variant="ghost" size="sm"
                                          className="h-7 px-2 text-xs text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                          onClick={() => setAdjustItem(item)}>
                                          <SlidersHorizontal className="h-3 w-3 mr-1" />Adjust
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>

                    {/* Grand total footer */}
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="p-3 pl-5" colSpan={2}>
                          <span className="font-bold text-sm">Grand Total</span>
                          <span className="text-xs text-muted-foreground ml-2">{filtered.length} items</span>
                        </td>
                        <td colSpan={canEdit ? 5 : 4}></td>
                        <td className="p-3 text-right font-bold text-slate-700">
                          {fmt(filtered.reduce((s, i) => s + (i.cost_value || 0), 0))}
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-700 dark:text-indigo-400">
                          {fmt(filtered.reduce((s, i) => s + (i.selling_value || 0), 0))}
                        </td>
                        {canEdit && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <QuickReceiveDialog item={receiveItem} open={!!receiveItem} onClose={() => setReceiveItem(null)} onDone={load} />
      <QuickAdjustDialog  item={adjustItem}  open={!!adjustItem}  onClose={() => setAdjustItem(null)}  onDone={load} />
    </div>
  );
}
