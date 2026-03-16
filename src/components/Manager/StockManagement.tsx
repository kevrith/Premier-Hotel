import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Plus, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, ArrowDownToLine, Settings, Loader2, Search
} from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  unit: string;
  cost_price: number;
  track_inventory: boolean;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface StockReceipt {
  id: string;
  receipt_number: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier: string;
  received_at: string;
  notes: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

export function StockManagement() {
  const [activeTab, setActiveTab] = useState('levels');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState<StockItem | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState<MenuItem | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Summary stats
  const [summary, setSummary] = useState({
    total_tracked_items: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_inventory_value: 0,
    week_purchases: 0,
  });

  // Receive form
  const [receiveForm, setReceiveForm] = useState({
    menu_item_id: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    invoice_number: '',
    notes: '',
  });
  const [receiveProcessing, setReceiveProcessing] = useState(false);

  // Adjust form
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustProcessing, setAdjustProcessing] = useState(false);

  useEffect(() => {
    fetchStockLevels();
    fetchSummary();
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'receipts') fetchReceipts();
  }, [activeTab, dateRange]);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/stock/summary');
      setSummary((res.data as any)?.data ?? res.data);
    } catch (e) {}
  };

  const fetchStockLevels = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/stock/levels');
      setStockItems(((res.data as any)?.data ?? res.data) || []);
    } catch (e) {
      toast.error('Failed to load stock levels');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      const res = await api.get(
        `/stock/receipts?start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      setReceipts(((res.data as any)?.data ?? res.data) || []);
    } catch (e) {}
  };

  const fetchMenuItems = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('menu_items')
        .select('id, name, category')
        .eq('is_available', true)
        .order('name');
      setMenuItems(data || []);
    } catch (e) {}
  };

  const handleReceiveStock = async () => {
    if (!receiveForm.menu_item_id || !receiveForm.quantity || !receiveForm.unit_cost) {
      toast.error('Please fill in item, quantity, and unit cost');
      return;
    }
    setReceiveProcessing(true);
    try {
      const res = await api.post('/stock/receive', {
        menu_item_id: receiveForm.menu_item_id,
        quantity: parseFloat(receiveForm.quantity),
        unit_cost: parseFloat(receiveForm.unit_cost),
        supplier: receiveForm.supplier || null,
        invoice_number: receiveForm.invoice_number || null,
        notes: receiveForm.notes || null,
      });
      const receipt = (res.data as any)?.data ?? res.data;
      toast.success(
        `Received ${receipt.quantity_added} units of ${receipt.item_name}. New stock: ${receipt.new_stock_level}`
      );
      setShowReceiveDialog(false);
      setReceiveForm({
        menu_item_id: '',
        quantity: '',
        unit_cost: '',
        supplier: '',
        invoice_number: '',
        notes: '',
      });
      fetchStockLevels();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to record stock receipt');
    } finally {
      setReceiveProcessing(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!showAdjustDialog || !adjustQty || !adjustReason) return;
    setAdjustProcessing(true);
    try {
      await api.post('/stock/adjust', {
        menu_item_id: showAdjustDialog.id,
        new_quantity: parseFloat(adjustQty),
        reason: adjustReason,
      });
      toast.success('Stock adjusted successfully');
      setShowAdjustDialog(null);
      setAdjustQty('');
      setAdjustReason('');
      fetchStockLevels();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to adjust stock');
    } finally {
      setAdjustProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'out_of_stock')
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    if (status === 'low_stock')
      return <Badge className="bg-orange-100 text-orange-800">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  const filteredItems = stockItems.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (v: number) => `KES ${v.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Tracked Items', value: summary.total_tracked_items, icon: Package, color: 'blue' },
          { label: 'Low Stock', value: summary.low_stock_count, icon: TrendingDown, color: 'orange' },
          { label: 'Out of Stock', value: summary.out_of_stock_count, icon: AlertTriangle, color: 'red' },
          {
            label: 'Inventory Value',
            value: formatCurrency(summary.total_inventory_value),
            icon: TrendingUp,
            color: 'green',
          },
          {
            label: 'Week Purchases',
            value: formatCurrency(summary.week_purchases),
            icon: ArrowDownToLine,
            color: 'purple',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 text-${color}-600`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stock Management
              </CardTitle>
              <CardDescription>
                Track and manage F&B inventory — water, soda, alcohol, and more
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchStockLevels} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button onClick={() => setShowReceiveDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Receive Stock
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="levels">Stock Levels</TabsTrigger>
              <TabsTrigger value="receipts">Receipt History</TabsTrigger>
              <TabsTrigger value="enable">Enable Tracking</TabsTrigger>
            </TabsList>

            {/* Stock Levels */}
            <TabsContent value="levels" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {summary.low_stock_count > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {summary.low_stock_count} item(s) are running low on stock. Consider reordering.
                  </AlertDescription>
                </Alert>
              )}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No tracked items yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Go to "Enable Tracking" tab to start tracking menu items
                  </p>
                  <Button onClick={() => setActiveTab('enable')}>Enable Item Tracking</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>In Stock</TableHead>
                      <TableHead>Reorder At</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className={
                          item.stock_status === 'out_of_stock'
                            ? 'bg-red-50'
                            : item.stock_status === 'low_stock'
                            ? 'bg-orange-50'
                            : ''
                        }
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell className="font-mono">
                          {item.stock_quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.reorder_level} {item.unit}
                        </TableCell>
                        <TableCell>{formatCurrency(item.cost_price)}</TableCell>
                        <TableCell>
                          {formatCurrency(item.stock_quantity * item.cost_price)}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.stock_status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowReceiveDialog(true);
                                setReceiveForm((f) => ({ ...f, menu_item_id: item.id }));
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600"
                              onClick={() => {
                                setShowAdjustDialog(item);
                                setAdjustQty(item.stock_quantity.toString());
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Receipt History */}
            <TabsContent value="receipts" className="space-y-4 mt-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchReceipts} variant="outline">
                    Search
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Total receipts: <strong>{receipts.length}</strong> | Total cost:{' '}
                <strong>{formatCurrency(receipts.reduce((s, r) => s + r.total_cost, 0))}</strong>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.receipt_number}</TableCell>
                      <TableCell className="font-medium">{r.item_name}</TableCell>
                      <TableCell>
                        {r.quantity} {r.unit}
                      </TableCell>
                      <TableCell>{formatCurrency(r.unit_cost)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(r.total_cost)}</TableCell>
                      <TableCell>{r.supplier || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(r.received_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No receipts found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Enable Tracking tab */}
            <TabsContent value="enable" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Enable inventory tracking for specific menu items (e.g., water, soda, alcohol,
                ingredients).
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => {
                    const tracked = stockItems.find((s) => s.id === item.id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="capitalize">{item.category}</TableCell>
                        <TableCell>
                          {tracked ? (
                            <Badge className="bg-green-100 text-green-800">Tracked</Badge>
                          ) : (
                            <Badge variant="outline">Not tracked</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={tracked ? 'outline' : 'default'}
                            onClick={() => setShowSettingsDialog(item)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            {tracked ? 'Update Settings' : 'Enable Tracking'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Receive Stock Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-green-600" />
              Receive Stock
            </DialogTitle>
            <DialogDescription>Record new stock received from a supplier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select
                value={receiveForm.menu_item_id}
                onValueChange={(v) => setReceiveForm((f) => ({ ...f, menu_item_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost (KES) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={receiveForm.unit_cost}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, unit_cost: e.target.value }))}
                />
              </div>
            </div>
            {receiveForm.quantity && receiveForm.unit_cost && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                Total Cost:{' '}
                <strong>
                  {formatCurrency(
                    parseFloat(receiveForm.quantity) * parseFloat(receiveForm.unit_cost)
                  )}
                </strong>
              </div>
            )}
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                placeholder="Supplier name"
                value={receiveForm.supplier}
                onChange={(e) => setReceiveForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                placeholder="INV-001"
                value={receiveForm.invoice_number}
                onChange={(e) => setReceiveForm((f) => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReceiveStock}
              disabled={receiveProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {receiveProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Receive Stock'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      {showAdjustDialog && (
        <Dialog open={!!showAdjustDialog} onOpenChange={() => setShowAdjustDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock — {showAdjustDialog.name}</DialogTitle>
              <DialogDescription>
                Current stock: {showAdjustDialog.stock_quantity} {showAdjustDialog.unit}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Quantity *</Label>
                <Input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select onValueChange={setAdjustReason} value={adjustReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Physical stocktake">Physical stocktake</SelectItem>
                    <SelectItem value="Damaged/spoiled goods">Damaged/spoiled goods</SelectItem>
                    <SelectItem value="Correction of counting error">
                      Correction of counting error
                    </SelectItem>
                    <SelectItem value="Transfer between locations">
                      Transfer between locations
                    </SelectItem>
                    <SelectItem value="Manager override">Manager override</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdjustDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdjustStock}
                disabled={adjustProcessing || !adjustQty || !adjustReason}
              >
                {adjustProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Adjustment'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Enable Tracking Dialog */}
      {showSettingsDialog && (
        <EnableTrackingDialog
          item={showSettingsDialog}
          onClose={() => setShowSettingsDialog(null)}
          onSuccess={() => {
            fetchStockLevels();
            fetchSummary();
            setShowSettingsDialog(null);
          }}
        />
      )}
    </div>
  );
}

function EnableTrackingDialog({
  item,
  onClose,
  onSuccess,
}: {
  item: MenuItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    track_inventory: true,
    reorder_level: '10',
    unit: 'piece',
    cost_price: '0',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/stock/settings/${item.id}`, {
        track_inventory: form.track_inventory,
        reorder_level: parseFloat(form.reorder_level) || 0,
        unit: form.unit,
        cost_price: parseFloat(form.cost_price) || 0,
      });
      toast.success(
        `Inventory tracking ${form.track_inventory ? 'enabled' : 'disabled'} for ${item.name}`
      );
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inventory Settings — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="bottle">Bottle</SelectItem>
                  <SelectItem value="crate">Crate</SelectItem>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="litre">Litre</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="carton">Carton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cost Price per {form.unit} (KES)</Label>
            <Input
              type="number"
              value={form.cost_price}
              onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
