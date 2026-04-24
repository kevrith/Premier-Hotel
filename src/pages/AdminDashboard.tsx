import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore.secure';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { RecentActivityFeed } from '@/components/Dashboard/RecentActivityFeed';
import { NotificationCenter } from '@/components/Dashboard/NotificationCenter';
import { DashboardCustomization } from '@/components/Dashboard/DashboardCustomization';

// Import comprehensive admin components
import { SystemOverview } from '@/components/Admin/SystemOverview';
import { UserManagement } from '@/components/Admin/UserManagement';
import { ContentManagement } from '@/components/Admin/ContentManagement';
import { SystemConfiguration } from '@/components/Admin/SystemConfiguration';
import { AdvancedReporting } from '@/components/Admin/AdvancedReporting';
import { SystemHealth } from '@/components/Manager/SystemHealth';
import { StockManagement } from '@/components/Manager/StockManagement';
import { DailyStockTaking } from '@/components/Stock/DailyStockTaking';
import { InventoryManagement } from '@/components/Admin/InventoryManagement';
import { HousekeepingManagement } from '@/components/Manager/HousekeepingManagement';
import { ImportCenter } from '@/components/Admin/ImportCenter';
import { DataExportCenter } from '@/components/Admin/DataExportCenter';
import { LocationManagement } from '@/components/Admin/LocationManagement';
import { PettyCash } from '@/components/Admin/PettyCash';
import { NetworkInfo } from '@/components/Admin/NetworkInfo';
import { BranchManagement } from '@/components/Admin/BranchManagement';
import { TableManagement } from '@/components/Admin/TableManagement';
import OrderManagement from '@/components/Manager/OrderManagement';
import { PermissionManagement } from '@/components/Permissions/PermissionManagement';
import { StockReceiving } from '@/components/Admin/StockReceiving';
import { StockTransfer } from '@/components/Admin/StockTransfer';
import { KitchenStockTake } from '@/components/Kitchen/KitchenStockTake';
import { KitchenInventoryManagement } from '@/components/Kitchen/KitchenInventoryManagement';
import { OfficeStockTake } from '@/components/Office/OfficeStockTake';

