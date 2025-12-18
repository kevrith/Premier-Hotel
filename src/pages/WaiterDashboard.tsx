import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Utensils,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Bell,
  MapPin,
  CreditCard,
  Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const mockTables = [
  {
    id: 'T-01',
    number: '12',
    location: 'Main Dining',
    status: 'occupied',
    guests: 4,
    orderStatus: 'in-progress',
    orderTime: new Date(Date.now() - 15 * 60 * 1000),
    totalBill: 4500,
    items: ['Grilled Salmon x2', 'Caesar Salad x2', 'Wine x1']
  },
  {
    id: 'T-02',
    number: '7',
    location: 'Poolside',
    status: 'occupied',
    guests: 2,
    orderStatus: 'ready',
    orderTime: new Date(Date.now() - 25 * 60 * 1000),
    totalBill: 2800,
    items: ['Burger x2', 'Fries x2', 'Soda x2']
  },
  {
    id: 'T-03',
    number: '3',
    location: 'Main Dining',
    status: 'needs-attention',
    guests: 3,
    orderStatus: 'completed',
    orderTime: new Date(Date.now() - 45 * 60 * 1000),
    totalBill: 6200,
    items: ['Steak x1', 'Pizza x2', 'Dessert x3'],
    needsPayment: true
  }
];

const mockRoomService = [
  {
    id: 'RS-001',
    room: '305',
    guest: 'John Doe',
    items: ['Breakfast Combo x2', 'Coffee x2'],
    status: 'pending',
    orderTime: new Date(Date.now() - 5 * 60 * 1000),
    deliveryTime: new Date(Date.now() + 10 * 60 * 1000),
    totalBill: 1500
  },
  {
    id: 'RS-002',
    room: '201',
    guest: 'Jane Smith',
    items: ['Club Sandwich x1', 'Fresh Juice x1'],
    status: 'ready',
    orderTime: new Date(Date.now() - 20 * 60 * 1000),
    deliveryTime: new Date(),
    totalBill: 950
  }
];

export default function WaiterDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [tables, setTables] = useState(mockTables);
  const [roomService, setRoomService] = useState(mockRoomService);
  const [activeTab, setActiveTab] = useState('tables');

  useEffect(() => {
    if (!isAuthenticated || (role !== 'waiter' && role !== 'admin')) {
      toast.error('Access denied. Waiter privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'waiter' && role !== 'admin')) {
    return null;
  }

  const handleServeOrder = (tableId) => {
    setTables(tables.map(table =>
      table.id === tableId ? { ...table, orderStatus: 'served' } : table
    ));
    toast.success('Order marked as served!');
  };

  const handleProcessPayment = (tableId) => {
    toast.success('Payment processed successfully!');
    setTables(tables.filter(table => table.id !== tableId));
  };

  const handleDeliverRoomService = (orderId) => {
    setRoomService(roomService.map(order =>
      order.id === orderId ? { ...order, status: 'delivered' } : order
    ));
    toast.success('Order delivered!');
  };

  const getTimeSince = (date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return `${minutes} min ago`;
  };

  const needsAttention = tables.filter(t => t.status === 'needs-attention' || t.orderStatus === 'ready');
  const activeOrders = tables.filter(t => t.orderStatus === 'in-progress');

  const TableCard = ({ table }) => (
    <Card className={`${table.status === 'needs-attention' ? 'border-orange-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Table {table.number}
              {table.status === 'needs-attention' && (
                <Bell className="h-4 w-4 text-orange-500 animate-bounce" />
              )}
            </CardTitle>
            <CardDescription>{table.location} • {table.guests} guests</CardDescription>
          </div>
          <Badge variant={
            table.orderStatus === 'ready' ? 'default' :
            table.orderStatus === 'in-progress' ? 'secondary' :
            'outline'
          }>
            {table.orderStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Details */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Ordered {getTimeSince(table.orderTime)}
          </p>
          <div className="text-sm space-y-1">
            {table.items.map((item, idx) => (
              <p key={idx}>• {item}</p>
            ))}
          </div>
        </div>

        <Separator />

        {/* Bill */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Bill</span>
          <span className="text-lg font-bold text-primary">KES {table.totalBill.toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {table.orderStatus === 'ready' && (
            <Button
              className="flex-1"
              onClick={() => handleServeOrder(table.id)}
            >
              <Utensils className="h-4 w-4 mr-2" />
              Serve Order
            </Button>
          )}
          {table.needsPayment && (
            <Button
              className="flex-1"
              variant="default"
              onClick={() => handleProcessPayment(table.id)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          )}
          {table.orderStatus === 'in-progress' && (
            <Button
              className="flex-1"
              variant="outline"
              disabled
            >
              <Clock className="h-4 w-4 mr-2" />
              In Kitchen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const RoomServiceCard = ({ order }) => (
    <Card className={`${order.status === 'ready' ? 'border-green-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Room {order.room}
              {order.status === 'ready' && (
                <Bell className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
            <CardDescription>{order.guest}</CardDescription>
          </div>
          <Badge>{order.id}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ordered {getTimeSince(order.orderTime)}
          </p>
          <div className="text-sm space-y-1">
            {order.items.map((item, idx) => (
              <p key={idx}>• {item}</p>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold text-primary">KES {order.totalBill.toLocaleString()}</span>
        </div>

        {/* Actions */}
        {order.status === 'ready' ? (
          <Button
            className="w-full"
            onClick={() => handleDeliverRoomService(order.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Deliver to Room
          </Button>
        ) : order.status === 'pending' ? (
          <Button
            className="w-full"
            variant="outline"
            disabled
          >
            <Clock className="h-4 w-4 mr-2" />
            Preparing in Kitchen
          </Button>
        ) : (
          <Button
            className="w-full"
            variant="secondary"
            disabled
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Delivered
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Waiter Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user?.firstName}!</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <Bell className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needsAttention.length}</div>
              <p className="text-xs text-muted-foreground">Orders ready / payment needed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
              <p className="text-xs text-muted-foreground">In kitchen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Served Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">34</div>
              <p className="text-xs text-muted-foreground">+8 from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tips Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES 3,200</div>
              <p className="text-xs text-muted-foreground">Today's tips</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tables">
              Tables ({tables.length})
            </TabsTrigger>
            <TabsTrigger value="room-service">
              Room Service ({roomService.filter(o => o.status !== 'delivered').length})
            </TabsTrigger>
          </TabsList>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            {needsAttention.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Needs Attention ({needsAttention.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {needsAttention.map(table => (
                    <TableCard key={table.id} table={table} />
                  ))}
                </div>
              </div>
            )}

            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  In Progress ({activeOrders.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeOrders.map(table => (
                    <TableCard key={table.id} table={table} />
                  ))}
                </div>
              </div>
            )}

            {tables.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Utensils className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Active Tables</h3>
                  <p className="text-muted-foreground">All tables are free</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Room Service Tab */}
          <TabsContent value="room-service" className="space-y-6">
            {roomService.filter(o => o.status !== 'delivered').length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Room Service Orders</h3>
                  <p className="text-muted-foreground">Orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {roomService.filter(o => o.status === 'ready').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Ready for Delivery
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roomService.filter(o => o.status === 'ready').map(order => (
                        <RoomServiceCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {roomService.filter(o => o.status === 'pending').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Kitchen
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roomService.filter(o => o.status === 'pending').map(order => (
                        <RoomServiceCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
