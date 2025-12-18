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
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Package,
  ListChecks,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const mockOrders = [
  {
    id: 'ORD-001',
    table: 'Room 305',
    items: [
      { name: 'Grilled Salmon', quantity: 2, customizations: ['Extra Lemon', 'No Butter'] },
      { name: 'Caesar Salad', quantity: 1, customizations: ['No Croutons'] }
    ],
    status: 'pending',
    priority: 'high',
    orderTime: new Date(Date.now() - 5 * 60 * 1000),
    estimatedTime: 20
  },
  {
    id: 'ORD-002',
    table: 'Table 12',
    items: [
      { name: 'Margherita Pizza', quantity: 1, customizations: ['Extra Cheese'] },
      { name: 'French Fries', quantity: 2, customizations: [] }
    ],
    status: 'in-progress',
    priority: 'medium',
    orderTime: new Date(Date.now() - 15 * 60 * 1000),
    estimatedTime: 10
  },
  {
    id: 'ORD-003',
    table: 'Room 201',
    items: [
      { name: 'Beef Steak', quantity: 1, customizations: ['Medium Rare', 'Extra Sauce'] }
    ],
    status: 'ready',
    priority: 'urgent',
    orderTime: new Date(Date.now() - 25 * 60 * 1000),
    estimatedTime: 0
  }
];

const mockInventory = [
  { id: '1', item: 'Salmon', quantity: 15, unit: 'kg', status: 'good', lowThreshold: 10 },
  { id: '2', item: 'Chicken', quantity: 8, unit: 'kg', status: 'low', lowThreshold: 10 },
  { id: '3', item: 'Tomatoes', quantity: 25, unit: 'kg', status: 'good', lowThreshold: 15 },
  { id: '4', item: 'Olive Oil', quantity: 3, unit: 'L', status: 'critical', lowThreshold: 5 }
];

export default function ChefDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [orders, setOrders] = useState(mockOrders);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (!isAuthenticated || (role !== 'chef' && role !== 'admin')) {
      toast.error('Access denied. Chef privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'chef' && role !== 'admin')) {
    return null;
  }

  const handleStartOrder = (orderId) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: 'in-progress' } : order
    ));
    toast.success('Order started!');
  };

  const handleCompleteOrder = (orderId) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: 'ready' } : order
    ));
    toast.success('Order ready for pickup!');
  };

  const getTimeSince = (date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return `${minutes} min ago`;
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const inProgressOrders = orders.filter(o => o.status === 'in-progress');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const OrderCard = ({ order }) => (
    <Card className={`${order.priority === 'urgent' ? 'border-red-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {order.table}
              <Badge variant={
                order.priority === 'urgent' ? 'destructive' :
                order.priority === 'high' ? 'default' :
                'secondary'
              }>
                {order.priority}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              Ordered {getTimeSince(order.orderTime)}
              {order.estimatedTime > 0 && ` • ${order.estimatedTime} min est.`}
            </CardDescription>
          </div>
          <Badge className="text-xs">{order.id}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.name}</span>
                <Badge variant="outline">x{item.quantity}</Badge>
              </div>
              {item.customizations.length > 0 && (
                <div className="text-sm text-muted-foreground pl-4">
                  {item.customizations.map((custom, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-xs">•</span>
                      <span>{custom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button
              className="flex-1"
              onClick={() => handleStartOrder(order.id)}
            >
              <Flame className="h-4 w-4 mr-2" />
              Start Cooking
            </Button>
          )}
          {order.status === 'in-progress' && (
            <Button
              className="flex-1"
              onClick={() => handleCompleteOrder(order.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Ready
            </Button>
          )}
          {order.status === 'ready' && (
            <Button
              className="flex-1"
              variant="outline"
              disabled
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Ready for Pickup
            </Button>
          )}
        </div>
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
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Chef Dashboard</h1>
              <p className="text-muted-foreground">Welcome, Chef {user?.firstName}!</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders.length}</div>
              <p className="text-xs text-muted-foreground">Waiting to start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Flame className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressOrders.length}</div>
              <p className="text-xs text-muted-foreground">Currently cooking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readyOrders.length}</div>
              <p className="text-xs text-muted-foreground">Ready for pickup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47</div>
              <p className="text-xs text-muted-foreground">+12 from yesterday</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              Active Orders ({pendingOrders.length + inProgressOrders.length})
            </TabsTrigger>
            <TabsTrigger value="ready">Ready ({readyOrders.length})</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            {pendingOrders.length === 0 && inProgressOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Active Orders</h3>
                  <p className="text-muted-foreground">New orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {pendingOrders.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Pending Orders ({pendingOrders.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {pendingOrders.map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {inProgressOrders.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-red-500" />
                      In Progress ({inProgressOrders.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      {inProgressOrders.map(order => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Ready Orders Tab */}
          <TabsContent value="ready" className="space-y-6">
            {readyOrders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Ready</h3>
                  <p className="text-muted-foreground">Completed orders will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {readyOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kitchen Inventory</CardTitle>
                <CardDescription>Monitor ingredient levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockInventory.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Package className={`h-8 w-8 ${
                          item.status === 'critical' ? 'text-red-500' :
                          item.status === 'low' ? 'text-orange-500' :
                          'text-green-500'
                        }`} />
                        <div>
                          <p className="font-semibold">{item.item}</p>
                          <p className="text-sm text-muted-foreground">
                            Low threshold: {item.lowThreshold} {item.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{item.quantity} {item.unit}</p>
                        <Badge variant={
                          item.status === 'critical' ? 'destructive' :
                          item.status === 'low' ? 'default' :
                          'secondary'
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <ListChecks className="h-4 w-4 mr-2" />
                    Request Restock
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Package className="h-4 w-4 mr-2" />
                    Update Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