export default function AdminDashboard() {
  const { isLoading } = useAuth();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [activeTab, setActiveTab] = useState('overview');

  const refreshAllStats = () => {
    window.location.reload();
  };



  // Show loading state while auth is initializing OR store is rehydrating
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // At this point, ProtectedRoute has already verified authentication and admin role

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mobile-container py-4 sm:py-6 space-y-4 sm:space-y-6 mt-14 sm:mt-16 px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Manage your hotel operations and view system analytics
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

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex gap-1 w-max min-w-full">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Overview</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Users</TabsTrigger>
              <TabsTrigger value="branches" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Branches</TabsTrigger>
              <TabsTrigger value="content" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Content</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Inventory</TabsTrigger>
              <TabsTrigger value="locations" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Locations</TabsTrigger>
              <TabsTrigger value="import" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Import</TabsTrigger>
              <TabsTrigger value="export" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Export</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Reports</TabsTrigger>
              <TabsTrigger value="health" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Health</TabsTrigger>
              <TabsTrigger value="network" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Network</TabsTrigger>
              <TabsTrigger value="housekeeping" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Housekeeping</TabsTrigger>
              <TabsTrigger value="tables" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Tables</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Orders</TabsTrigger>
              <TabsTrigger value="petty-cash" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Petty Cash</TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Permissions</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab - System metrics, KPIs, charts */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <RecentActivityFeed />
            <SystemOverview onStatsUpdate={() => {}} />
          </TabsContent>

          {/* Users Tab - Complete user management */}
          <TabsContent value="users" className="space-y-4 sm:space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Branches Tab - View and edit branch details */}
          <TabsContent value="branches" className="space-y-4 sm:space-y-6">
            <BranchManagement />
          </TabsContent>

          {/* Content Tab - Menu, rooms, pricing, promotions */}
          <TabsContent value="content" className="space-y-4 sm:space-y-6">
            <ContentManagement />
          </TabsContent>

          {/* Inventory Tab - Stock management, purchases, and tracking */}
          <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
            <Tabs defaultValue="stock-management" className="w-full">
              <div className="overflow-x-auto pb-1">
                <TabsList className="flex gap-1 w-max min-w-full h-auto mb-4">
                  <TabsTrigger value="stock-management" className="text-xs sm:text-sm">Stock Management</TabsTrigger>
                  <TabsTrigger value="receiving" className="text-xs sm:text-sm">Receive Stock</TabsTrigger>
                  <TabsTrigger value="transfer" className="text-xs sm:text-sm">Transfer Stock</TabsTrigger>
                  <TabsTrigger value="purchases" className="text-xs sm:text-sm">Purchase Orders</TabsTrigger>
                  <TabsTrigger value="stock-take" className="text-xs sm:text-sm">Stock Taking</TabsTrigger>
                  <TabsTrigger value="kitchen-stock-take" className="text-xs sm:text-sm">Kitchen Stock Take</TabsTrigger>
                  <TabsTrigger value="kitchen-inventory" className="text-xs sm:text-sm">Kitchen Inventory</TabsTrigger>
                  <TabsTrigger value="office-stock" className="text-xs sm:text-sm">Office Stock</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="stock-management">
                <StockManagement />
              </TabsContent>
              <TabsContent value="receiving">
                <StockReceiving />
              </TabsContent>
              <TabsContent value="transfer">
                <StockTransfer />
              </TabsContent>
              <TabsContent value="purchases">
                <InventoryManagement />
              </TabsContent>
              <TabsContent value="stock-take">
                <DailyStockTaking />
              </TabsContent>
              <TabsContent value="kitchen-stock-take">
                <KitchenStockTake readOnly={false} />
              </TabsContent>
              <TabsContent value="kitchen-inventory">
                <KitchenInventoryManagement readOnly={false} />
              </TabsContent>
              <TabsContent value="office-stock">
                <OfficeStockTake readOnly={false} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Locations Tab - Multi-location stock management */}
          <TabsContent value="locations" className="space-y-4 sm:space-y-6">
            <LocationManagement />
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4 sm:space-y-6">
            <ImportCenter />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 sm:space-y-6">
            <DataExportCenter />
          </TabsContent>

          {/* Reports Tab - Advanced reporting and analytics */}
          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <AdvancedReporting />
          </TabsContent>

          {/* Health Tab - System health monitoring */}
          <TabsContent value="health" className="space-y-4 sm:space-y-6">
            <SystemHealth />
          </TabsContent>

          {/* Network Tab - Local network info for staff access */}
          <TabsContent value="network" className="space-y-4 sm:space-y-6">
            <NetworkInfo />
          </TabsContent>

          {/* Housekeeping Tab */}
          <TabsContent value="housekeeping" className="space-y-4 sm:space-y-6">
            <HousekeepingManagement />
          </TabsContent>

          {/* Tables Tab - Restaurant table management */}
          <TabsContent value="tables" className="space-y-4 sm:space-y-6">
            <TableManagement />
          </TabsContent>

          {/* Orders Tab - Full order management with reprint */}
          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            <OrderManagement />
          </TabsContent>

          {/* Petty Cash Tab */}
          <TabsContent value="petty-cash" className="space-y-4 sm:space-y-6">
            {activeTab === 'petty-cash' && <PettyCash />}
          </TabsContent>

          {/* Permissions Tab — only mount when active to avoid pre-auth 401 */}
          <TabsContent value="permissions" className="space-y-4 sm:space-y-6">
            {activeTab === 'permissions' && <PermissionManagement />}
          </TabsContent>

          {/* Settings Tab - System configuration */}
          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <SystemConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
