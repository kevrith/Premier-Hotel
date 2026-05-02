// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, RefreshCw, Leaf } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface IngredientRow {
  ingredient_id: string;
  name: string;
  unit: string;
  category: string;
  sort_order: number;
  opening_stock: number;
  purchases: number;
  waste: number;
  closing_stock: number;
  notes: string;
  log_id?: string;
}

interface Props {
  readOnly?: boolean;
}

function calcUsed(row: IngredientRow) {
  return Math.max(0, row.opening_stock + row.purchases - row.waste - row.closing_stock);
}

export function IngredientsStockTake({ readOnly = false }: Props) {
  const { role } = useAuth();
  const { hasPermission } = usePermissions();

  const canEdit = !readOnly && (
    ['admin', 'manager', 'chef'].includes(role || '') ||
    hasPermission('can_manage_ingredients')
  );

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const grouped = rows.reduce<Record<string, IngredientRow[]>>((acc, row) => {
    const cat = row.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  const loadDates = useCallback(async () => {
    try {
      const res = await api.get('/kitchen-stock/ingredients/daily/dates');
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
      const res = await api.get('/kitchen-stock/ingredients/daily', { params: { stock_date: d } });
      setRows((res.data.items || []).map((it: any) => ({
        ingredient_id: it.ingredient_id,
        name: it.name,
        unit: it.unit,
        category: it.category,
        sort_order: it.sort_order,
        opening_stock: it.opening_stock ?? 0,
        purchases: it.purchases ?? 0,
        waste: it.waste ?? 0,
        closing_stock: it.closing_stock ?? 0,
        notes: it.notes ?? '',
        log_id: it.log_id,
      })));
    } catch {
      toast.error('Failed to load ingredients stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDates(); }, [loadDates]);
  useEffect(() => { loadStock(selectedDate); }, [selectedDate, loadStock]);

  const update = (idx: number, field: keyof IngredientRow, value: string) => {
    setRows(prev => prev.map((r, i) => i !== idx ? r : {
      ...r,
      [field]: field === 'notes' ? value : parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(
        `/kitchen-stock/ingredients/daily?stock_date=${selectedDate}`,
        rows.map(r => ({
          ingredient_id: r.ingredient_id,
          opening_stock: r.opening_stock,
          purchases: r.purchases,
          waste: r.waste,
          closing_stock: r.closing_stock,
          notes: r.notes || null,
        }))
      );
      toast.success('Ingredients stock saved');
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

  const totalUsed = rows.reduce((s, r) => s + calcUsed(r), 0);
  const totalWaste = rows.reduce((s, r) => s + (r.waste || 0), 0);
  const idx = availableDates.indexOf(selectedDate);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-lg">Ingredients Stock Take</CardTitle>
                <CardDescription>
                  Opening auto-fills from previous day. Used = Opening + Purchases − Waste − Closing.
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
          <div className="flex flex-wrap gap-2 text-sm">
            {selectedDate === today && <Badge className="bg-green-500/10 text-green-700 border-green-300">Today</Badge>}
            <Badge variant="outline">{rows.length} ingredients</Badge>
            <Badge variant="outline" className="text-orange-600 border-orange-300">Total Used: {totalUsed.toFixed(2)}</Badge>
            <Badge variant="outline" className="text-red-600 border-red-300">Total Waste: {totalWaste.toFixed(2)}</Badge>
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
                      <th className="text-left px-3 py-2 font-medium min-w-[130px]">Ingredient</th>
                      <th className="text-center px-2 py-2 font-medium w-14">Unit</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Opening</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Purchases</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Waste</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Closing</th>
                      <th className="text-center px-2 py-2 font-medium w-24 bg-orange-50 dark:bg-orange-950/20">Used ✦</th>
                      <th className="text-left px-2 py-2 font-medium min-w-[120px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map((row) => {
                      const globalIdx = rows.findIndex(r => r.ingredient_id === row.ingredient_id);
                      const used = calcUsed(row);
                      return (
                        <tr key={row.ingredient_id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-2 py-2 text-center text-muted-foreground text-xs">{row.unit}</td>
                          {(['opening_stock', 'purchases', 'waste', 'closing_stock'] as const).map(field => (
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
                          {/* Used — auto-computed, read-only */}
                          <td className="px-2 py-2 text-center bg-orange-50 dark:bg-orange-950/20">
                            <span className={`font-semibold text-sm ${used > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                              {used.toFixed(2)}
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

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}

      {/* Date history */}
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
