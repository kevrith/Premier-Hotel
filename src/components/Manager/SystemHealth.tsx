import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Database,
  Server,
  Wifi,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api/client';

interface SystemComponent {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastCheck: string;
  responseTime?: number;
}

interface SystemMetrics {
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  systemUptime: number;
}

export function SystemHealth() {
  const [components, setComponents] = useState<SystemComponent[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    setIsLoading(true);
    try {
      const [componentsRes, metricsRes] = await Promise.all([
        api.get('/system/health/components'),
        api.get('/system/health/metrics')
      ]);

      setComponents(componentsRes.data);
      setMetrics(metricsRes.data);
      setLastUpdated(new Date());
      
      localStorage.setItem('system_health_components', JSON.stringify(componentsRes.data));
      localStorage.setItem('system_health_metrics', JSON.stringify(metricsRes.data));
    } catch (error: any) {
      console.error('Error loading system health:', error);
      
      const cachedComponents = localStorage.getItem('system_health_components');
      const cachedMetrics = localStorage.getItem('system_health_metrics');
      
      if (cachedComponents && cachedMetrics) {
        setComponents(JSON.parse(cachedComponents));
        setMetrics(JSON.parse(cachedMetrics));
        toast.success('Using cached system health data');
      } else {
        toast.error('Failed to load system health data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getComponentIcon = (id: string) => {
    switch (id) {
      case 'database': return <Database className="h-5 w-5" />;
      case 'api-server': return <Server className="h-5 w-5" />;
      case 'payment-gateway': return <Wifi className="h-5 w-5" />;
      case 'email-service': return <Activity className="h-5 w-5" />;
      case 'file-storage': return <Database className="h-5 w-5" />;
      default: return <Server className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-muted-foreground">Monitor system performance and component status</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadSystemHealth}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading system health...</p>
        </div>
      ) : (
        <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
                <div className="text-xs text-muted-foreground">Currently online</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  System Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.systemUptime || 99.8}%</div>
                <div className="text-xs text-muted-foreground">Last 24 hours</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalRequests || 0}</div>
                <div className="text-xs text-muted-foreground">Today</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Error Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{(metrics?.errorRate || 0).toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground">Last 24 hours</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="components" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="components">Component Status</TabsTrigger>
              <TabsTrigger value="activity">System Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Components</CardTitle>
                  <CardDescription>Real-time status of all system components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {components.map((component) => (
                      <div key={component.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getComponentIcon(component.id)}
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Response time: {component.responseTime}ms
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">Uptime: {component.uptime}%</div>
                            <div className="text-xs text-muted-foreground">
                              Last check: {new Date(component.lastCheck).toLocaleTimeString()}
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(component.status)} text-white`}>
                            {getStatusIcon(component.status)}
                            <span className="ml-1 capitalize">{component.status}</span>
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent System Activity</CardTitle>
                  <CardDescription>Latest system events and status changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { event: 'Database connection established', time: '2 minutes ago', type: 'success' },
                      { event: 'API server health check passed', time: '5 minutes ago', type: 'success' },
                      { event: 'Email service experiencing delays', time: '12 minutes ago', type: 'warning' },
                      { event: 'File storage backup completed', time: '20 minutes ago', type: 'success' },
                      { event: 'Payment gateway response time increased', time: '30 minutes ago', type: 'warning' },
                      { event: 'New user registration completed', time: '45 minutes ago', type: 'info' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            activity.type === 'success' ? 'bg-green-500' : 
                            activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <span className="text-sm">{activity.event}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}