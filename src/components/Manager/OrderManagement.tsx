import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, Download, Printer, XCircle, Clock, 
  CheckCircle, AlertCircle, TrendingUp, Users, DollarSign,
  ChefHat, Truck, Package, Eye, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api/client';
import { toast } from 'react-hot-toast';

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

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-500' },
  normal: { label: 'Normal', color: 'bg-blue-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-500 animate-pulse' },
};

export default function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['manager-orders', statusFilter, typeFilter, dateFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (dateFilter !== 'all') params.append('date', dateFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const { data } = await api.get(`/orders/manager/manager?${params}`);
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery<QuickStats>({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const { data } = await api.get('/orders/manager/stats');
      return data;
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
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onSuccess: () => toast.success('Export completed'),
  });

  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.includes(searchTerm);
    return matchesSearch;
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
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
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
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Type</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Status</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Amount</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Time</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={8} className="p-4 sm:p-8 text-center text-sm">Loading...</td></tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr><td colSpan={8} className="p-4 sm:p-8 text-center text-sm">No orders found</td></tr>
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
                              <Badge variant="outline" className="text-xs">{order.order_type.replace('-', ' ')}</Badge>
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
                              <Button size="sm" variant="ghost" onClick={() => setViewOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
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
    </div>
  );
}
