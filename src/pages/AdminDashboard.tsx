import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore.secure';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RecentActivityFeed } from '@/components/Dashboard/RecentActivityFeed';
import { NotificationCenter } from '@/components/Dashboard/NotificationCenter';
import { DashboardCustomization } from '@/components/Dashboard/DashboardCustomization';

// Import comprehensive admin components
import { SystemOverview } from '@/components/Admin/SystemOverview';
import { UserManagement } from '@/components/Admin/UserManagement';
import { ContentManagement } from '@/components/Admin/ContentManagement';
import { SystemConfiguration } from '@/components/Admin/SystemConfiguration';
import { AdvancedReporting } from '@/components/Admin/AdvancedReporting';
import { InventoryManagement } from '@/components/Admin/InventoryManagement';
import { SystemHealth } from '@/components/Manager/SystemHealth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role, isLoading } = useAuth();
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
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 gap-1 h-auto min-w-max">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Overview</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Users</TabsTrigger>
              <TabsTrigger value="content" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Content</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Inventory</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Reports</TabsTrigger>
              <TabsTrigger value="health" className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3">Health</TabsTrigger>
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

          {/* Content Tab - Menu, rooms, pricing, promotions */}
          <TabsContent value="content" className="space-y-4 sm:space-y-6">
            <ContentManagement />
          </TabsContent>

          {/* Inventory Tab - Stock management and tracking */}
          <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
            <InventoryManagement />
          </TabsContent>

          {/* Reports Tab - Advanced reporting and analytics */}
          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <AdvancedReporting />
          </TabsContent>

          {/* Health Tab - System health monitoring */}
          <TabsContent value="health" className="space-y-4 sm:space-y-6">
            <SystemHealth />
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
