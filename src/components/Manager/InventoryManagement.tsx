import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Edit,
  RefreshCw,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ShoppingCart,
  Truck,
  Users,
  Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  unit_cost: number;
  supplier?: string;
  last_restocked_at?: string;
  expiry_date?: string;
  is_expired?: boolean;
  is_low_stock?: boolean;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  last_order_date?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  total: number;
  status: 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';
  expected_delivery_date?: string;
  created_at: string;
}

export function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setIsLoading(true);
    try {
      // Fetch real inventory data from backend
      const [itemsResponse, suppliersResponse, purchaseOrdersResponse] = await Promise.all([
        fetch('/api/v1/inventory/items'),
        fetch('/api/v1/inventory/suppliers'),
        fetch('/api/v1/inventory/purchase-orders')
      ]);

      if (!itemsResponse.ok || !suppliersResponse.ok || !purchaseOrdersResponse.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const itemsData = await itemsResponse.json();
      const suppliersData = await suppliersResponse.json();
      const purchaseOrdersData = await purchaseOrdersResponse.json();

      setItems(itemsData);
      setSuppliers(suppliersData);
      setPurchaseOrders(purchaseOrdersData);
      } catch (error: any) {
      console.error('Error loading inventory data:', error);
      toast.error('Failed to load inventory data');
      
      // Fallback to localStorage data if API is not available
      const cachedItems = localStorage.getItem('inventory_management_items');
      const cachedSuppliers = localStorage.getItem('inventory_management_suppliers');
      const cachedPurchaseOrders = localStorage.getItem('inventory_management_purchase_orders');
      
      if (cachedItems && cachedSuppliers && cachedPurchaseOrders) {
        try {
          setItems(JSON.parse(cachedItems));
          setSuppliers(JSON.parse(cachedSuppliers));
          setPurchaseOrders(JSON.parse(cachedPurchaseOrders));
          toast.success('Using cached inventory data');
        } catch (parseError) {
          console.error('Failed to parse cached inventory data:', parseError);
          toast.error('Cached inventory data is corrupted');
        }
      } else {
        toast.error('No cached inventory data available');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = (itemId: string, adjustment: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity: Math.max(0, item.quantity + adjustment) }
        : item
    ));
    toast.success('Stock adjusted successfully');
  };

  const handleRestock = (itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity: item.min_quantity + 20, last_restocked_at: new Date().toISOString() }
        : item
    ));
    toast.success('Item restocked successfully');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'low-stock' && item.is_low_stock) ||
                         (statusFilter === 'out-of-stock' && item.quantity === 0) ||
                         (statusFilter === 'expired' && item.is_expired) ||
                         (statusFilter === 'healthy' && !item.is_low_stock && item.quantity > 0 && !item.is_expired);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) {
      return { label: 'Out of Stock', color: 'red', icon: XCircle };
    }
    if (item.is_low_stock) {
      return { label: 'Low Stock', color: 'yellow', icon: AlertTriangle };
    }
    if (item.is_expired) {
      return { label: 'Expired', color: 'red', icon: AlertCircle };
    }
    return { label: 'Healthy', color: 'green', icon: CheckCircle };
  };

  const getPurchaseOrderStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'approved': return 'bg-blue-500';
      case 'sent': return 'bg-yellow-500';
      case 'received': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategories = () => {
    const categories = Array.from(new Set(items.map(item => item.category)));
    return ['all', ...categories];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Management
              </CardTitle>
              <CardDescription>
                Track stock levels, manage suppliers, and monitor inventory performance
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Button variant="outline">
                <Truck className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inventory" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inventory">
                <Package className="h-4 w-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="suppliers">
                <Users className="h-4 w-4 mr-2" />
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase Orders
              </TabsTrigger>
            </TabsList>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, SKU, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading inventory...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No inventory items found</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        const Icon = status.icon;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{item.sku}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 text-${status.color}-500`} />
                                <span className="font-medium">{item.quantity} {item.unit}</span>
                                <span className="text-xs text-muted-foreground">
                                  (Min: {item.min_quantity})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  status.color === 'green' ? 'border-green-500 text-green-700' :
                                  status.color === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                                  'border-red-500 text-red-700'
                                }
                              >
                                <Icon className={`h-3 w-3 mr-1`} />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                KES {(item.quantity * item.unit_cost).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                @{item.unit_cost}/unit
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{item.supplier || 'N/A'}</div>
                              {item.last_restocked_at && (
                                <div className="text-xs text-muted-foreground">
                                  Last: {format(new Date(item.last_restocked_at), 'MMM dd')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRestock(item.id)}
                                  disabled={item.quantity > 0}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Restock
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdjustStock(item.id, -1)}
                                >
                                  -1
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdjustStock(item.id, 1)}
                                >
                                  +1
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Suppliers Tab */}
            <TabsContent value="suppliers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Supplier Management</CardTitle>
                  <CardDescription>
                    Manage your suppliers and track their performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Contact Info</TableHead>
                          <TableHead>Last Order</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliers.map((supplier) => (
                          <TableRow key={supplier.id}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell>{supplier.contact_person}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{supplier.phone}</div>
                                <div className="text-muted-foreground">{supplier.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {supplier.last_order_date ? (
                                <div className="text-sm">
                                  {format(new Date(supplier.last_order_date), 'MMM dd, yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No orders</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  Contact
                                </Button>
                                <Button size="sm" variant="outline">
                                  View Orders
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Purchase Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Order Tracking</CardTitle>
                  <CardDescription>
                    Monitor purchase orders and delivery status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expected Delivery</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell>
                              <div className="font-medium">{po.po_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(po.created_at), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>{po.supplier_name}</TableCell>
                            <TableCell>
                              <div className="font-medium">KES {po.total.toLocaleString()}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getPurchaseOrderStatusColor(po.status)} text-white`}>
                                <div className="flex items-center gap-1 capitalize">
                                  <div className={`w-2 h-2 rounded-full ${
                                    po.status === 'received' ? 'bg-white' : 'bg-gray-200'
                                  }`} />
                                  {po.status}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {po.expected_delivery_date ? (
                                <div className="text-sm">
                                  {format(new Date(po.expected_delivery_date), 'MMM dd, yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  View Details
                                </Button>
                                {po.status === 'sent' && (
                                  <Button size="sm" variant="outline">
                                    Mark Received
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}