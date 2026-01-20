import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingDown, AlertTriangle, RefreshCw, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, InventoryItem, InventoryCategory, StockMovement, Supplier } from '@/lib/api/inventory';

interface DisplayInventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId?: string;
  currentStock: number;
  unit: string;
  value: number;
  unitCost: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
}

interface PurchaseRecord {
  id: string;
  item: string;
  itemId: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  movementType: string;
  date: string;
  reason?: string;
}

export function InventoryReports() {
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<DisplayInventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [stockMovements, setStockMovements] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { toast } = useToast();

  // Load all data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [itemsData, categoriesData, movementsData, suppliersData] = await Promise.all([
        inventoryService.getItems({}),
        inventoryService.getCategories(),
        inventoryService.getMovements({ limit: 100 }),
        inventoryService.getSuppliers()
      ]);

      // Create category lookup map
      const categoryMap = new Map(categoriesData.map(c => [c.id, c.name]));

      // Transform inventory items to display format
      const displayItems: DisplayInventoryItem[] = itemsData.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category_id ? categoryMap.get(item.category_id) || 'Uncategorized' : 'Uncategorized',
        categoryId: item.category_id,
        currentStock: item.quantity,
        unit: item.unit,
        value: item.quantity * item.unit_cost,
        unitCost: item.unit_cost,
        minStock: item.min_quantity,
        maxStock: item.max_quantity || item.min_quantity * 3,
        reorderPoint: item.reorder_point || item.min_quantity
      }));

      // Create item lookup map for movements
      const itemMap = new Map(itemsData.map(i => [i.id, i]));

      // Transform stock movements to purchase records format
      const purchaseRecords: PurchaseRecord[] = movementsData.map(movement => {
        const item = itemMap.get(movement.item_id);
        return {
          id: movement.id,
          item: item?.name || 'Unknown Item',
          itemId: movement.item_id,
          quantity: movement.quantity,
          unit: item?.unit || 'units',
          costPerUnit: movement.unit_cost || item?.unit_cost || 0,
          totalCost: movement.total_cost || (movement.quantity * (movement.unit_cost || item?.unit_cost || 0)),
          movementType: movement.movement_type,
          date: new Date(movement.created_at).toISOString().split('T')[0],
          reason: movement.reason
        };
      });

      setInventoryItems(displayItems);
      setCategories(categoriesData);
      setStockMovements(purchaseRecords);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading inventory reports data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load inventory reports. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate usage patterns from stock movements
  const usagePatterns = useMemo(() => {
    // Group movements by item and calculate usage
    const itemUsage = new Map<string, {
      totalOut: number;
      totalDamage: number;
      totalExpired: number;
      movements: number;
      item?: DisplayInventoryItem;
    }>();

    stockMovements.forEach(movement => {
      const existing = itemUsage.get(movement.itemId) || {
        totalOut: 0,
        totalDamage: 0,
        totalExpired: 0,
        movements: 0
      };

      if (movement.movementType === 'out') {
        existing.totalOut += movement.quantity;
      } else if (movement.movementType === 'damage') {
        existing.totalDamage += movement.quantity;
      } else if (movement.movementType === 'expired') {
        existing.totalExpired += movement.quantity;
      }
      existing.movements++;

      const item = inventoryItems.find(i => i.id === movement.itemId);
      if (item) existing.item = item;

      itemUsage.set(movement.itemId, existing);
    });

    // Convert to array and calculate patterns
    return Array.from(itemUsage.entries())
      .filter(([_, data]) => data.item)
      .map(([itemId, data]) => {
        const item = data.item!;
        const totalUsed = data.totalOut + data.totalDamage + data.totalExpired;
        const wasteAmount = data.totalDamage + data.totalExpired;
        const wastePercentage = totalUsed > 0 ? (wasteAmount / totalUsed) * 100 : 0;

        // Estimate daily usage (assuming 30-day period)
        const avgDailyUsage = data.totalOut / 30;
        const weeklyUsage = avgDailyUsage * 7;

        // Determine trend based on movement count
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (data.movements > 10) trend = 'increasing';
        else if (data.movements < 3) trend = 'decreasing';

        return {
          itemId,
          item: item.name,
          unit: item.unit,
          currentStock: item.currentStock,
          avgDailyUsage: Number(avgDailyUsage.toFixed(1)),
          weeklyUsage: Number(weeklyUsage.toFixed(1)),
          wastePercentage: Number(wastePercentage.toFixed(1)),
          trend
        };
      })
      .slice(0, 20); // Limit to top 20 items
  }, [stockMovements, inventoryItems]);

  const filteredItems = useMemo(() => {
    if (category === 'all') return inventoryItems;
    return inventoryItems.filter(item => item.categoryId === category);
  }, [category, inventoryItems]);

  const lowStockItems = useMemo(() =>
    inventoryItems.filter(item => item.currentStock <= item.reorderPoint),
    [inventoryItems]
  );

  const outOfStockItems = useMemo(() =>
    inventoryItems.filter(item => item.currentStock <= 0),
    [inventoryItems]
  );

  const totalInventoryValue = useMemo(() =>
    inventoryItems.reduce((sum, item) => sum + item.value, 0),
    [inventoryItems]
  );

  // Filter only "in" movements for purchase history (stock received)
  const purchaseHistory = useMemo(() =>
    stockMovements.filter(m => m.movementType === 'in'),
    [stockMovements]
  );

  const totalPurchasesCost = useMemo(() =>
    purchaseHistory.reduce((sum, purchase) => sum + purchase.totalCost, 0),
    [purchaseHistory]
  );

  const avgWastePercentage = useMemo(() => {
    if (usagePatterns.length === 0) return 0;
    return usagePatterns.reduce((sum, item) => sum + item.wastePercentage, 0) / usagePatterns.length;
  }, [usagePatterns]);

  const handleExport = (format: string) => {
    toast({
      title: "Export initiated",
      description: `Exporting inventory report as ${format.toUpperCase()}...`
    });
  };

  const handleRefresh = () => {
    loadData();
    toast({
      title: "Refreshing data",
      description: "Loading latest inventory data..."
    });
  };

  const getStockStatus = (item: DisplayInventoryItem) => {
    if (item.currentStock <= 0) return { label: 'Out of Stock', variant: 'destructive' };
    if (item.currentStock <= item.minStock) return { label: 'Critical', variant: 'destructive' };
    if (item.currentStock <= item.reorderPoint) return { label: 'Low', variant: 'default' };
    if (item.currentStock >= item.maxStock) return { label: 'Overstocked', variant: 'secondary' };
    return { label: 'Adequate', variant: 'outline' };
  };

  const getMovementTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'in': { label: 'Stock In', variant: 'default' },
      'out': { label: 'Stock Out', variant: 'secondary' },
      'adjustment': { label: 'Adjustment', variant: 'outline' },
      'damage': { label: 'Damage', variant: 'destructive' },
      'expired': { label: 'Expired', variant: 'destructive' },
      'return': { label: 'Return', variant: 'default' },
      'transfer': { label: 'Transfer', variant: 'outline' }
    };
    return types[type] || { label: type, variant: 'outline' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading inventory reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totalInventoryValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {inventoryItems.length} items in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {outOfStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Critical items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totalPurchasesCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {purchaseHistory.length} receipts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Avg Waste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgWastePercentage > 5 ? 'text-red-600' : avgWastePercentage > 3 ? 'text-orange-600' : 'text-green-600'}`}>
              {avgWastePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt; 3%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => handleExport('pdf')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => handleExport('excel')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Reports */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stock">
            <Package className="h-4 w-4 mr-2" />
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="movements">
            Stock Movements
          </TabsTrigger>
          <TabsTrigger value="usage">
            Usage Patterns
          </TabsTrigger>
          <TabsTrigger value="reorder">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reorder List
          </TabsTrigger>
        </TabsList>

        {/* Stock Levels Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Stock Levels</CardTitle>
              <CardDescription>Real-time inventory status and valuation from database</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory items found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min/Max</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.currentStock} {item.unit}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.minStock} / {item.maxStock} {item.unit}
                          </TableCell>
                          <TableCell>KES {item.unitCost.toLocaleString()}</TableCell>
                          <TableCell>KES {item.value.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant as any}>
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
              <CardDescription>Track all inventory movements - receipts, usage, damage, and adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              {stockMovements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No stock movements recorded
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.slice(0, 50).map((movement) => {
                      const typeBadge = getMovementTypeBadge(movement.movementType);
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>{movement.date}</TableCell>
                          <TableCell className="font-medium">{movement.item}</TableCell>
                          <TableCell>
                            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {movement.quantity} {movement.unit}
                          </TableCell>
                          <TableCell>KES {movement.costPerUnit.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">
                            KES {movement.totalCost.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.reason || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Stock Received Value</span>
                  <span className="text-2xl font-bold">
                    KES {totalPurchasesCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns & Waste Analysis</CardTitle>
              <CardDescription>Track consumption trends and minimize waste (calculated from stock movements)</CardDescription>
            </CardHeader>
            <CardContent>
              {usagePatterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No usage data available. Add stock movements to see patterns.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Daily Avg Usage</TableHead>
                      <TableHead>Weekly Usage</TableHead>
                      <TableHead>Waste %</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Days Until Empty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usagePatterns.map((pattern) => {
                      const daysRemaining = pattern.avgDailyUsage > 0
                        ? Math.floor(pattern.currentStock / pattern.avgDailyUsage)
                        : 999;
                      return (
                        <TableRow key={pattern.itemId}>
                          <TableCell className="font-medium">{pattern.item}</TableCell>
                          <TableCell>{pattern.currentStock} {pattern.unit}</TableCell>
                          <TableCell>{pattern.avgDailyUsage} {pattern.unit}/day</TableCell>
                          <TableCell>{pattern.weeklyUsage} {pattern.unit}</TableCell>
                          <TableCell>
                            <span className={pattern.wastePercentage > 5 ? 'text-red-600 font-semibold' : ''}>
                              {pattern.wastePercentage}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              pattern.trend === 'increasing' ? 'default' :
                              pattern.trend === 'decreasing' ? 'secondary' : 'outline'
                            }>
                              {pattern.trend}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={daysRemaining <= 3 ? 'text-red-600 font-semibold' : ''}>
                              {daysRemaining > 100 ? '100+ days' : `~${daysRemaining} days`}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">High Waste Items</p>
                  <p className="text-xl font-bold text-red-600">
                    {usagePatterns.filter(p => p.wastePercentage > 5).length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Efficient Items</p>
                  <p className="text-xl font-bold text-green-600">
                    {usagePatterns.filter(p => p.wastePercentage <= 3).length}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Increasing Demand</p>
                  <p className="text-xl font-bold text-orange-600">
                    {usagePatterns.filter(p => p.trend === 'increasing').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reorder Recommendations Tab */}
        <TabsContent value="reorder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reorder Recommendations</CardTitle>
              <CardDescription>
                Items below reorder point - based on real inventory data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  All items are adequately stocked
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Reorder Point</TableHead>
                        <TableHead>Suggested Qty</TableHead>
                        <TableHead>Est. Cost</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => {
                        const suggestedQty = item.maxStock - item.currentStock;
                        const estCost = suggestedQty * item.unitCost;
                        const priority = item.currentStock <= 0 ? 'Critical' :
                                        item.currentStock <= item.minStock ? 'High' : 'Medium';

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <span className={item.currentStock <= 0 ? 'text-red-600 font-semibold' : 'text-orange-600 font-semibold'}>
                                {item.currentStock} {item.unit}
                              </span>
                            </TableCell>
                            <TableCell>{item.reorderPoint} {item.unit}</TableCell>
                            <TableCell className="font-semibold">
                              {suggestedQty} {item.unit}
                            </TableCell>
                            <TableCell>KES {estCost.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                priority === 'Critical' ? 'destructive' :
                                priority === 'High' ? 'default' : 'secondary'
                              }>
                                {priority}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Estimated Reorder Cost</span>
                      <span className="text-2xl font-bold">
                        KES {lowStockItems.reduce((sum, item) => {
                          const suggestedQty = item.maxStock - item.currentStock;
                          return sum + (suggestedQty * item.unitCost);
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
