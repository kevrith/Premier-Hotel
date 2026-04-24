// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Users,
  BedDouble,
  Utensils,
  TrendingUp,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Star,
  UserCheck,
  UserCog,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StaffManagement } from '@/components/Manager/StaffManagement';

import OrderManagement from '@/components/Manager/OrderManagement';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { SystemHealth } from '@/components/Manager/SystemHealth';
import { EnhancedUserManagement } from '@/components/Manager/EnhancedUserManagement';
import { ContentManagement } from '@/components/Manager/ContentManagement';
import { PermissionManagement } from '@/components/Permissions/PermissionManagement';
import { EnhancedFinancialReports } from '@/components/Manager/Reports/EnhancedFinancialReports';
import { ComprehensiveSalesReports } from '@/components/Manager/Reports/ComprehensiveSalesReports';
import { ProfitLossStatement } from '@/components/Manager/Reports/ProfitLossStatement';
import { CashFlowReport } from '@/components/Manager/Reports/CashFlowReport';
import { BalanceSheet } from '@/components/Manager/Reports/BalanceSheet';
import { VATReport } from '@/components/Manager/Reports/VATReport';
import { ComparativeAnalysis } from '@/components/Manager/Reports/ComparativeAnalysis';
import { InventoryClosingStock } from '@/components/Manager/Reports/InventoryClosingStock';
import { OccupancyReport } from '@/components/Manager/Reports/OccupancyReport';
import { MenuProfitabilityReport } from '@/components/Manager/Reports/MenuProfitabilityReport';
import { CustomerLifetimeValueReport } from '@/components/Manager/Reports/CustomerLifetimeValueReport';
import { ItemSummaryReport } from '@/components/Manager/Reports/ItemSummaryReport';
import { VoidedItemsReport } from '@/components/Manager/Reports/VoidedItemsReport';
import { RecentActivityFeed } from '@/components/Dashboard/RecentActivityFeed';
import { NotificationCenter } from '@/components/Dashboard/NotificationCenter';
import { DashboardCustomization, useWidgetVisibility } from '@/components/Dashboard/DashboardCustomization';
import { HousekeepingManagement } from '@/components/Manager/HousekeepingManagement';
import { StockManagement } from '@/components/Manager/StockManagement';
import { InventoryManagement } from '@/components/Manager/InventoryManagement';
import { DailyStockTaking } from '@/components/Stock/DailyStockTaking';
import { ImportCenter } from '@/components/Admin/ImportCenter';
import { DataExportCenter } from '@/components/Admin/DataExportCenter';
import { LocationManagement } from '@/components/Admin/LocationManagement';
import { StockReceiving } from '@/components/Admin/StockReceiving';
import { StockTransfer } from '@/components/Admin/StockTransfer';
import { OfflineGate } from '@/components/shared/OfflineGate';
import { PettyCash } from '@/components/Admin/PettyCash';
import { KitchenStockTake } from '@/components/Kitchen/KitchenStockTake';
import { KitchenInventory } from '@/components/Kitchen/KitchenInventory';
import { OfficeStockTake } from '@/components/Office/OfficeStockTake';

