/**
 * Enhanced Inventory Management Component
 * Comprehensive inventory tracking with categories, usage logging, and alerts
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Download,
  Upload,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { housekeepingService } from '@/lib/api/housekeeping';

interface InventoryItem {
  id: string;
  name: string;
  category: 'linens' | 'toiletries' | 'cleaning' | 'amenities' | 'equipment';
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_cost: number;
  storage_location: string;
  supplier?: string;
  last_restocked?: string;
  usage_rate?: number; // Items used per day
  notes?: string;
}

interface UsageLog {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  used_by: string;
  room_number?: string;
  task_id?: string;
  timestamp: string;
  notes?: string;
}

interface StockAlert {
  id: string;
  item_id: string;
  item_name: string;
  current_stock: number;
  min_stock: number;
  alert_type: 'low_stock' | 'out_of_stock' | 'expiring';
  severity: 'warning' | 'critical';
}

export function InventoryManagement() {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [selectedTab, setSelectedTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInventory();
    loadUsageLogs();
    loadAlerts();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, categoryFilter]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await housekeepingService.getInventory();
      setItems(data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsageLogs = async () => {
    try {
      const data = await housekeepingService.getUsageLogs({ limit: 100 });
      setUsageLogs(data);
    } catch (error) {
      console.error('Failed to load usage logs:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const lowStockItems = items.filter(item => item.current_stock <= item.min_stock);
      const mappedAlerts: StockAlert[] = lowStockItems.map(item => ({
        id: item.id,
        item_id: item.id,
        item_name: item.name,
        current_stock: item.current_stock,
        min_stock: item.min_stock,
        alert_type: item.current_stock === 0 ? 'out_of_stock' : 'low_stock',
        severity: item.current_stock === 0 ? 'critical' : 'warning'
      }));
      setAlerts(mappedAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.storage_location.toLowerCase().includes(query) ||
        item.supplier?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const handleAddUsage = async (itemId: string, quantity: number, details: any) => {
    try {
      await housekeepingService.logItemUsage({
        item_id: itemId,
        quantity,
        ...details
      });

      // Update local stock
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, current_stock: item.current_stock - quantity } : item
      ));

      toast.success('Usage logged successfully');
      loadUsageLogs();
      loadAlerts();
    } catch (error) {
      console.error('Failed to log usage:', error);
      toast.error('Failed to log usage');
    }
  };

  const handleRestockItem = async (itemId: string, quantity: number) => {
    try {
      await housekeepingService.restockItem(itemId, {
        quantity,
        restocked_by: 'current_user', // Replace with actual user
        notes: 'Manual restock'
      });

      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              current_stock: item.current_stock + quantity,
              last_restocked: new Date().toISOString()
            }
          : item
      ));

      toast.success('Item restocked successfully');
      loadAlerts();
    } catch (error) {
      console.error('Failed to restock item:', error);
      toast.error('Failed to restock item');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'linens': return '🛏️';
      case 'toiletries': return '🧴';
      case 'cleaning': return '🧹';
      case 'amenities': return '☕';
      case 'equipment': return '🔧';
      default: return '📦';
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.current_stock / item.max_stock) * 100;

    if (item.current_stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', percentage: 0 };
    } else if (item.current_stock <= item.min_stock) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', percentage };
    } else if (percentage >= 90) {
      return { label: 'Fully Stocked', color: 'bg-green-100 text-green-800', percentage };
    } else {
      return { label: 'In Stock', color: 'bg-blue-100 text-blue-800', percentage };
    }
  };

  const stats = {
    totalItems: items.length,
    lowStock: items.filter(item => item.current_stock <= item.min_stock).length,
    outOfStock: items.filter(item => item.current_stock === 0).length,
    totalValue: items.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">Track supplies, usage, and restocking needs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => {
            setSelectedItem(null);
            setShowItemDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Low Stock Alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Out of Stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="linens">Linens</SelectItem>
                <SelectItem value="toiletries">Toiletries</SelectItem>
                <SelectItem value="cleaning">Cleaning Supplies</SelectItem>
                <SelectItem value="amenities">Amenities</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'No items match your filters'
                    : 'No inventory items'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Reorder at: {item.reorder_point} {item.unit}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getCategoryIcon(item.category)}</span>
                              <span className="capitalize">{item.category}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {item.current_stock} / {item.max_stock} {item.unit}
                              </div>
                              <Progress value={status.percentage} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>{item.storage_location}</TableCell>
                          <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>
                            ${(item.current_stock * item.unit_cost).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const quantity = prompt(`Restock quantity for ${item.name}:`);
                                  if (quantity) {
                                    handleRestockItem(item.id, parseInt(quantity));
                                  }
                                }}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Restock
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowUsageDialog(true);
                                }}
                              >
                                Log Use
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowItemDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
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

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Usage</CardTitle>
              <CardDescription>Track consumption of inventory items</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No usage logs yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.item_name}</TableCell>
                        <TableCell>{log.quantity}</TableCell>
                        <TableCell>{log.used_by}</TableCell>
                        <TableCell>{log.room_number || '-'}</TableCell>
                        <TableCell>
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No stock alerts - all items are adequately stocked!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${
                    alert.severity === 'critical'
                      ? 'border-l-red-500 bg-red-50'
                      : 'border-l-yellow-500 bg-yellow-50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                          }`}
                        />
                        <div>
                          <div className="font-medium">{alert.item_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Current stock: {alert.current_stock} (Min: {alert.min_stock})
                          </div>
                          <Badge className="mt-2" variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.alert_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const item = items.find(i => i.id === alert.item_id);
                          if (item) {
                            const quantity = prompt(`Restock quantity for ${item.name}:`, item.reorder_quantity.toString());
                            if (quantity) {
                              handleRestockItem(item.id, parseInt(quantity));
                            }
                          }
                        }}
                      >
                        Restock Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => {
          setShowItemDialog(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSave={() => {
          setShowItemDialog(false);
          loadInventory();
        }}
      />

      {/* Usage Dialog */}
      <UsageDialog
        isOpen={showUsageDialog}
        onClose={() => {
          setShowUsageDialog(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSave={(quantity, details) => {
          if (selectedItem) {
            handleAddUsage(selectedItem.id, quantity, details);
          }
          setShowUsageDialog(false);
        }}
      />
    </div>
  );
}

// Item Dialog Component
interface ItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSave: () => void;
}

