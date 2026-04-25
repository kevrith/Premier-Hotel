// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface StockRow {
  item_id: string;
  name: string;
  unit: string;
  opening_stock: number;
  purchases: number;
  closing_stock: number;
  notes: string;
  log_id?: string;
}

interface Props {
  readOnly?: boolean;
  branchId?: string;
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function KitchenStockTake({ readOnly = false, branchId }: Props) {
  const { role } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = !readOnly && (
    ['admin', 'manager', 'chef'].includes(role || '') ||
    hasPermission('can_manage_kitchen_inventory')
  );

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
      const res = await api.get('/kitchen-stock/daily/dates', { params });
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
      const res = await api.get('/kitchen-stock/daily', { params });
      setRows((res.data.items || []).map((it: any) => ({
        item_id: it.item_id,
        name: it.name,
        unit: it.unit,
        opening_stock: it.opening_stock ?? 0,
        purchases: it.purchases ?? 0,
        closing_stock: it.closing_stock ?? 0,
        notes: it.notes ?? '',
        log_id: it.log_id,
      })));
    } catch {
      toast.error('Failed to load kitchen stock');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { loadDates(); }, [loadDates]);
  useEffect(() => { loadStock(selectedDate); }, [selectedDate, loadStock]);

  const update = (idx: number, field: keyof StockRow, value: string | number) => {
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, [field]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const params: Record<string, string> = { stock_date: selectedDate };
      if (branchId) params.branch_id = branchId;
      await api.post('/kitchen-stock/daily', rows, { params });
      toast.success('Kitchen stock saved');
      await loadDates();
    } catch {
      toast.error('Failed to save kitchen stock');
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
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>
            Go to Today
          </Button>
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

      {/* Stock table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kitchen Stock Take</CardTitle>
          <CardDescription>
            {canEdit
              ? 'Enter opening stock, purchases received, and physical closing count.'
              : 'View-only — contact admin or manager to update.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold w-8">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Item</th>
                    <th className="text-center px-3 py-3 font-semibold min-w-[100px]">Opening</th>
                    <th className="text-center px-3 py-3 font-semibold min-w-[100px]">Purchases</th>
                    <th className="text-center px-3 py-3 font-semibold min-w-[100px]">Total</th>
                    <th className="text-center px-3 py-3 font-semibold min-w-[110px]">Closing</th>
                    <th className="text-center px-3 py-3 font-semibold min-w-[90px] bg-orange-50 dark:bg-orange-950/20">Used ✦</th>
                    <th className="text-left px-3 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const total = row.opening_stock + row.purchases;
                    const used = Math.max(0, total - row.closing_stock);
                    return (
                      <tr key={row.item_id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">
                          {row.name}
                          <span className="text-xs text-muted-foreground ml-1">({row.unit})</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {canEdit ? (
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={row.opening_stock}
                              onChange={e => update(i, 'opening_stock', parseFloat(e.target.value) || 0)}
                              className="w-24 text-center h-8 mx-auto"
                            />
                          ) : <span>{row.opening_stock}</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {canEdit ? (
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={row.purchases}
                              onChange={e => update(i, 'purchases', parseFloat(e.target.value) || 0)}
                              className="w-24 text-center h-8 mx-auto"
                            />
                          ) : <span>{row.purchases}</span>}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">{total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          {canEdit ? (
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={row.closing_stock}
                              onChange={e => update(i, 'closing_stock', parseFloat(e.target.value) || 0)}
                              className={`w-24 text-center h-8 mx-auto ${
                                row.closing_stock > total ? 'border-red-400' : ''
                              }`}
                            />
                          ) : <span>{row.closing_stock}</span>}
                        </td>
                        <td className="px-3 py-2 text-center bg-orange-50 dark:bg-orange-950/20">
                          <span className={`font-semibold text-sm ${used > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {used.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {canEdit ? (
                            <Input
                              value={row.notes}
                              onChange={e => update(i, 'notes', e.target.value)}
                              placeholder="Optional note"
                              className="h-8 min-w-[120px]"
                            />
                          ) : <span className="text-muted-foreground">{row.notes || '—'}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
