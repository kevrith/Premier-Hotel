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
  stock_date: string;
  opening_stock: number;
  purchases: number;
  used: number;
  waste: number;
  closing_stock: number;
  notes: string;
  log_id?: string;
}

interface Props {
  readOnly?: boolean;
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

  // Group rows by category
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
      setRows(res.data.items || []);
    } catch {
      toast.error('Failed to load ingredients stock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    loadStock(selectedDate);
  }, [selectedDate, loadStock]);

  const handleChange = (idx: number, field: keyof IngredientRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[idx], [field]: field === 'notes' ? value : parseFloat(value) || 0 };
      updated[idx] = row;
      return updated;
    });
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
          used: r.used,
          waste: r.waste,
          closing_stock: r.closing_stock,
          notes: r.notes || null,
        }))
      );
      toast.success('Ingredients stock saved');
      await loadDates();
    } catch {
      toast.error('Failed to save ingredients stock');
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (dir: -1 | 1) => {
    const idx = availableDates.indexOf(selectedDate);
    const next = idx + dir;
    if (next >= 0 && next < availableDates.length) setSelectedDate(availableDates[next]);
  };

  const totalUsed = rows.reduce((s, r) => s + (r.used || 0), 0);
  const totalWaste = rows.reduce((s, r) => s + (r.waste || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-lg">Ingredients Stock Take</CardTitle>
                <CardDescription>Daily raw ingredient tracking — spinach, onions, tomatoes, etc.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 border rounded-md">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)} disabled={availableDates.indexOf(selectedDate) >= availableDates.length - 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 font-medium">{selectedDate}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)} disabled={availableDates.indexOf(selectedDate) <= 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadStock(selectedDate)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Summary badges */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">{rows.length} ingredients</Badge>
            <Badge variant="outline" className="text-orange-600 border-orange-300">Used: {totalUsed.toFixed(2)}</Badge>
            <Badge variant="outline" className="text-red-600 border-red-300">Waste: {totalWaste.toFixed(2)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table per category */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading ingredients...</div>
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
                      <th className="text-center px-2 py-2 font-medium w-16">Unit</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Opening</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Purchases</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Used</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Waste</th>
                      <th className="text-center px-2 py-2 font-medium w-24">Closing</th>
                      <th className="text-left px-2 py-2 font-medium min-w-[120px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map((row) => {
                      const globalIdx = rows.findIndex(r => r.ingredient_id === row.ingredient_id);
                      return (
                        <tr key={row.ingredient_id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-2 py-2 text-center text-muted-foreground text-xs">{row.unit}</td>
                          {(['opening_stock', 'purchases', 'used', 'waste', 'closing_stock'] as const).map(field => (
                            <td key={field} className="px-2 py-1 text-center">
                              {canEdit ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  className="h-7 text-center text-sm w-20 mx-auto"
                                  value={row[field] || ''}
                                  onChange={e => handleChange(globalIdx, field, e.target.value)}
                                />
                              ) : (
                                <span>{row[field] || 0}</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-1">
                            {canEdit ? (
                              <Input
                                className="h-7 text-sm"
                                placeholder="Optional"
                                value={row.notes || ''}
                                onChange={e => handleChange(globalIdx, 'notes', e.target.value)}
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

      {!loading && rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No ingredients found. Add ingredients in the Ingredients Management tab.
        </div>
      )}
    </div>
  );
}
