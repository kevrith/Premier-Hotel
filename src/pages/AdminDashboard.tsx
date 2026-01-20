import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';

// Import comprehensive admin components
import { SystemOverview } from '@/components/Admin/SystemOverview';
import { UserManagement } from '@/components/Admin/UserManagement';
import { ContentManagement } from '@/components/Admin/ContentManagement';
import { SystemConfiguration } from '@/components/Admin/SystemConfiguration';
import { AdvancedReporting } from '@/components/Admin/AdvancedReporting';
import { InventoryManagement } from '@/components/Admin/InventoryManagement';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role, isLoading } = useAuth();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [activeTab, setActiveTab] = useState('overview');



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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your hotel operations and view system analytics
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab - System metrics, KPIs, charts */}
          <TabsContent value="overview" className="space-y-6">
            <SystemOverview onStatsUpdate={() => {}} />
          </TabsContent>

          {/* Users Tab - Complete user management */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Content Tab - Menu, rooms, pricing, promotions */}
          <TabsContent value="content" className="space-y-6">
            <ContentManagement />
          </TabsContent>

          {/* Inventory Tab - Stock management and tracking */}
          <TabsContent value="inventory" className="space-y-6">
            <InventoryManagement />
          </TabsContent>

          {/* Reports Tab - Advanced reporting and analytics */}
          <TabsContent value="reports" className="space-y-6">
            <AdvancedReporting />
          </TabsContent>

          {/* Settings Tab - System configuration */}
          <TabsContent value="settings" className="space-y-6">
            <SystemConfiguration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
