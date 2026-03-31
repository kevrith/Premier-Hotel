/**
 * DailyStockTaking — production-ready daily stock sheet for kitchen & bar.
 * Columns: NO | ITEM | CATEGORY | OPENING | PURCHASES | TOTAL | SYS SALES | CALC CLOSING | PHYSICAL COUNT | LOST | DISCREPANCY | STATUS
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  History,
  Filter,
  Settings2,
  Save,
  MapPin,
  Pencil,
  Printer,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api/client';

// ── Constants ─────────────────────────────────────────────────────────────

const REASON_CODES = [
  '',
  'Spoilage',
  'Theft',
  'Breakage',
  'Transfer',
  'Measurement Error',
  'Returned',
  'Other',
];

// ── Types ──────────────────────────────────────────────────────────────────

interface StockSheetItem {
  menu_item_id: string;
  item_name: string;
  category: string;
  unit: string;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  opening_stock: number;
  purchases: number;
  total_stock: number;
  system_sales: number;
  calculated_closing: number;
  physical_closing: number | null;
  lost: number;
  reason: string | null;
  discrepancy: number | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_low_stock: boolean;
  stock_department: string;
}

interface ConfigItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  track_inventory: boolean;
  stock_department: string | null;
  cost_price: number;
  reorder_level: number;
}

interface LowStockAlert {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface SheetSummary {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  discrepancy_count: number;
  total_system_sales: number;
}

interface Location {
  id: string;
  name: string;
  type: 'bar' | 'kitchen' | 'store';
  is_active: boolean;
}

interface StockSheetResponse {
  session_date: string;
  session_type: string;
  location_id: string | null;
  location: Location | null;
  existing_session: { id: string; status: string; submitted_by?: string } | null;
  items: StockSheetItem[];
  summary: SheetSummary;
  low_stock_alerts: LowStockAlert[];
}

interface HistorySession {
  id: string;
  session_date: string;
  session_type: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'kitchen' | 'bar' | 'low_stock';

// ── Helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(decimals);
}

function discrepancyColor(d: number | null): string {
  if (d === null) return 'text-muted-foreground';
  if (Math.abs(d) < 0.01) return 'text-green-600 font-semibold';
  if (d > 0) return 'text-orange-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function statusBadge(status: StockSheetItem['stock_status']) {
  switch (status) {
    case 'out_of_stock':
      return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Out of Stock</Badge>;
    case 'low_stock':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Low Stock</Badge>;
    default:
      return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">OK</Badge>;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function DailyStockTaking({ defaultSessionType = 'all' }: { defaultSessionType?: 'all' | 'kitchen' | 'bar' }) {
  const { role } = useAuth();
  const canConfigure = role === 'admin' || role === 'manager';
  const isManager = role === 'admin' || role === 'manager';

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [sessionType, setSessionType] = useState<'all' | 'kitchen' | 'bar'>(defaultSessionType);
  const [filter, setFilter] = useState<FilterType>('all');

  // ── Location state ──────────────────────────────────────────────────────
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [myLocation, setMyLocation] = useState<Location | null>(null);
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  const [sheetData, setSheetData] = useState<StockSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Local editable state: keyed by menu_item_id
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [lostCounts, setLostCounts] = useState<Record<string, string>>({});
  const [reasonCodes, setReasonCodes] = useState<Record<string, string>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Fetch locations on mount ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const locRes = await apiClient.get<Location[]>('/locations');
        const locs: Location[] = (locRes.data as any) || [];
        setLocations(locs);

        if (!isManager) {
          // Waiter / Chef: lock to their assigned location
          try {
            const myLocRes = await apiClient.get('/location-stock/my-location');
            const assigned = (myLocRes.data as any)?.assigned_location;
            if (assigned) {
              setMyLocation(assigned);
              setSelectedLocationId(assigned.id);
            }
          } catch {
            // ignore — will fall back to global view
          }
        }
      } catch {
        // locations endpoint may not exist yet — fail silently
      } finally {
        setLocationsLoaded(true);
      }
    };
    init();
  }, [isManager]);

  // ── Configure Items ────────────────────────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false);
  const [configItems, setConfigItems] = useState<ConfigItem[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configDepts, setConfigDepts] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSearch, setConfigSearch] = useState('');

  const fetchConfigItems = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await apiClient.get('/stock/levels');
      const items: ConfigItem[] = (res.data as any[]) || [];
      setConfigItems(items);
      const depts: Record<string, string> = {};
      items.forEach(i => { depts[i.id] = i.stock_department || 'auto'; });
      setConfigDepts(depts);
    } catch {
      toast.error('Failed to load items');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    setSavingConfig(true);
    let saved = 0;
    try {
      for (const item of configItems) {
        const dept = configDepts[item.id];
        const val = dept === 'auto' ? null : dept;
        await apiClient.patch(`/stock/settings/${item.id}`, {
          track_inventory: item.track_inventory,
          reorder_level: item.reorder_level ?? 0,
          unit: item.unit || 'piece',
          cost_price: item.cost_price ?? 0,
          stock_department: val,
        });
        saved++;
      }
      toast.success(`Saved department settings for ${saved} items`);
      setConfigOpen(false);
      setReloadTick(t => t + 1);
    } catch {
      toast.error('Failed to save some settings');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Fetch sheet ──────────────────────────────────────────────────────────

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/daily-stock/sheet?stock_date=${selectedDate}&session_type=${sessionType}`;
      if (selectedLocationId) url += `&location_id=${selectedLocationId}`;
      const res = await apiClient.get<StockSheetResponse>(url);
      const data: StockSheetResponse = (res.data as any);
      setSheetData(data);

      // Pre-fill inputs from existing session data
      const pc: Record<string, string> = {};
      const lc: Record<string, string> = {};
      const rc: Record<string, string> = {};
      for (const item of data.items) {
        if (item.physical_closing !== null && item.physical_closing !== undefined) {
          pc[item.menu_item_id] = String(item.physical_closing);
        }
        if (item.lost) {
          lc[item.menu_item_id] = String(item.lost);
        }
        if (item.reason) {
          rc[item.menu_item_id] = item.reason;
        }
      }
      setPhysicalCounts(pc);
      setLostCounts(lc);
      setReasonCodes(rc);
      setIsEditMode(false);
      if (data.existing_session?.status === 'submitted') {
        setSessionNotes('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to load stock sheet');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, sessionType, selectedLocationId]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet, reloadTick]);

  // ── Computed discrepancy (live, from inputs) ─────────────────────────────

  const liveItems: (StockSheetItem & { live_discrepancy: number | null })[] = useMemo(() => {
    if (!sheetData) return [];
    return sheetData.items.map((item) => {
      const physStr = physicalCounts[item.menu_item_id];
      const phys = physStr !== undefined && physStr !== '' ? parseFloat(physStr) : null;
      const liveDisc =
        phys !== null && !isNaN(phys) ? phys - item.calculated_closing : null;
      return { ...item, live_discrepancy: liveDisc };
    });
  }, [sheetData, physicalCounts]);

  // ── Filter ───────────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    if (filter === 'low_stock') {
      return liveItems.filter((i) => i.stock_status !== 'in_stock');
    }
    return liveItems;
  }, [liveItems, filter]);

  // ── Grouped by category ──────────────────────────────────────────────────

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      const cat = item.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredItems]);

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!sheetData) return;

    const itemsToSubmit = sheetData.items
      .filter((item) => {
        const v = physicalCounts[item.menu_item_id];
        return v !== undefined && v !== '';
      })
      .map((item) => ({
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        physical_closing: parseFloat(physicalCounts[item.menu_item_id] || '0'),
        lost: parseFloat(lostCounts[item.menu_item_id] || '0'),
        reason: reasonCodes[item.menu_item_id] || null,
      }));

    if (itemsToSubmit.length === 0) {
      toast.error('Enter at least one physical count before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const submitPayload: any = {
        session_date: selectedDate,
        session_type: sessionType,
        items: itemsToSubmit,
        notes: sessionNotes || null,
      };
      if (selectedLocationId) submitPayload.location_id = selectedLocationId;
      await apiClient.post('/daily-stock/submit', submitPayload);
      toast.success(`Stock take for ${selectedDate} submitted (${itemsToSubmit.length} items)`);
      setIsEditMode(false);
      fetchSheet();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit stock take');
    } finally {
      setSubmitting(false);
    }
  };

  // ── History ──────────────────────────────────────────────────────────────

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<HistorySession[]>('/daily-stock/history?days=14');
      setHistory((res.data as any) || []);
    } catch {
      toast.error('Could not load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!historyOpen) fetchHistory();
    setHistoryOpen((p) => !p);
  };

  // ── Print functions ──────────────────────────────────────────────────────

  const printSheet = (mode: 'blank' | 'variance') => {
    if (!sheetData) return;
    const title = mode === 'blank' ? 'Stock Count Sheet' : 'Stock Variance Report';
    const dateLabel = selectedDate;
    const typeLabel = sessionType.charAt(0).toUpperCase() + sessionType.slice(1);

    const rows = liveItems.map((item, idx) => {
      const physStr = physicalCounts[item.menu_item_id] ?? '';
      const phys = physStr !== '' ? parseFloat(physStr) : null;
      const disc = item.live_discrepancy;
      const costVar = disc !== null ? (disc * item.cost_price) : null;
      const reason = reasonCodes[item.menu_item_id] || '';

      if (mode === 'blank') {
        return `<tr>
          <td>${idx + 1}</td>
          <td>${item.item_name}<br/><small>${item.unit}</small></td>
          <td class="num">${fmt(item.calculated_closing, 2)}</td>
          <td class="num input-cell">________</td>
          <td class="num input-cell">________</td>
        </tr>`;
      } else {
        const discColor = disc === null ? '' : Math.abs(disc) < 0.01 ? 'color:#16a34a' : disc < 0 ? 'color:#dc2626' : 'color:#d97706';
        return `<tr>
          <td>${idx + 1}</td>
          <td>${item.item_name}<br/><small>${item.unit}</small></td>
          <td class="num">${fmt(item.calculated_closing, 2)}</td>
          <td class="num">${phys !== null ? fmt(phys, 2) : '—'}</td>
          <td class="num" style="${discColor}">${disc !== null ? (disc > 0.01 ? '+' : '') + fmt(disc, 2) : '—'}</td>
          <td class="num" style="${discColor}">${costVar !== null ? (costVar > 0.01 ? '+' : '') + fmt(costVar, 2) : '—'}</td>
          <td>${reason}</td>
        </tr>`;
      }
    }).join('');

    const headers = mode === 'blank'
      ? `<th>#</th><th>Item</th><th>Calc.</th><th>Count</th><th>Lost</th>`
      : `<th>#</th><th>Item</th><th>Calc.</th><th>Physical</th><th>Disc.</th><th>KES Var.</th><th>Reason</th>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 9px; width: 74mm; margin: 0; }
  h2 { font-size: 11px; text-align: center; margin: 0 0 2px; }
  .sub { font-size: 8px; text-align: center; color: #555; margin-bottom: 4px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 7.5px; text-align: left; border-bottom: 1px solid #000; padding: 1px 2px; }
  td { font-size: 8px; padding: 2px 2px; border-bottom: 1px dotted #ccc; vertical-align: top; }
  .num { text-align: right; }
  .input-cell { min-width: 16mm; }
  .cat-header { background: #f0f0f0; font-weight: bold; font-size: 8px; padding: 2px 2px; }
  .summary { margin-top: 4px; font-size: 8px; }
  .footer { margin-top: 6px; font-size: 7.5px; text-align: center; color: #777; }
  .sig-line { border-top: 1px solid #000; margin-top: 12px; font-size: 7.5px; text-align: center; }
</style></head><body>
<h2>${title}</h2>
<p class="sub">Date: ${dateLabel} &nbsp;|&nbsp; Dept: ${typeLabel}</p>
<hr class="divider"/>
<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
<hr class="divider"/>
${mode === 'variance' ? `<div class="summary">
  <strong>Totals</strong><br/>
  Items counted: ${Object.values(physicalCounts).filter(v => v !== '').length} / ${sheetData.items.length}<br/>
  Total discrepancies: ${liveItems.filter(i => i.live_discrepancy !== null && Math.abs(i.live_discrepancy) > 0.01).length} items<br/>
  Total KES variance: ${fmt(liveItems.reduce((sum, i) => {
    const d = i.live_discrepancy;
    return d !== null ? sum + d * i.cost_price : sum;
  }, 0), 2)}
</div><hr class="divider"/>` : ''}
<div class="sig-line">Counted by: ___________________</div>
<div class="sig-line">Verified by: ___________________</div>
<p class="footer">Printed: ${new Date().toLocaleString()}</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=340,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.addEventListener('afterprint', () => w.close());
    }, 400);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const isSubmitted = sheetData?.existing_session?.status === 'submitted';
  const summary = sheetData?.summary;
  const alerts = sheetData?.low_stock_alerts || [];

  // Active location label for header
  const activeLocationLabel = (() => {
    if (myLocation && !isManager) return myLocation.name;
    if (selectedLocationId) {
      return locations.find(l => l.id === selectedLocationId)?.name ?? null;
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {activeLocationLabel ? `${activeLocationLabel} — Daily Stock Take` : 'Daily Stock Taking'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Physical count vs system — kitchen &amp; bar daily stock sheet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Location selector — managers only */}
          {isManager && locationsLoaded && locations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Locations</option>
                {locations.filter(l => l.is_active).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Locked location badge for waiters/chefs */}
          {!isManager && myLocation && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {myLocation.name}
            </Badge>
          )}

          {/* Date picker */}
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Session type */}
          <div className="flex rounded-md overflow-hidden border text-sm">
            {(['all', 'kitchen', 'bar'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSessionType(t)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  sessionType === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={fetchSheet} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canConfigure && (
            <Button
              variant={configOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (!configOpen) fetchConfigItems();
                setConfigOpen(o => !o);
              }}
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              Configure Items
            </Button>
          )}
        </div>
      </div>

      {/* ── Configure Items Panel ── */}
      {configOpen && canConfigure && (
        <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              Configure Stock Department per Item
            </CardTitle>
            <CardDescription>
              Set each item to <strong>Kitchen</strong>, <strong>Bar</strong>, <strong>Both</strong>, or <strong>Auto</strong> (auto-detects from category).
              Bar items (drinks, water, soda, etc.) are auto-detected. Kitchen items need explicit assignment if their category is ambiguous.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder="Search items..."
              value={configSearch}
              onChange={e => setConfigSearch(e.target.value)}
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {configLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading items...</div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-lg border bg-background">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 z-10">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground uppercase">Item</th>
                      <th className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground uppercase">Category</th>
                      <th className="text-center px-3 py-2 font-semibold text-xs text-muted-foreground uppercase">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configItems
                      .filter(i => !configSearch || i.name.toLowerCase().includes(configSearch.toLowerCase()) || (i.category || '').toLowerCase().includes(configSearch.toLowerCase()))
                      .map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-gray-50 dark:bg-muted/20'}>
                          <td className="px-3 py-2 font-medium">{item.name}</td>
                          <td className="px-3 py-2 text-muted-foreground capitalize text-xs">{item.category || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              {(['auto', 'kitchen', 'bar', 'both'] as const).map(dept => (
                                <button
                                  key={dept}
                                  onClick={() => setConfigDepts(prev => ({ ...prev, [item.id]: dept }))}
                                  className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors capitalize ${
                                    configDepts[item.id] === dept
                                      ? dept === 'kitchen' ? 'bg-orange-500 text-white border-orange-500'
                                        : dept === 'bar' ? 'bg-blue-500 text-white border-blue-500'
                                        : dept === 'both' ? 'bg-purple-500 text-white border-purple-500'
                                        : 'bg-gray-500 text-white border-gray-500'
                                      : 'bg-background hover:bg-muted border-border text-muted-foreground'
                                  }`}
                                >
                                  {dept}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={saveConfig} disabled={savingConfig}>
                <Save className="h-4 w-4 mr-1.5" />
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{summary.total_items}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-amber-600">{summary.low_stock_count}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{summary.out_of_stock_count}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Discrepancies</p>
                  <p className="text-2xl font-bold text-orange-600">{summary.discrepancy_count}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-orange-500 opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Submitted banner ── */}
      {isSubmitted && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Stock take for <strong>{selectedDate}</strong> has been submitted. You can re-submit to update counts.
          </span>
        </div>
      )}

      {/* ── Low Stock Alerts ── */}
      {alerts.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader
            className="py-3 cursor-pointer select-none"
            onClick={() => setAlertsOpen((p) => !p)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Alerts ({alerts.length} items need attention)
              </CardTitle>
              {alertsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {alertsOpen && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {alerts.map((a, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      a.status === 'out_of_stock'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <span>{a.name}</span>
                    <span className="opacity-70">
                      {fmt(a.quantity, 1)} {a.unit}
                    </span>
                    {a.reorder_level > 0 && (
                      <span className="opacity-50">/ {fmt(a.reorder_level, 1)}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(['all', 'low_stock'] as FilterType[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {f === 'all' ? 'All Items' : 'Low Stock Only'}
          </Button>
        ))}

        <span className="text-xs text-muted-foreground ml-auto">
          Showing {filteredItems.length} of {sheetData?.items.length || 0} items
        </span>

        {/* Print buttons */}
        {sheetData && sheetData.items.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={() => printSheet('blank')} className="text-xs gap-1">
              <Printer className="h-3.5 w-3.5" />
              Print Blank
            </Button>
            <Button variant="outline" size="sm" onClick={() => printSheet('variance')} className="text-xs gap-1">
              <Printer className="h-3.5 w-3.5" />
              Print Variance
            </Button>
          </>
        )}
      </div>

      {/* ── Main Table ── */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary opacity-70" />
            <p className="text-muted-foreground">Loading stock sheet…</p>
          </CardContent>
        </Card>
      ) : !sheetData || sheetData.items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No tracked inventory items found.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enable <strong>track_inventory</strong> on menu items or set a stock quantity.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category} className="overflow-hidden">
              <CardHeader className="py-2 px-4 bg-muted/40 border-b">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category} ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-muted-foreground">
                        <th className="text-left px-3 py-2 font-medium w-8">#</th>
                        <th className="text-left px-3 py-2 font-medium min-w-[140px]">Item</th>
                        <th className="text-right px-3 py-2 font-medium">Opening</th>
                        <th className="text-right px-3 py-2 font-medium">Purchases</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                        <th className="text-right px-3 py-2 font-medium">Sys Sales</th>
                        <th className="text-right px-3 py-2 font-medium">Calc. Closing</th>
                        <th className="text-right px-3 py-2 font-medium min-w-[110px]">Physical Count</th>
                        <th className="text-right px-3 py-2 font-medium min-w-[80px]">Lost</th>
                        <th className="text-left px-3 py-2 font-medium min-w-[110px]">Reason</th>
                        <th className="text-right px-3 py-2 font-medium min-w-[90px]">Discrepancy</th>
                        <th className="text-right px-3 py-2 font-medium min-w-[90px]">KES Variance</th>
                        <th className="text-center px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const globalIdx = (sheetData?.items.findIndex(
                          (i) => i.menu_item_id === item.menu_item_id
                        ) ?? 0) + 1;
                        const physStr = physicalCounts[item.menu_item_id] ?? '';
                        const lostStr = lostCounts[item.menu_item_id] ?? '';
                        const disc = item.live_discrepancy;

                        return (
                          <tr
                            key={item.menu_item_id}
                            className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                              idx % 2 === 0 ? '' : 'bg-muted/10'
                            }`}
                          >
                            <td className="px-3 py-2 text-muted-foreground">{globalIdx}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium leading-tight">{item.item_name}</div>
                              <div className="text-muted-foreground text-xs">{item.unit}</div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmt(item.opening_stock, 2)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {item.purchases > 0 ? (
                                <span className="text-blue-600 font-medium">{fmt(item.purchases, 2)}</span>
                              ) : (
                                fmt(item.purchases, 2)
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {fmt(item.total_stock, 2)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-purple-600">
                              {fmt(item.system_sales, 2)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {fmt(item.calculated_closing, 2)}
                            </td>

                            {/* Physical Count input */}
                            <td className="px-2 py-1.5 text-right">
                              {isSubmitted && !isEditMode ? (
                                <span className="tabular-nums">
                                  {physStr !== '' ? fmt(parseFloat(physStr), 2) : '—'}
                                </span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Count"
                                  value={physStr}
                                  onChange={(e) =>
                                    setPhysicalCounts((prev) => ({
                                      ...prev,
                                      [item.menu_item_id]: e.target.value,
                                    }))
                                  }
                                  className="h-7 w-24 text-right text-xs ml-auto focus:ring-primary"
                                />
                              )}
                            </td>

                            {/* Lost input */}
                            <td className="px-2 py-1.5 text-right">
                              {isSubmitted && !isEditMode ? (
                                <span className="tabular-nums text-orange-600">
                                  {lostStr !== '' && lostStr !== '0' ? fmt(parseFloat(lostStr), 2) : '—'}
                                </span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0"
                                  value={lostStr}
                                  onChange={(e) =>
                                    setLostCounts((prev) => ({
                                      ...prev,
                                      [item.menu_item_id]: e.target.value,
                                    }))
                                  }
                                  className="h-7 w-20 text-right text-xs ml-auto"
                                />
                              )}
                            </td>

                            {/* Reason code */}
                            <td className="px-2 py-1.5">
                              {isSubmitted && !isEditMode ? (
                                <span className="text-xs text-muted-foreground">
                                  {reasonCodes[item.menu_item_id] || '—'}
                                </span>
                              ) : disc !== null && Math.abs(disc) > 0.01 ? (
                                <select
                                  value={reasonCodes[item.menu_item_id] ?? ''}
                                  onChange={(e) =>
                                    setReasonCodes((prev) => ({
                                      ...prev,
                                      [item.menu_item_id]: e.target.value,
                                    }))
                                  }
                                  className="border rounded px-1 py-0.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[130px]"
                                >
                                  {REASON_CODES.map((r) => (
                                    <option key={r} value={r}>{r || '— select —'}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Discrepancy (live calculated) */}
                            <td className={`px-3 py-2 text-right tabular-nums ${discrepancyColor(disc)}`}>
                              {disc !== null ? (
                                <>
                                  {disc > 0.01 && '+'}
                                  {fmt(disc, 2)}
                                </>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Cost of Variance (KES) */}
                            <td className={`px-3 py-2 text-right tabular-nums ${discrepancyColor(disc)}`}>
                              {disc !== null && item.cost_price > 0 ? (
                                <>
                                  {disc > 0.01 && '+'}
                                  {fmt(disc * item.cost_price, 2)}
                                </>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>

                            <td className="px-3 py-2 text-center">{statusBadge(item.stock_status)}</td>
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

      {/* ── Notes + Submit ── */}
      {sheetData && sheetData.items.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Session Notes (optional)</label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Any notes about this stock take session…"
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {Object.keys(physicalCounts).filter((k) => physicalCounts[k] !== '').length} of{' '}
                {sheetData.items.length} items counted
                {isSubmitted && !isEditMode && ' · Previously submitted'}
                {isEditMode && ' · Editing submitted session'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {isSubmitted && !isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Counts
                  </Button>
                )}
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsEditMode(false); fetchSheet(); }}
                  >
                    Cancel Edit
                  </Button>
                )}
                {(!isSubmitted || isEditMode) && (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || loading}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting
                      ? 'Submitting…'
                      : isSubmitted
                      ? 'Re-submit Stock Take'
                      : 'Submit Stock Take'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── History ── */}
      <Card>
        <CardHeader
          className="py-3 cursor-pointer select-none"
          onClick={toggleHistory}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Stock Take Sessions (last 14 days)
            </CardTitle>
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {historyOpen && (
          <CardContent className="pt-0">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sessions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Notes</th>
                      <th className="text-left py-2 px-3">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{s.session_date}</td>
                        <td className="py-2 px-3 capitalize">{s.session_type}</td>
                        <td className="py-2 px-3">
                          <Badge
                            className={
                              s.status === 'submitted'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs max-w-xs truncate">
                          {s.notes || '—'}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {new Date(s.updated_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default DailyStockTaking;
