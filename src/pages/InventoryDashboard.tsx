import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  PackagePlus,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Minus,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  Truck,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { inventoryService } from '@/lib/api/inventory';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');

  // Data states
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to access inventory management');
      navigate('/login');
      return;
    }

    const userRole = user?.role || 'customer';
    if (!['admin', 'manager', 'staff'].includes(userRole)) {
      toast.error('You do not have permission to access inventory management');
      navigate('/');
      return;
    }

    loadData();
  }, [isAuthenticated, user, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemsData, suppliersData, categoriesData, posData, alertsData, statsData] = await Promise.all([
        inventoryService.getItems(),
        inventoryService.getSuppliers(true),
        inventoryService.getCategories(true),
        inventoryService.getPurchaseOrders({ limit: 50 }),
        inventoryService.getAlerts({ is_acknowledged: false, limit: 50 }),
        inventoryService.getStatistics()
      ]);

      setItems(itemsData);
      setFilteredItems(itemsData);
      setSuppliers(suppliersData);
      setCategories(categoriesData);
      setPurchaseOrders(posData);
      setAlerts(alertsData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items
  useEffect(() => {
    let filtered = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.sku.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category_id === categoryFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(item => item.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(item => !item.is_active);
    }

    if (showLowStock) {
      filtered = filtered.filter(item => item.quantity <= item.min_quantity);
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, categoryFilter, statusFilter, showLowStock]);

  const handleStockAdjustment = async (itemId, quantity, movementType) => {
    try {
      await inventoryService.createMovement({
        item_id: itemId,
        movement_type: movementType,
        quantity: quantity,
        reason: `Manual ${movementType} adjustment`
      });
      toast.success('Stock adjusted successfully');
      loadData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await inventoryService.acknowledgeAlert(alertId);
      toast.success('Alert acknowledged');
      loadData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const getStockStatus = (item) => {
    if (item.quantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (item.quantity <= item.min_quantity) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  const getPOStatusBadge = (status) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      ordered: 'bg-purple-100 text-purple-800',
      partial: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage stock levels, suppliers, and purchase orders</p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
                <Package className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_items}</div>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(statistics.total_value)} total value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.low_stock_items}</div>
                <p className="text-xs text-gray-500 mt-1">{statistics.out_of_stock_items} out of stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Alerts</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Purchase Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchaseOrders.filter(po => po.status === 'pending').length}</div>
                <p className="text-xs text-gray-500 mt-1">{purchaseOrders.length} total orders</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Alerts Banner */}
        {alerts.length > 0 && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Active Inventory Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${
                        alert.alert_level === 'critical' ? 'bg-red-100' :
                        alert.alert_level === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertCircle className={`h-4 w-4 ${
                          alert.alert_level === 'critical' ? 'text-red-600' :
                          alert.alert_level === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-gray-500">{formatDate(alert.created_at)}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>Track and manage inventory items, suppliers, and orders</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                {activeTab === 'items' && user?.role !== 'staff' && (
                  <Button>
                    <PackagePlus className="h-4 w-4 mr-2" />
                    New Item
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="items">Inventory Items</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search inventory..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {activeTab === 'items' && (
                  <>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-2 border rounded-md"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border rounded-md"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    <Button
                      variant={showLowStock ? "default" : "outline"}
                      onClick={() => setShowLowStock(!showLowStock)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Low Stock
                    </Button>
                  </>
                )}
              </div>

              {/* Inventory Items Tab */}
              <TabsContent value="items" className="space-y-4">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-500">Start by adding inventory items</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">SKU</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Item Name</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Quantity</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Unit Cost</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Total Value</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => {
                          const status = getStockStatus(item);
                          const StatusIcon = status.icon;
                          const totalValue = item.quantity * item.unit_cost;

                          return (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{item.sku}</td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.location && (
                                    <div className="text-sm text-gray-500">Location: {item.location}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {categories.find(c => c.id === item.category_id)?.name || '-'}
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">{item.quantity} {item.unit}</div>
                                  <div className="text-sm text-gray-500">Min: {item.min_quantity}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">{formatCurrency(item.unit_cost)}</td>
                              <td className="py-3 px-4 font-medium">{formatCurrency(totalValue)}</td>
                              <td className="py-3 px-4">
                                <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" title="Add Stock">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" title="Remove Stock">
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Suppliers Tab */}
              <TabsContent value="suppliers" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suppliers.map((supplier) => (
                    <Card key={supplier.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{supplier.name}</CardTitle>
                            <CardDescription>{supplier.supplier_code}</CardDescription>
                          </div>
                          <Badge className={supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {supplier.contact_person && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Contact:</span>
                              <span className="font-medium">{supplier.contact_person}</span>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Email:</span>
                              <span className="font-medium">{supplier.email}</span>
                            </div>
                          )}
                          {supplier.rating && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Rating:</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < supplier.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Purchase Orders Tab */}
              <TabsContent value="purchase-orders" className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">PO Number</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Supplier</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Order Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Expected Delivery</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Total Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{po.po_number}</td>
                          <td className="py-3 px-4">
                            {suppliers.find(s => s.id === po.supplier_id)?.name || 'Unknown'}
                          </td>
                          <td className="py-3 px-4">{formatDate(po.order_date)}</td>
                          <td className="py-3 px-4">
                            {po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '-'}
                          </td>
                          <td className="py-3 px-4 font-medium">{formatCurrency(po.total_amount)}</td>
                          <td className="py-3 px-4">{getPOStatusBadge(po.status)}</td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Analytics</CardTitle>
                    <CardDescription>Insights and trends for your inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* By Category */}
                      <div>
                        <h3 className="font-medium mb-4">Stock Value by Category</h3>
                        <div className="space-y-2">
                          {Object.entries(statistics?.by_category || {}).map(([categoryId, data]) => {
                            const category = categories.find(c => c.id === categoryId);
                            const percentage = (data.value / statistics.total_value) * 100;
                            return (
                              <div key={categoryId}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{category?.name || 'Uncategorized'}</span>
                                  <span className="font-medium">{formatCurrency(data.value)} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recent Movements */}
                      <div>
                        <h3 className="font-medium mb-4">Recent Stock Movements</h3>
                        <div className="space-y-2">
                          {statistics?.recent_movements?.slice(0, 5).map((movement) => {
                            const item = items.find(i => i.id === movement.item_id);
                            return (
                              <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {movement.movement_type === 'in' ? (
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">{item?.name || 'Unknown Item'}</p>
                                    <p className="text-xs text-gray-500">
                                      {movement.movement_type} • {movement.quantity} {item?.unit}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-sm text-gray-500">{formatDate(movement.created_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