function ItemDialog({ isOpen, onClose, item, onSave }: ItemDialogProps) {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'cleaning',
    unit: 'units',
    current_stock: 0,
    min_stock: 0,
    max_stock: 0,
    reorder_point: 0,
    reorder_quantity: 0,
    unit_cost: 0,
    storage_location: '',
    supplier: '',
    notes: ''
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        name: '',
        category: 'cleaning',
        unit: 'units',
        current_stock: 0,
        min_stock: 0,
        max_stock: 0,
        reorder_point: 0,
        reorder_quantity: 0,
        unit_cost: 0,
        storage_location: '',
        supplier: '',
        notes: ''
      });
    }
  }, [item, isOpen]);

  const handleSubmit = () => {
    if (!formData.name || !formData.storage_location) {
      toast.error('Please fill in required fields');
      return;
    }

    toast.success(item ? 'Item updated' : 'Item created');
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update item details' : 'Add a new item to inventory'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Hand Towels"
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linens">Linens</SelectItem>
                  <SelectItem value="toiletries">Toiletries</SelectItem>
                  <SelectItem value="cleaning">Cleaning Supplies</SelectItem>
                  <SelectItem value="amenities">Amenities</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Min Stock</Label>
              <Input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Stock</Label>
              <Input
                type="number"
                value={formData.max_stock}
                onChange={(e) => setFormData({ ...formData, max_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., pieces, bottles"
              />
            </div>

            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reorder Qty</Label>
              <Input
                type="number"
                value={formData.reorder_quantity}
                onChange={(e) => setFormData({ ...formData, reorder_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Storage Location *</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="e.g., Storage Room A, Shelf 3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supplier (Optional)</Label>
            <Input
              value={formData.supplier || ''}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{item ? 'Update Item' : 'Add Item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Usage Dialog Component
interface UsageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSave: (quantity: number, details: any) => void;
}

function UsageDialog({ isOpen, onClose, item, onSave }: UsageDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [roomNumber, setRoomNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (item && quantity > item.current_stock) {
      toast.error('Quantity exceeds current stock');
      return;
    }

    onSave(quantity, {
      room_number: roomNumber || undefined,
      notes: notes || undefined,
      used_by: 'current_user' // Replace with actual user
    });

    // Reset form
    setQuantity(1);
    setRoomNumber('');
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Item Usage</DialogTitle>
          <DialogDescription>
            Record usage of {item?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {item && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Available Stock:</span>
                <span className="text-lg font-bold">{item.current_stock} {item.unit}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantity Used *</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Room Number (Optional)</Label>
            <Input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 101"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about the usage..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Log Usage</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
