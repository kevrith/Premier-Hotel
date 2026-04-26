// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface UtensilRow {
  utensil_id: string;
  name: string;
  category: string;
  opening_count: number;
  closing_count: number;
  broken: number;
  lost: number;
  notes: string;
  log_id?: string;
}

interface Props {
  readOnly?: boolean;
}

export function UtensilsStockTake({ readOnly = false }: Props) {
  const { role } = useAuth();
  const { hasPermission } = usePermissions();

  const canEdit = !readOnly && (
    ['admin', 'manager', 'chef', 'waiter'].includes(role || '') ||
    hasPermission('can_manage_utensils_stock')
  );

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [rows, setRows] = useState<UtensilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const grouped = rows.reduce<Record<string, UtensilRow[]>>((acc, row) => {
    const cat = row.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  const loadDates = useCallback(async () => {
    try {
      const res = await api.get('/kitchen-stock/utensils/daily/dates');
      const dates: string[] = res.data || [];
      if (!dates.includes(today)) dates.unshift(today);
      setAvailableDates(dates);
    } catch {
      setAvailableDates([today]);
    }
  }, [today]);

  const loadStock = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get('/kitchen-stock/utensils/daily', { params: { stock_date: d } });
      setRows((res.data.items || []).map((it: any) => ({
        utensil_id: it.utensil_id,
        name: it.name,
        category: it.category,
        opening_count: it.opening_count ?? 0,
        closing_count: it.closing_count ?? 0,
        broken: it.broken ?? 0,
        lost: it.lost ?? 0,
        notes: it.notes ?? '',
        log_id: it.log_id,
      })));
    } catch {
      toast.error('Failed to load utensil stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDates(); }, [loadDates]);
  useEffect(() => { loadStock(selectedDate); }, [selectedDate, loadStock]);

  const update = (idx: number, field: keyof UtensilRow, value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = {
        ...r,
        [field]: field === 'notes' ? value : parseInt(value) || 0,
      };
      // Recompute lost whenever opening, closing, or broken changes
      updated.lost = Math.max(0, updated.opening_count - updated.closing_count - updated.broken);
      return updated;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(
        `/kitchen-stock/utensils/daily?stock_date=${selectedDate}`,
        rows.map(r => ({
          utensil_id: r.utensil_id,
          opening_count: r.opening_count,
          closing_count: r.closing_count,
          broken: r.broken,
          notes: r.notes || null,
        }))
      );
      toast.success('Utensil count saved');
      await loadDates();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (dir: -1 | 1) => {
    const idx = availableDates.indexOf(selectedDate);
    const next = idx + dir;
    if (next >= 0 && next < availableDates.length) setSelectedDate(availableDates[next]);
  };

  const totalLost = rows.reduce((s, r) => s + (r.lost || 0), 0);
  const totalBroken = rows.reduce((s, r) => s + (r.broken || 0), 0);
  const idx = availableDates.indexOf(selectedDate);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Utensils & Cutlery Count</CardTitle>
                <CardDescription>
                  Opening auto-fills from previous day. Lost = Opening − Closing − Broken (auto-calculated).
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 border rounded-md">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)} disabled={idx >= availableDates.length - 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent border-0 outline-none text-sm font-medium px-2 cursor-pointer"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)} disabled={idx <= 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadStock(selectedDate)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {canEdit && (
                <Button size="sm" onClick={handleSave} disabled={saving || loading}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {selectedDate === today && <Badge className="bg-green-500/10 text-green-700 border-green-300">Today</Badge>}
            <Badge variant="outline">{rows.length} items</Badge>
            {totalBroken > 0 && <Badge variant="outline" className="text-orange-600 border-orange-300">Broken: {totalBroken}</Badge>}
            {totalLost > 0 && <Badge variant="destructive">Lost: {totalLost}</Badge>}
            {totalLost === 0 && totalBroken === 0 && !loading && <Badge variant="outline" className="text-green-600 border-green-300">No losses today</Badge>}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Loading…
        </div>
      ) : (
        Object.entries(grouped).map(([category, catRows]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium min-w-[150px]">Item</th>
                      <th className="text-center px-2 py-2 font-medium w-28">Opening</th>
                      <th className="text-center px-2 py-2 font-medium w-28">Closing</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Broken</th>
                      <th className="text-center px-2 py-2 font-medium w-24 bg-red-50 dark:bg-red-950/20">Lost ✦</th>
                      <th className="text-left px-2 py-2 font-medium min-w-[120px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map((row) => {
                      const globalIdx = rows.findIndex(r => r.utensil_id === row.utensil_id);
                      return (
                        <tr key={row.utensil_id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          {(['opening_count', 'closing_count', 'broken'] as const).map(field => (
                            <td key={field} className="px-2 py-1 text-center">
                              {canEdit ? (
                                <Input
                                  type="number" min="0" step="1"
                                  placeholder="0"
                                  className="h-7 text-center text-sm w-20 mx-auto"
                                  value={row[field] || ''}
                                  onChange={e => update(globalIdx, field, e.target.value)}
                                />
                              ) : (
                                <span>{row[field] || 0}</span>
                              )}
                            </td>
                          ))}
                          {/* Lost — auto-computed */}
                          <td className="px-2 py-2 text-center bg-red-50 dark:bg-red-950/20">
                            <span className={`font-semibold text-sm ${row.lost > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {row.lost}
                            </span>
                          </td>
                          <td className="px-2 py-1">
                            {canEdit ? (
                              <Input
                                className="h-7 text-sm"
                                placeholder="Optional"
                                value={row.notes || ''}
                                onChange={e => update(globalIdx, 'notes', e.target.value)}
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">{row.notes || '—'}</span>
                            )}
                          </td>
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

      {availableDates.length > 1 && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs text-muted-foreground pt-1">Recent dates:</span>
          {availableDates.slice(0, 10).map(d => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                d === selectedDate ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80 border-border text-muted-foreground'
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