// Lazy-loading wrapper: only mounts children once the tab has been activated
function LazyTab({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (active) setMounted(true); }, [active]);
  if (!mounted) return null;
  return <>{children}</>;
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const { summary, isLoading } = useDashboardSummary();
  const { isVisible } = useWidgetVisibility();

  const refreshAllStats = () => queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

  useEffect(() => {
    if (!isAuthenticated || (role !== 'manager' && role !== 'admin')) {
      toast.error('Access denied. Manager privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'manager' && role !== 'admin')) {
    return null;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'text-primary' }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-16 pb-24 sm:pb-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Manager Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Welcome back, {user?.full_name || 'Manager'}!
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={refreshAllStats} className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <DashboardCustomization />
            <NotificationCenter />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-8">
          {isVisible('revenue') && (
          <StatCard
            title="F&B Revenue (Today)"
            value={isLoading ? '...' : `KES ${summary.revenue.today.toLocaleString()}`}
            subtitle={`Month F&B: KES ${isLoading ? '...' : summary.revenue.month.toLocaleString()} | Rooms: KES ${isLoading ? '...' : summary.revenue.room.toLocaleString()}`}
            icon={DollarSign}
            color="text-green-500"
          />
          )}
          {isVisible('occupancy') && (
          <StatCard
            title="Occupancy Rate"
            value={isLoading ? '...' : `${summary.occupancy_rate}%`}
            subtitle="Rooms occupied today"
            icon={BedDouble}
            color="text-blue-500"
          />
          )}
          {isVisible('staff') && (
          <StatCard
            title="Active Staff"
            value={isLoading ? '...' : summary.staff.active}
            subtitle={`Total: ${isLoading ? '...' : summary.staff.total} staff members`}
            icon={UserCheck}
            color="text-purple-500"
          />
          )}
          {isVisible('tasks') && (
          <StatCard
            title="Pending Tasks"
            value={isLoading ? '...' : summary.pending_tasks.total}
            subtitle="Requires attention"
            icon={Clock}
            color="text-orange-500"
          />
          )}
        </div>

        {/* Recent Activity Feed */}
        {isVisible('activity') && (
          <div className="mb-4 sm:mb-8">
            <RecentActivityFeed />
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap w-full gap-1 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3">Overview</TabsTrigger>
            <TabsTrigger value="manage-staff" className="text-xs sm:text-sm px-1 sm:px-3">Staff</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs sm:text-sm px-1 sm:px-3">Perms</TabsTrigger>
            <TabsTrigger value="operations" className="text-xs sm:text-sm px-1 sm:px-3">Ops</TabsTrigger>
            <TabsTrigger value="financial-reports" className="text-xs sm:text-sm px-1 sm:px-3">Reports</TabsTrigger>
            <TabsTrigger value="order-management" className="text-xs sm:text-sm px-1 sm:px-3">Orders</TabsTrigger>
            <TabsTrigger value="stock" className="text-xs sm:text-sm px-1 sm:px-3">Stock</TabsTrigger>
            <TabsTrigger value="purchases" className="text-xs sm:text-sm px-1 sm:px-3">Purchases</TabsTrigger>
            <TabsTrigger value="stock-take" className="text-xs sm:text-sm px-1 sm:px-3">Stock Take</TabsTrigger>
            <TabsTrigger value="kitchen-stock" className="text-xs sm:text-sm px-1 sm:px-3">Kitchen Stock</TabsTrigger>
            <TabsTrigger value="kitchen-inventory" className="text-xs sm:text-sm px-1 sm:px-3">Kitchen Inv.</TabsTrigger>
            <TabsTrigger value="office-stock" className="text-xs sm:text-sm px-1 sm:px-3">Office Stock</TabsTrigger>
            <TabsTrigger value="locations" className="text-xs sm:text-sm px-1 sm:px-3">Locations</TabsTrigger>
            <TabsTrigger value="system-health" className="text-xs sm:text-sm px-1 sm:px-3">Health</TabsTrigger>
            <TabsTrigger value="content-management" className="text-xs sm:text-sm px-1 sm:px-3">Content</TabsTrigger>
            <TabsTrigger value="housekeeping" className="text-xs sm:text-sm px-1 sm:px-3">Housekeeping</TabsTrigger>
            <TabsTrigger value="import" className="text-xs sm:text-sm px-1 sm:px-3">Import</TabsTrigger>
            <TabsTrigger value="export-data" className="text-xs sm:text-sm px-1 sm:px-3">Export</TabsTrigger>
            <TabsTrigger value="petty-cash" className="text-xs sm:text-sm px-1 sm:px-3">Petty Cash</TabsTrigger>
          </TabsList>

          {/* Overview Tab — loads immediately, no LazyTab wrapper */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
              {/* Pending Tasks */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Pending Tasks</CardTitle>
                  <CardDescription>Tasks requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading tasks...</p>
                    </div>
                  ) : summary.pending_tasks.total === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-muted-foreground">No pending tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {summary.pending_tasks.housekeeping > 0 && (
                        <div className="flex items-center justify-between border-b pb-2">
                          <p className="font-semibold">Housekeeping Tasks</p>
                          <Badge variant="default">{summary.pending_tasks.housekeeping} pending</Badge>
                        </div>
                      )}
                      {summary.pending_tasks.service_requests > 0 && (
                        <div className="flex items-center justify-between border-b pb-2 last:border-0">
                          <p className="font-semibold">Service Requests</p>
                          <Badge variant="default">{summary.pending_tasks.service_requests} pending</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Summary</CardTitle>
                  <CardDescription>Daily operations overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Check-ins</span>
                    </div>
                    <span className="font-semibold">{isLoading ? '...' : `${summary.daily.check_ins} guests`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Check-outs</span>
                    </div>
                    <span className="font-semibold">{isLoading ? '...' : `${summary.daily.check_outs} guests`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Meal Orders</span>
                    </div>
                    <span className="font-semibold">{isLoading ? '...' : `${summary.daily.meal_orders} orders`}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Avg Rating</span>
                    </div>
                    <span className="font-semibold">{isLoading ? '...' : `${summary.customer_satisfaction || 0}★`}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Staff Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff Status</CardTitle>
                  <CardDescription>Current staff availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chefs</span>
                    <Badge className="bg-green-500">
                      {isLoading ? '...' : `${summary.staff.chefs} active`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Waiters</span>
                    <Badge className="bg-green-500">
                      {isLoading ? '...' : `${summary.staff.waiters} active`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cleaners</span>
                    <Badge className="bg-green-500">
                      {isLoading ? '...' : `${summary.staff.cleaners} active`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recent Hires</span>
                    <Badge variant="outline">
                      {isLoading ? '...' : `${summary.staff.recent_hires} this month`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="manage-staff" className="space-y-6">
            <LazyTab active={activeTab === 'manage-staff'}>
              <StaffManagement />
            </LazyTab>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <LazyTab active={activeTab === 'permissions'}>
              <PermissionManagement />
            </LazyTab>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <LazyTab active={activeTab === 'operations'}>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Room Status</CardTitle>
                    <CardDescription>Current room availability</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Occupied</span>
                      <Badge className="bg-red-500">{isLoading ? '...' : `${summary.rooms.occupied} rooms`}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Available</span>
                      <Badge className="bg-green-500">{isLoading ? '...' : `${summary.rooms.available} rooms`}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cleaning</span>
                      <Badge className="bg-yellow-500">{isLoading ? '...' : `${summary.rooms.cleaning} rooms`}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Maintenance</span>
                      <Badge className="bg-orange-500">{isLoading ? '...' : `${summary.rooms.maintenance} rooms`}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Kitchen Operations</CardTitle>
                    <CardDescription>Current order status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Pending Orders</span>
                      <Badge>{isLoading ? '...' : `${summary.orders.pending} orders`}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>In Progress</span>
                      <Badge className="bg-blue-500">{isLoading ? '...' : `${summary.orders.in_progress} orders`}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed Today</span>
                      <Badge className="bg-green-500">{isLoading ? '...' : `${summary.orders.completed_today} orders`}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Today's Revenue</span>
                      <Badge variant="outline">{isLoading ? '...' : `KES ${summary.orders.today_revenue.toLocaleString()}`}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </LazyTab>
          </TabsContent>

          {/* Financial Reports Tab */}
          <TabsContent value="financial-reports" className="space-y-4 sm:space-y-6">
            <LazyTab active={activeTab === 'financial-reports'}>
            <OfflineGate message="Financial reports require an internet connection. Please reconnect to view them.">
              <Tabs defaultValue="overview" className="space-y-4">
                <div className="overflow-x-auto pb-1">
                  <TabsList className="inline-flex h-auto gap-1 p-1 min-w-max">
                    <TabsTrigger value="overview"     className="px-4 py-2 text-sm font-medium">Overview</TabsTrigger>
                    <TabsTrigger value="sales"        className="px-4 py-2 text-sm font-medium">Sales</TabsTrigger>
                    <TabsTrigger value="item-summary" className="px-4 py-2 text-sm font-medium">Items</TabsTrigger>
                    <TabsTrigger value="voids"        className="px-4 py-2 text-sm font-medium">Voids</TabsTrigger>
                    <TabsTrigger value="pl"           className="px-4 py-2 text-sm font-medium">P&amp;L</TabsTrigger>
                    <TabsTrigger value="balance"      className="px-4 py-2 text-sm font-medium">Balance</TabsTrigger>
                    <TabsTrigger value="cashflow"     className="px-4 py-2 text-sm font-medium">Cash</TabsTrigger>
                    <TabsTrigger value="inventory"    className="px-4 py-2 text-sm font-medium">Inventory</TabsTrigger>
                    <TabsTrigger value="vat"          className="px-4 py-2 text-sm font-medium">VAT</TabsTrigger>
                    <TabsTrigger value="compare"      className="px-4 py-2 text-sm font-medium">Compare</TabsTrigger>
                    <TabsTrigger value="occupancy"    className="px-4 py-2 text-sm font-medium">Occupancy</TabsTrigger>
                    <TabsTrigger value="menu-profit"  className="px-4 py-2 text-sm font-medium">Menu</TabsTrigger>
                    <TabsTrigger value="clv"          className="px-4 py-2 text-sm font-medium">CLV</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">F&B Today</p>
                      <p className="text-2xl font-bold">KES {isLoading ? '...' : summary.revenue.today.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Restaurant & Bar</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">F&B This Week</p>
                      <p className="text-2xl font-bold">KES {isLoading ? '...' : summary.revenue.week.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Restaurant & Bar</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">F&B This Month</p>
                      <p className="text-2xl font-bold">KES {isLoading ? '...' : summary.revenue.month.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Restaurant & Bar</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Room Revenue (Month)</p>
                      <p className="text-2xl font-bold">KES {isLoading ? '...' : summary.revenue.room.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Bookings & Accommodation</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sales">
                  <ComprehensiveSalesReports />
                </TabsContent>

                <TabsContent value="item-summary">
                  <ItemSummaryReport />
                </TabsContent>

                <TabsContent value="voids">
                  <VoidedItemsReport />
                </TabsContent>

                <TabsContent value="pl">
                  <ProfitLossStatement />
                </TabsContent>

                <TabsContent value="balance">
                  <BalanceSheet />
                </TabsContent>

                <TabsContent value="cashflow">
                  <CashFlowReport />
                </TabsContent>

                <TabsContent value="inventory">
                  <InventoryClosingStock />
                </TabsContent>

                <TabsContent value="vat">
                  <VATReport />
                </TabsContent>

                <TabsContent value="compare">
                  <ComparativeAnalysis />
                  <div className="mt-6">
                    <EnhancedFinancialReports />
                  </div>
                </TabsContent>

                <TabsContent value="occupancy">
                  <OccupancyReport />
                </TabsContent>

                <TabsContent value="menu-profit">
                  <MenuProfitabilityReport />
                </TabsContent>

                <TabsContent value="clv">
                  <CustomerLifetimeValueReport />
                </TabsContent>
              </Tabs>
            </OfflineGate>
            </LazyTab>
          </TabsContent>

          {/* Order Management Tab */}
          <TabsContent value="order-management" className="space-y-6">
            <LazyTab active={activeTab === 'order-management'}>
              <OrderManagement />
            </LazyTab>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system-health" className="space-y-6">
            <LazyTab active={activeTab === 'system-health'}>
              <SystemHealth />
            </LazyTab>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content-management" className="space-y-6">
            <LazyTab active={activeTab === 'content-management'}>
              <ContentManagement />
            </LazyTab>
          </TabsContent>

          {/* Housekeeping Management Tab */}
          <TabsContent value="housekeeping" className="space-y-6">
            <LazyTab active={activeTab === 'housekeeping'}>
              <HousekeepingManagement />
            </LazyTab>
          </TabsContent>

          {/* Stock Management Tab */}
          <TabsContent value="stock" className="space-y-6">
            <LazyTab active={activeTab === 'stock'}>
              <StockManagement />
            </LazyTab>
          </TabsContent>

          {/* Purchase Orders / Receiving Tab */}
          <TabsContent value="purchases" className="space-y-6">
            <LazyTab active={activeTab === 'purchases'}>
            <OfflineGate message="Stock receiving and purchasing requires an internet connection.">
              <Tabs defaultValue="purchase-orders">
                <div className="overflow-x-auto pb-1">
                  <TabsList className="flex gap-1 w-max min-w-full h-auto">
                    <TabsTrigger value="purchase-orders" className="text-xs sm:text-sm flex-1">Purchase Orders</TabsTrigger>
                    <TabsTrigger value="receiving" className="text-xs sm:text-sm flex-1">Receive Stock</TabsTrigger>
                    <TabsTrigger value="transfer" className="text-xs sm:text-sm flex-1">Transfer Stock</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="purchase-orders" className="mt-4">
                  <InventoryManagement />
                </TabsContent>
                <TabsContent value="receiving" className="mt-4">
                  <StockReceiving />
                </TabsContent>
                <TabsContent value="transfer" className="mt-4">
                  <StockTransfer />
                </TabsContent>
              </Tabs>
            </OfflineGate>
            </LazyTab>
          </TabsContent>

          {/* Daily Stock Taking Tab */}
          <TabsContent value="stock-take" className="space-y-6">
            <LazyTab active={activeTab === 'stock-take'}>
              <DailyStockTaking />
            </LazyTab>
          </TabsContent>

          {/* Kitchen Stock Take Tab */}
          <TabsContent value="kitchen-stock" className="space-y-6">
            <LazyTab active={activeTab === 'kitchen-stock'}>
              <KitchenStockTake readOnly={false} />
            </LazyTab>
          </TabsContent>

          {/* Kitchen Inventory Tab */}
          <TabsContent value="kitchen-inventory" className="space-y-6">
            <LazyTab active={activeTab === 'kitchen-inventory'}>
              <KitchenInventory readOnly={false} />
            </LazyTab>
          </TabsContent>

          {/* Office Stock Take Tab */}
          <TabsContent value="office-stock" className="space-y-6">
            <LazyTab active={activeTab === 'office-stock'}>
              <OfficeStockTake readOnly={false} />
            </LazyTab>
          </TabsContent>

          {/* Locations Tab - Multi-location stock management */}
          <TabsContent value="locations" className="space-y-6">
            <LazyTab active={activeTab === 'locations'}>
              <LocationManagement />
            </LazyTab>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <LazyTab active={activeTab === 'import'}>
              <ImportCenter />
            </LazyTab>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export-data" className="space-y-6">
            <LazyTab active={activeTab === 'export-data'}>
              <DataExportCenter />
            </LazyTab>
          </TabsContent>

          {/* Petty Cash Tab */}
          <TabsContent value="petty-cash" className="space-y-6">
            <LazyTab active={activeTab === 'petty-cash'}>
              <PettyCash />
            </LazyTab>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
