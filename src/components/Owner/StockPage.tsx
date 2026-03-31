// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { UnifiedStockDashboard } from '@/components/Stock/UnifiedStockDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, BedDouble, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api/client';
import { toast } from 'react-hot-toast';

interface LinenItem {
  id: string;
  item_name: string;
  category: string;
  total_quantity: number;
  in_use_quantity: number;
  in_laundry_quantity: number;
  damaged_quantity: number;
  reorder_level: number;
  unit: string;
  notes?: string;
  updated_at?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  linen: 'Linen',
  towel: 'Towels',
  pillow: 'Pillows',
  blanket: 'Blankets',
  mattress: 'Mattresses',
  curtain: 'Curtains',
  other: 'Other',
};

function LinenInventoryView() {
  const [items, setItems] = useState<LinenItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/maintenance/linen');
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load linen inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const available = (item: LinenItem) =>
    item.total_quantity - item.in_use_quantity - item.in_laundry_quantity - item.damaged_quantity;

  const isLow = (item: LinenItem) => available(item) <= item.reorder_level;

  // Group by category
  const grouped: Record<string, LinenItem[]> = {};
  items.forEach(item => {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const totalItems = items.length;
  const lowItems = items.filter(isLow).length;
  const totalValue = items.reduce((s, i) => s + i.total_quantity, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Item Types</p>
            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Units</p>
            <p className="text-2xl font-bold text-foreground">{totalValue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Low / Reorder</p>
            <p className={`text-2xl font-bold ${lowItems > 0 ? 'text-amber-500' : 'text-green-500'}`}>{lowItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold text-foreground">{Object.keys(grouped).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-indigo-500" />
              Housekeeping Linen Inventory
            </CardTitle>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No linen items configured yet. Ask the manager to add items.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[cat] || cat}
                  </h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Item</th>
                          <th className="text-center px-3 py-2 font-medium">Total</th>
                          <th className="text-center px-3 py-2 font-medium">In Use</th>
                          <th className="text-center px-3 py-2 font-medium">Laundry</th>
                          <th className="text-center px-3 py-2 font-medium">Damaged</th>
                          <th className="text-center px-3 py-2 font-medium">Available</th>
                          <th className="text-center px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catItems.map((item, i) => {
                          const avail = available(item);
                          const low = isLow(item);
                          return (
                            <tr
                              key={item.id}
                              className={`border-t border-border ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'} ${low ? 'bg-amber-500/5' : ''}`}
                            >
                              <td className="px-3 py-2 text-foreground font-medium">
                                {item.item_name}
                                <span className="text-xs text-muted-foreground ml-1">({item.unit})</span>
                              </td>
                              <td className="px-3 py-2 text-center text-foreground">{item.total_quantity}</td>
                              <td className="px-3 py-2 text-center text-blue-500">{item.in_use_quantity}</td>
                              <td className="px-3 py-2 text-center text-purple-500">{item.in_laundry_quantity}</td>
                              <td className="px-3 py-2 text-center text-red-500">{item.damaged_quantity}</td>
                              <td className="px-3 py-2 text-center font-semibold text-foreground">{avail}</td>
                              <td className="px-3 py-2 text-center">
                                {avail <= 0 ? (
                                  <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-xs">Out</Badge>
                                ) : low ? (
                                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />Low
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">OK</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const StockPage = () => (
  <Tabs defaultValue="inventory" className="space-y-4">
    <TabsList>
      <TabsTrigger value="inventory">
        <Package className="h-4 w-4 mr-2" />
        Kitchen & Bar Inventory
      </TabsTrigger>
      <TabsTrigger value="linen">
        <BedDouble className="h-4 w-4 mr-2" />
        Housekeeping
      </TabsTrigger>
    </TabsList>

    <TabsContent value="inventory">
      {/* No department filter — shows all tracked menu items */}
      <UnifiedStockDashboard mode="owner" />
    </TabsContent>

    <TabsContent value="linen">
      <LinenInventoryView />
    </TabsContent>
  </Tabs>
);
