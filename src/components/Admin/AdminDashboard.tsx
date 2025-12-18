import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, BarChart3, Users, Settings, FileText, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SystemOverview } from './SystemOverview';
import { UserManagement } from './UserManagement';
import { SystemConfiguration } from './SystemConfiguration';
import { ContentManagement } from './ContentManagement';
import { AdvancedReporting } from './AdvancedReporting';
import { DebugUserRole } from './DebugUserRole';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeBookings: 0,
    monthlyRevenue: 0,
    systemHealth: 'good',
    pendingActions: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - in real app, fetch from Supabase
      const mockStats = {
        totalUsers: 1247,
        activeBookings: 89,
        monthlyRevenue: 125000,
        systemHealth: 'excellent',
        pendingActions: 3
      };

      setStats(mockStats);
    } catch (error) {
      toast({
        title: "Error loading admin data",
        description: "Failed to fetch admin dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'bg-primary';
      case 'good': return 'bg-accent';
      case 'warning': return 'bg-secondary';
      case 'critical': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <DebugUserRole />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System administration and management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getHealthColor(stats.systemHealth)} text-white`}>
            System {stats.systemHealth.toUpperCase()}
          </Badge>
          {stats.pendingActions > 0 && (
            <Badge variant="destructive">
              {stats.pendingActions} Actions Required
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 hover:bg-primary/10 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 hover:bg-accent/10 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Active Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/10 hover:bg-secondary/20 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-secondary-foreground" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.monthlyRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-muted hover:bg-muted/80 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{stats.systemHealth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-14">
          <TabsTrigger value="overview" className="h-12 text-base">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="h-12 text-base">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="system" className="h-12 text-base">
            <Settings className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="content" className="h-12 text-base">
            <Database className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="reports" className="h-12 text-base">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SystemOverview onStatsUpdate={setStats} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="system">
          <SystemConfiguration />
        </TabsContent>

        <TabsContent value="content">
          <ContentManagement />
        </TabsContent>

        <TabsContent value="reports">
          <AdvancedReporting />
        </TabsContent>
      </Tabs>
    </div>
  );
}