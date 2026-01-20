/**
 * Inventory Management Component
 * Comprehensive inventory tracking, stock management, and analytics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ShoppingCart,
  Truck,
  Users
} from 'lucide-react';

// Import Purchase Order Components
import PurchaseOrderDashboard from './PurchaseOrderDashboard';
import PurchaseOrderList from './PurchaseOrderList';
import SupplierManagement from './SupplierManagement';

// Import real inventory API - UPDATED v2.0
import { inventoryService } from '@/lib/api/inventory';

interface InventoryDashboard {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_inventory_value: number;
  unresolved_alerts: number;
  recent_transactions_count: number;
  currency: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  supplier_id?: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  max_quantity?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  unit_cost: number;
  selling_price?: number;
  location?: string;
  barcode?: string;
  expiry_tracking: boolean;
  is_active: boolean;
  last_restocked_at?: string;
  created_at: string;
  updated_at: string;
}

interface InventoryAlert {
  id: string;
  item_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring_soon' | 'expired';
  alert_level: 'info' | 'warning' | 'critical';
  message: string;
  current_quantity?: number;
  threshold_quantity?: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export function InventoryManagement() {
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData, alertsData] = await Promise.all([
        inventoryService.getItems({}),
        inventoryService.getCategories(),
        inventoryService.getAlerts({})
      ]);

      setItems(itemsData);
      setCategories(categoriesData);
      setAlerts(alertsData);

      // Calculate dashboard stats from items
      const totalItems = itemsData.length;
      const lowStockItems = itemsData.filter(item =>
        item.quantity <= (item.reorder_point || item.min_quantity)
      ).length;
      const outOfStockItems = itemsData.filter(item =>
        item.quantity <= 0
      ).length;
      const totalValue = itemsData.reduce((sum, item) =>
        sum + (item.quantity * (item.unit_cost || 0)), 0
      );

      setDashboard({
        total_items: totalItems,
        low_stock_items: lowStockItems,
        out_of_stock_items: outOfStockItems,
        total_inventory_value: totalValue,
        unresolved_alerts: alertsData.length,
        recent_transactions_count: 0,
        currency: 'KES'
      });
    } catch (error: any) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsAdjustDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to discontinue this item?')) return;

    try {
      await inventoryService.deleteItem(itemId);
      toast.success('Item discontinued successfully');
      loadData();
    } catch (error: any) {
      toast.error('Failed to discontinue item');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && item.is_active) ||
                         (statusFilter === 'inactive' && !item.is_active);
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { label: 'Out of Stock', color: 'red', icon: XCircle };
    }
    if (item.quantity <= (item.reorder_point || item.min_quantity)) {
      return { label: 'Low Stock', color: 'yellow', icon: AlertTriangle };
    }
    return { label: 'In Stock', color: 'green', icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">
            Track stock levels, manage suppliers, and monitor inventory performance
          </p>
        </div>
        <Button onClick={handleAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.total_items}</div>
              <p className="text-xs text-muted-foreground">Active inventory items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{dashboard.low_stock_items}</div>
              <p className="text-xs text-muted-foreground">Items need reordering</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{dashboard.out_of_stock_items}</div>
              <p className="text-xs text-muted-foreground">Items unavailable</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.currency} {dashboard.total_inventory_value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={alert.alert_level === 'critical' ? 'destructive' : 'default'}
                      className={
                        alert.alert_level === 'warning' ? 'bg-orange-500' :
                        alert.alert_level === 'info' ? 'bg-yellow-500' : ''
                      }
                    >
                      {alert.alert_level}
                    </Badge>
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground">
                        Type: {alert.alert_type.replace('_', ' ')} {alert.current_quantity !== undefined && `- Current: ${alert.current_quantity}`}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="beverages">Beverages</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inventory Items</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Item</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Stock</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Value</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                            ? 'No items match your filters'
                            : 'No inventory items yet. Add your first item to get started.'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        const Icon = status.icon;

                        return (
                          <tr key={item.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.location && (
                                  <p className="text-sm text-muted-foreground">{item.location}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{item.sku || '-'}</td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">
                                  {item.quantity} {item.unit}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Reorder at: {item.reorder_point || item.min_quantity}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={
                                  status.color === 'green' ? 'border-green-500 text-green-700' :
                                  status.color === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                                  'border-red-500 text-red-700'
                                }
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">
                                KES {(item.quantity * item.unit_cost).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{item.unit_cost}/unit
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdjustStock(item)}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Adjust
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beverages">
          <Card>
            <CardHeader>
              <CardTitle>Beverage Inventory</CardTitle>
              <CardDescription>
                Track beverage stock levels - These items are linked to your menu and automatically
                update when orders are placed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Beverage tracking will be displayed here</p>
                <p className="text-sm mt-2">Filter by beverage category to see soft drinks, juices, alcoholic beverages, etc.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
              <CardDescription>
                Track inventory performance, turnover rates, and identify optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Inventory analytics will be displayed here</p>
                <p className="text-sm mt-2">Coming soon: Stock turnover rates, usage patterns, and cost analysis</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrderList />
        </TabsContent>

        <TabsContent value="suppliers">
          <SupplierManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <PurchaseOrderDashboard />
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transactions</CardTitle>
              <CardDescription>
                View all inventory movements including purchases, adjustments, and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Transaction history will be displayed here</p>
                <p className="text-sm mt-2">Track all stock movements with full audit trail</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
