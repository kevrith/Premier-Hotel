/**
 * Supplier Performance Metrics Dashboard
 * Tracks and analyzes supplier performance with detailed metrics
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { inventoryService, type Supplier, type PurchaseOrder } from '@/lib/api/inventory';
import { toast } from 'react-hot-toast';

interface SupplierMetrics {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_spend: number;
  avg_order_value: number;
  on_time_delivery_rate: number;
  avg_delivery_delay_days: number;
  quality_rating: number;
  defect_rate: number;
  response_time_hours: number;
  payment_terms_compliance: number;
  items_supplied: number;
  last_order_date?: string;
  performance_score: number;
  performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export function SupplierPerformance() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [metrics, setMetrics] = useState<SupplierMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<string>('30'); // days

  useEffect(() => {
    loadData();
  }, [timePeriod]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timePeriod));

      const [suppliersData, posData] = await Promise.all([
        inventoryService.getSuppliers(true),
        inventoryService.getPurchaseOrders({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
      ]);

      setSuppliers(suppliersData);
      setPurchaseOrders(posData);

      // Calculate metrics for each supplier
      const calculatedMetrics = calculateSupplierMetrics(suppliersData, posData);
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error loading supplier performance data:', error);
      toast.error('Failed to load supplier performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSupplierMetrics = (
    suppliers: Supplier[],
    orders: PurchaseOrder[]
  ): SupplierMetrics[] => {
    return suppliers.map(supplier => {
      const supplierOrders = orders.filter(po => po.supplier_id === supplier.id);

      const totalOrders = supplierOrders.length;
      const completedOrders = supplierOrders.filter(po => po.status === 'received').length;
      const cancelledOrders = supplierOrders.filter(po => po.status === 'cancelled').length;
      const totalSpend = supplierOrders.reduce((sum, po) => sum + po.total_amount, 0);
      const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

      // Calculate on-time delivery rate
      const deliveredOrders = supplierOrders.filter(
        po => po.actual_delivery_date && po.expected_delivery_date
      );
      const onTimeOrders = deliveredOrders.filter(
        po =>
          new Date(po.actual_delivery_date!) <= new Date(po.expected_delivery_date!)
      );
      const onTimeDeliveryRate = deliveredOrders.length > 0
        ? (onTimeOrders.length / deliveredOrders.length) * 100
        : 0;

      // Calculate average delivery delay
      const delayedOrders = deliveredOrders.filter(
        po =>
          new Date(po.actual_delivery_date!) > new Date(po.expected_delivery_date!)
      );
      const totalDelay = delayedOrders.reduce((sum, po) => {
        const expected = new Date(po.expected_delivery_date!).getTime();
        const actual = new Date(po.actual_delivery_date!).getTime();
        return sum + (actual - expected) / (1000 * 60 * 60 * 24); // days
      }, 0);
      const avgDeliveryDelay = delayedOrders.length > 0 ? totalDelay / delayedOrders.length : 0;

      // Calculate performance score (0-100)
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const cancellationPenalty = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      const performanceScore = Math.max(
        0,
        Math.min(
          100,
          (completionRate * 0.3 +
            onTimeDeliveryRate * 0.4 +
            (supplier.rating || 3) * 20 * 0.2 +
            (100 - cancellationPenalty) * 0.1)
        )
      );

      // Assign grade based on score
      let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
      if (performanceScore >= 90) performanceGrade = 'A';
      else if (performanceScore >= 80) performanceGrade = 'B';
      else if (performanceScore >= 70) performanceGrade = 'C';
      else if (performanceScore >= 60) performanceGrade = 'D';
      else performanceGrade = 'F';

      const lastOrder = supplierOrders
        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0];

      return {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        total_orders: totalOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        total_spend: totalSpend,
        avg_order_value: avgOrderValue,
        on_time_delivery_rate: onTimeDeliveryRate,
        avg_delivery_delay_days: avgDeliveryDelay,
        quality_rating: supplier.rating || 0,
        defect_rate: 0, // Would need defect tracking data
        response_time_hours: 0, // Would need response time tracking
        payment_terms_compliance: 100, // Would need payment tracking
        items_supplied: 0, // Would need item count from PO items
        last_order_date: lastOrder?.order_date,
        performance_score: performanceScore,
        performance_grade: performanceGrade
      };
    });
  };

  const filteredMetrics = useMemo(() => {
    if (selectedSupplier === 'all') return metrics;
    return metrics.filter(m => m.supplier_id === selectedSupplier);
  }, [metrics, selectedSupplier]);

  const topPerformers = useMemo(() => {
    return [...metrics]
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, 5);
  }, [metrics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = () => {
    toast.success('Exporting supplier performance report...');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplier Performance Metrics</h2>
          <p className="text-muted-foreground">Analyze and track supplier performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-green-600 mt-1">
              {suppliers.filter(s => s.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.reduce((sum, m) => sum + m.total_spend, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last {timePeriod} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.length > 0
                ? (
                    metrics.reduce((sum, m) => sum + m.on_time_delivery_rate, 0) / metrics.length
                  ).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Delivery performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <>
                <div className="text-lg font-bold truncate">{topPerformers[0].supplier_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getGradeColor(topPerformers[0].performance_grade)}>
                    Grade {topPerformers[0].performance_grade}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {topPerformers[0].performance_score.toFixed(0)}/100
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance Overview</CardTitle>
              <CardDescription>Key performance indicators for all suppliers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>On-Time Rate</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map(metric => (
                    <TableRow key={metric.supplier_id}>
                      <TableCell className="font-medium">{metric.supplier_name}</TableCell>
                      <TableCell>
                        <Badge className={getGradeColor(metric.performance_grade)}>
                          {metric.performance_grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{metric.total_orders}</div>
                          <div className="text-xs text-muted-foreground">
                            {metric.completed_orders} completed
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(metric.total_spend)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  metric.on_time_delivery_rate >= 80
                                    ? 'bg-green-500'
                                    : metric.on_time_delivery_rate >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${metric.on_time_delivery_rate}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium">
                            {metric.on_time_delivery_rate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < metric.quality_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(metric.last_order_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Metrics Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMetrics.map(metric => (
              <Card key={metric.supplier_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{metric.supplier_name}</CardTitle>
                      <CardDescription>Performance Score: {metric.performance_score.toFixed(1)}/100</CardDescription>
                    </div>
                    <Badge className={getGradeColor(metric.performance_grade)} className="text-lg px-3 py-1">
                      {metric.performance_grade}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        Total Orders
                      </div>
                      <div className="text-2xl font-bold">{metric.total_orders}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Total Spend
                      </div>
                      <div className="text-2xl font-bold">{formatCurrency(metric.total_spend)}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        Completion Rate
                      </div>
                      <div className="text-2xl font-bold">
                        {metric.total_orders > 0
                          ? ((metric.completed_orders / metric.total_orders) * 100).toFixed(0)
                          : 0}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        On-Time Delivery
                      </div>
                      <div className="text-2xl font-bold">
                        {metric.on_time_delivery_rate.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {metric.avg_delivery_delay_days > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Avg delay: {metric.avg_delivery_delay_days.toFixed(1)} days
                      </span>
                    </div>
                  )}

                  {metric.cancelled_orders > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        {metric.cancelled_orders} cancelled order{metric.cancelled_orders > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top 5 Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((metric, index) => (
                    <div key={metric.supplier_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{metric.supplier_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {metric.total_orders} orders • {metric.on_time_delivery_rate.toFixed(0)}% on-time
                        </div>
                      </div>
                      <Badge className={getGradeColor(metric.performance_grade)}>
                        {metric.performance_grade}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bottom Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Needs Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...metrics]
                    .sort((a, b) => a.performance_score - b.performance_score)
                    .slice(0, 5)
                    .map((metric, index) => (
                      <div key={metric.supplier_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full font-bold">
                          {metrics.length - index}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{metric.supplier_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {metric.total_orders} orders • {metric.on_time_delivery_rate.toFixed(0)}% on-time
                          </div>
                        </div>
                        <Badge className={getGradeColor(metric.performance_grade)}>
                          {metric.performance_grade}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
