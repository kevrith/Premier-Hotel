// @ts-nocheck
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search, Download, XCircle, Clock,
  CheckCircle, AlertCircle, TrendingUp, Users, DollarSign,
  ChefHat, Truck, Package, Eye, RefreshCw, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import { printOrderSlip, printBill } from '@/lib/print';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  status: string;
  priority: string;
  total_amount: number;
  items_count: number;
  items: any[];
  created_at: string;
  updated_at: string;
}

interface QuickStats {
  today_orders: number;
  pending_orders: number;
  completed_orders: number;
  avg_completion_time: number;
  total_revenue: number;
  completion_rate: number;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-blue-500', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-green-500', icon: Package },
  delivering: { label: 'Delivering', color: 'bg-purple-500', icon: Truck },
  completed: { label: 'Completed', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle },
};

const _priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-500' },
  normal: { label: 'Normal', color: 'bg-blue-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500 animate-pulse' },
};

interface VoidItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  items: any[];
  onVoidSuccess: () => void;
}

function VoidItemDialog({ open, onOpenChange, orderId, orderNumber, items, onVoidSuccess }: VoidItemDialogProps) {
  const [mode, setMode] = useState<'item' | 'receipt'>('item');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [voidQty, setVoidQty] = useState<number>(0); // 0 = full item void
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;
  const maxQty = selectedItem ? parseInt(selectedItem.quantity) : 1;

  const reset = () => {
    setSelectedIndex(null);
    setVoidQty(0);
    setReason('');
    setMode('item');
  };

  const handleVoid = async () => {
    if (!reason.trim()) return;
    if (mode === 'item' && selectedIndex === null) return;
    setProcessing(true);
    try {
      if (mode === 'receipt') {
        await api.post(`/orders/${orderId}/void-receipt`, { void_reason: reason });
        toast.success(`Receipt #${orderNumber} voided`);
      } else {
        await api.post(`/orders/${orderId}/void-item`, {
          item_index: selectedIndex,
          void_reason: reason,
          quantity: voidQty, // 0 = full void, >0 = partial
        });
        const isPartial = voidQty > 0 && voidQty < maxQty;
        toast.success(isPartial
          ? `Voided ${voidQty}x ${selectedItem?.name}`
          : `${selectedItem?.name} fully voided`);
      }
      onVoidSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to void');
    } finally {
      setProcessing(false);
    }
  };

  const activeItems = items.filter(i => !i.voided);
  const voidedAmount = mode === 'receipt'
    ? activeItems.reduce((s, i) => s + (parseFloat(i.price || 0) * parseInt(i.quantity || 0)), 0)
    : selectedItem
      ? (voidQty > 0 ? parseFloat(selectedItem.price || 0) * voidQty : parseFloat(selectedItem.total || 0))
      : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Void — Order #{orderNumber}
          </DialogTitle>
          <DialogDescription>Select void type, item, and provide a reason.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              size="sm" variant={mode === 'item' ? 'default' : 'outline'}
              onClick={() => setMode('item')} className="flex-1"
            >Void Item(s)</Button>
            <Button
              size="sm" variant={mode === 'receipt' ? 'destructive' : 'outline'}
              onClick={() => setMode('receipt')} className="flex-1"
            >Void Entire Receipt</Button>
          </div>

          {mode === 'item' && (
            <>
              <div className="space-y-2">
                <Label>Select Item</Label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => { if (!item.voided) { setSelectedIndex(idx); setVoidQty(0); } }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        item.voided ? 'opacity-40 cursor-not-allowed bg-muted' :
                        selectedIndex === idx ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                        'border-border hover:border-orange-300'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {item.name}
                          {item.voided_quantity ? ` (${item.voided_quantity} already voided)` : ''}
                          {item.voided ? ' — VOIDED' : ''}
                        </span>
                        <span className="text-muted-foreground">x{item.quantity} · KES {parseFloat(item.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedItem && !selectedItem.voided && (
                <div className="space-y-2">
                  <Label>Qty to Void</Label>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="outline"
                      onClick={() => setVoidQty(q => Math.max(0, q - 1))}>
                      −
                    </Button>
                    <span className="w-16 text-center font-bold text-lg">
                      {voidQty === 0 ? 'ALL' : voidQty}
                    </span>
                    <Button size="sm" variant="outline"
                      onClick={() => setVoidQty(q => Math.min(maxQty, q + 1))}>
                      +
                    </Button>
                    <span className="text-sm text-muted-foreground">of {maxQty}</span>
                    {voidQty > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => setVoidQty(0)}
                        className="text-xs text-muted-foreground">Reset to ALL</Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {voidQty === 0
                      ? `Voiding all ${maxQty} — KES ${parseFloat(selectedItem.total || 0).toLocaleString()}`
                      : `Voiding ${voidQty} of ${maxQty} — KES ${(parseFloat(selectedItem.price || 0) * voidQty).toLocaleString()}`
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {mode === 'receipt' && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold text-red-700 dark:text-red-400">⚠ This will void the entire receipt</p>
              <p className="text-muted-foreground">All {activeItems.length} active items will be voided and the order total set to KES 0.</p>
              <p className="font-medium">Total to void: KES {voidedAmount.toLocaleString()}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Void Reason *</Label>
            <Select onValueChange={setReason} value={reason}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer changed mind">Customer changed mind</SelectItem>
                <SelectItem value="Wrong item ordered">Wrong item ordered</SelectItem>
                <SelectItem value="Out of stock">Out of stock</SelectItem>
                <SelectItem value="Quality issue">Quality issue</SelectItem>
                <SelectItem value="Duplicate order">Duplicate order</SelectItem>
                <SelectItem value="Manager override">Manager override</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(mode === 'receipt' || selectedIndex !== null) && reason && (
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 rounded-lg p-3 text-sm">
              <strong>Amount to void: KES {voidedAmount.toLocaleString()}</strong>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={(mode === 'item' && selectedIndex === null) || !reason || processing}
          >
            {processing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Voiding...</>
              : mode === 'receipt' ? 'Void Entire Receipt' : 'Confirm Void'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [voidDialogOrder, setVoidDialogOrder] = useState<Order | null>(null);

  const queryClient = useQueryClient();

  const { data: ordersRaw, isLoading, refetch } = useQuery({
    queryKey: ['manager-orders', statusFilter, typeFilter, dateFilter, customStart, customEnd, searchTerm],
    queryFn: async (): Promise<Order[]> => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (dateFilter === 'custom') {
        params.append('start_date', customStart);
        params.append('end_date', customEnd);
      } else if (dateFilter !== 'all') {
        params.append('date', dateFilter);
      }
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get<Order[]>(`/orders/manager/manager?${params}`);
      const raw = response.data as any;
      return ((raw?.data ?? raw) || []) as Order[];
    },
    refetchInterval: 10000,
  });
  const orders: Order[] = ordersRaw ?? [];

  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async (): Promise<QuickStats> => {
      const response = await api.get<QuickStats>('/orders/manager/stats');
      const raw = response.data as any;
      return (raw?.data ?? raw) as QuickStats;
    },
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      await api.post('/orders/bulk-cancel', { order_ids: orderIds });
    },
    onSuccess: () => {
      toast.success('Orders cancelled successfully');
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ['manager-orders'] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'pdf') => {
      const { data } = await api.post('/orders/export', { 
        format,
        filters: { status: statusFilter, type: typeFilter, date: dateFilter }
      }, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([data as unknown as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onSuccess: () => toast.success('Export completed'),
  });

  const handleReprintSlip = (order: Order) => {
    printOrderSlip({
      order_number: order.order_number,
      location: order.delivery_location || order.table_number || order.room_number || '—',
      location_type: order.location_type || order.order_type,
      items: (order.items || []).map((i: any) => ({
        name: i.name || i.item_name || 'Item',
        quantity: i.quantity || 1,
        special_instructions: i.special_instructions,
      })),
      special_instructions: order.customer_name ? `Customer: ${order.customer_name}` : '',
      created_at: order.created_at,
      waiter_name: order.assigned_waiter?.full_name,
    });
  };

  const handleReprintBill = (order: Order) => {
    const items = (order.items || []).map((i: any) => ({
      name: i.name || i.item_name || 'Item',
      quantity: i.quantity || 1,
      price: parseFloat(i.price || 0),
    }));
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    printBill({
      order_number: order.order_number,
      location: order.delivery_location || order.table_number || order.room_number || '—',
      location_type: order.location_type || order.order_type,
      items,
      subtotal,
      tax: Math.max(0, parseFloat(order.total_amount) - subtotal),
      total_amount: parseFloat(order.total_amount || 0),
      special_instructions: order.customer_name ? `Customer: ${order.customer_name}, Phone:${order.customer_phone || ''}` : '',
      status: order.status,
      waiter_name: order.assigned_waiter?.full_name,
    });
  };

  const { data: staffList } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const res = await api.get('/admin/users?role=waiter&role=chef&role=manager&limit=100');
      const raw = res.data as any;
      return ((raw?.data ?? raw) || []) as Array<{id: string; full_name: string; role: string}>;
    },
  });

  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.includes(searchTerm);
    const matchesEmployee = employeeFilter === 'all' ||
      order.assigned_waiter_id === employeeFilter ||
      order.created_by_staff_id === employeeFilter;
    return matchesSearch && matchesEmployee;
  });

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o: Order) => o.id));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {[
          { label: "Today's Orders", value: stats?.today_orders || 0, icon: TrendingUp, color: "text-blue-500" },
          { label: "Pending", value: stats?.pending_orders || 0, icon: Clock, color: "text-yellow-500" },
          { label: "Completed", value: stats?.completed_orders || 0, icon: CheckCircle, color: "text-green-500" },
          { label: "Avg Time", value: `${stats?.avg_completion_time || 0}m`, icon: Clock, color: "text-purple-500" },
          { label: "Revenue", value: `KSh ${stats?.total_revenue?.toLocaleString() || 0}`, icon: DollarSign, color: "text-green-500" },
          { label: "Success Rate", value: `${stats?.completion_rate || 0}%`, icon: Users, color: "text-blue-500" },
        ].map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg sm:text-xl">Order Queue</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dine-in">Dine In</SelectItem>
                  <SelectItem value="room-service">Room Service</SelectItem>
                  <SelectItem value="takeaway">Takeaway</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {(staffList || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dateFilter === 'custom' && (
                <>
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-36 text-xs h-9" />
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-36 text-xs h-9" />
                </>
              )}
            </div>

            {/* Bulk Actions */}
            {selectedOrders.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedOrders.length} selected</span>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="outline" onClick={() => exportMutation.mutate('csv')} className="flex-1 sm:flex-none">
                    <Download className="h-4 w-4 mr-2" />CSV
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowBulkActions(true)} className="flex-1 sm:flex-none">
                    <XCircle className="h-4 w-4 mr-2" />Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 sm:p-3 text-left">
                        <Checkbox checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0} onCheckedChange={selectAll} />
                      </th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Order #</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Customer</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Status</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Amount</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Time</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="p-4 sm:p-8 text-center text-sm">Loading...</td></tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr><td colSpan={7} className="p-4 sm:p-8 text-center text-sm">No orders found</td></tr>
                    ) : (
                      filteredOrders.map((order: Order) => {
                        const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || AlertCircle;
                        const statusColor = statusConfig[order.status as keyof typeof statusConfig]?.color || 'bg-gray-500';
                        
                        return (
                          <tr key={order.id} className="border-t hover:bg-muted/50">
                            <td className="p-2 sm:p-3">
                              <Checkbox checked={selectedOrders.includes(order.id)} onCheckedChange={() => toggleOrderSelection(order.id)} />
                            </td>
                            <td className="p-2 sm:p-3">
                              <span className="font-mono text-xs sm:text-sm font-medium">{order.order_number}</span>
                            </td>
                            <td className="p-2 sm:p-3">
                              <p className="font-medium text-xs sm:text-sm">{order.customer_name}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{order.customer_phone}</p>
                            </td>
                            <td className="p-2 sm:p-3">
                              <Badge className={`${statusColor} text-white text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[order.status as keyof typeof statusConfig]?.label}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">KSh {order.total_amount.toLocaleString()}</td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs text-muted-foreground">
                              {format(new Date(order.created_at), 'HH:mm')}
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button size="sm" variant="ghost" onClick={() => setViewOrder(order)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  title="Reprint kitchen slip"
                                  className="text-orange-500 border-orange-300 hover:bg-orange-50"
                                  onClick={() => handleReprintSlip(order)}
                                >
                                  <ChefHat className="h-3 w-3 mr-1" />Slip
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  title="Reprint customer bill"
                                  className="text-blue-500 border-blue-300 hover:bg-blue-50"
                                  onClick={() => handleReprintBill(order)}
                                >
                                  <Download className="h-3 w-3 mr-1" />Bill
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={() => setVoidDialogOrder(order)}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Void
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Order Details - {viewOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium text-sm sm:text-base">{viewOrder.customer_name}</p>
                  <p className="text-xs sm:text-sm">{viewOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Type</p>
                  <p className="font-medium text-sm sm:text-base capitalize">{viewOrder.order_type.replace('-', ' ')}</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-medium">Total</span>
                  <span className="text-lg sm:text-xl font-bold">KSh {viewOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Cancel Dialog */}
      <Dialog open={showBulkActions} onOpenChange={setShowBulkActions}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Orders</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Cancel {selectedOrders.length} order(s)?</p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowBulkActions(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="destructive" onClick={() => { cancelMutation.mutate(selectedOrders); setShowBulkActions(false); }} className="w-full sm:w-auto">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Item Dialog */}
      {voidDialogOrder && (
        <VoidItemDialog
          open={!!voidDialogOrder}
          onOpenChange={(open) => !open && setVoidDialogOrder(null)}
          orderId={voidDialogOrder.id}
          orderNumber={voidDialogOrder.order_number}
          items={voidDialogOrder.items || []}
          onVoidSuccess={refetch}
        />
      )}
    </div>
  );
}
