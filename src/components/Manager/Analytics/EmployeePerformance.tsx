import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  Star,
  TrendingDown,
  Calendar,
  Target
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { analyticsService, type EmployeePerformance, type AnalyticsFilters } from '@/lib/api/analytics';

export function EmployeePerformance() {
  const [employeeData, setEmployeeData] = useState<EmployeePerformance | null>(null);
  const [teamData, setTeamData] = useState<EmployeePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    time_granularity: 'day'
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  useEffect(() => {
    loadTeamPerformance();
    if (selectedEmployee !== 'all') {
      loadEmployeePerformance(selectedEmployee);
    }
  }, [filters, selectedEmployee]);

  const loadTeamPerformance = async () => {
    setIsLoading(true);
    try {
      const data = await analyticsService.getTeamPerformance(filters);
      setTeamData(data);
    } catch (error: any) {
      toast.error('Failed to load team performance');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployeePerformance = async (employeeId: string) => {
    setIsLoading(true);
    try {
      const data = await analyticsService.getEmployeePerformance(employeeId, filters);
      setEmployeeData(data);
    } catch (error: any) {
      toast.error('Failed to load employee performance');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getPerformanceRating = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 80) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 70) return { label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const topPerformers = teamData
    .sort((a, b) => b.metrics.total_sales - a.metrics.total_sales)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <CardTitle>Employee Performance Analytics</CardTitle>
            <CardDescription>
              Performance metrics for {format(new Date(filters.start_date), 'MMM d, yyyy')} to {format(new Date(filters.end_date), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filters.time_granularity} onValueChange={(value: 'hour' | 'day' | 'week' | 'month') => setFilters({...filters, time_granularity: value})}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {teamData.map((employee) => (
                  <SelectItem key={employee.employee_id} value={employee.employee_id}>
                    {employee.employee_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => window.print()} variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      {selectedEmployee === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="text-2xl font-bold">{teamData.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Team Sales</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(teamData.reduce((sum, emp) => sum + emp.metrics.total_sales, 0))}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Productivity Score</p>
                  <p className="text-2xl font-bold">
                    {(teamData.reduce((sum, emp) => sum + emp.metrics.productivity_score, 0) / Math.max(1, teamData.length)).toFixed(1)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Top Performer</p>
                  <p className="text-2xl font-bold">
                    {topPerformers.length > 0 ? topPerformers[0].employee_name : 'N/A'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performers */}
      {selectedEmployee === 'all' && topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Performers</CardTitle>
            <CardDescription>Employees with highest sales performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((employee, index) => (
                <div key={employee.employee_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{employee.employee_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(employee.metrics.total_sales)}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{employee.metrics.total_orders} orders</Badge>
                      <Badge className={getPerformanceRating(employee.metrics.productivity_score).bg + ' ' + getPerformanceRating(employee.metrics.productivity_score).color}>
                        {getPerformanceRating(employee.metrics.productivity_score).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {selectedEmployee === 'all' ? (
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Overview</CardTitle>
                <CardDescription>Key metrics across all team members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamData.map((employee) => (
                    <div key={employee.employee_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{employee.employee_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                        </div>
                        <Badge className={getPerformanceRating(employee.metrics.productivity_score).bg + ' ' + getPerformanceRating(employee.metrics.productivity_score).color}>
                          {getPerformanceRating(employee.metrics.productivity_score).label}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Sales</span>
                          <span className="font-bold">{formatCurrency(employee.metrics.total_sales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Orders</span>
                          <span className="font-bold">{employee.metrics.total_orders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg Order Value</span>
                          <span className="font-bold">{formatCurrency(employee.metrics.avg_order_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Satisfaction</span>
                          <span className="font-bold">{employee.metrics.customer_satisfaction.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            employeeData && (
              <Card>
                <CardHeader>
                  <CardTitle>{employeeData.employee_name}'s Performance</CardTitle>
                  <CardDescription>Individual performance metrics and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Total Sales</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(employeeData.metrics.total_sales)}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Total Orders</span>
                      </div>
                      <p className="text-2xl font-bold">{employeeData.metrics.total_orders}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Avg Order Value</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(employeeData.metrics.avg_order_value)}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">Productivity Score</span>
                      </div>
                      <p className="text-2xl font-bold">{employeeData.metrics.productivity_score.toFixed(1)}</p>
                      <Badge className={getPerformanceRating(employeeData.metrics.productivity_score).bg + ' ' + getPerformanceRating(employeeData.metrics.productivity_score).color}>
                        {getPerformanceRating(employeeData.metrics.productivity_score).label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {selectedEmployee === 'all' ? (
            <Card>
              <CardHeader>
                <CardTitle>Team Metrics Analysis</CardTitle>
                <CardDescription>Comprehensive performance metrics across the team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.map((employee) => (
                    <div key={employee.employee_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{employee.employee_name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(employee.metrics.total_sales)}</p>
                          <p className="text-sm text-muted-foreground">{employee.metrics.total_orders} orders</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm text-muted-foreground">Upsell Rate</p>
                          <p className="font-bold">{employee.metrics.upsell_rate.toFixed(1)}%</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                          <p className="font-bold">{employee.metrics.customer_satisfaction.toFixed(1)}/10</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm text-muted-foreground">Productivity Score</p>
                          <p className="font-bold">{employee.metrics.productivity_score.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            employeeData && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Metrics</CardTitle>
                  <CardDescription>Comprehensive breakdown of {employeeData.employee_name}'s performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Sales Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Sales</span>
                          <span className="font-bold">{formatCurrency(employeeData.metrics.total_sales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Orders</span>
                          <span className="font-bold">{employeeData.metrics.total_orders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg Order Value</span>
                          <span className="font-bold">{formatCurrency(employeeData.metrics.avg_order_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Upsell Rate</span>
                          <span className="font-bold">{employeeData.metrics.upsell_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Quality Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Customer Satisfaction</span>
                          <span className="font-bold">{employeeData.metrics.customer_satisfaction.toFixed(1)}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Productivity Score</span>
                          <span className="font-bold">{employeeData.metrics.productivity_score.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Team Avg</span>
                          <span className="font-bold text-green-600">
                            +{employeeData.comparisons.vs_team_avg.sales.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Prev Period</span>
                          <span className={`font-bold ${employeeData.comparisons.vs_previous_period.sales_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(employeeData.comparisons.vs_previous_period.sales_growth)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {selectedEmployee === 'all' ? (
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Trends</CardTitle>
                <CardDescription>Historical performance trends across the team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.map((employee) => (
                    <div key={employee.employee_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{employee.employee_name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Last 7 days</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {employee.trends.slice(-7).map((trend) => (
                          <div key={trend.date} className="p-3 bg-gray-50 rounded text-center">
                            <p className="text-sm text-muted-foreground">{new Date(trend.date).toLocaleDateString()}</p>
                            <p className="text-lg font-bold">{formatCurrency(trend.sales)}</p>
                            <p className="text-sm text-muted-foreground">{trend.orders} orders</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            employeeData && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>Historical trends for {employeeData.employee_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {employeeData.trends.map((trend) => (
                      <div key={trend.date} className="p-4 border rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-2">{new Date(trend.date).toLocaleDateString()}</p>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Sales</span>
                            <p className="text-lg font-bold">{formatCurrency(trend.sales)}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Orders</span>
                            <p className="text-lg font-bold">{trend.orders}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Satisfaction</span>
                            <p className="text-lg font-bold">{trend.satisfaction.toFixed(1)}/10</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* Comparisons Tab */}
        <TabsContent value="comparisons" className="space-y-4">
          {selectedEmployee === 'all' ? (
            <Card>
              <CardHeader>
                <CardTitle>Team Comparisons</CardTitle>
                <CardDescription>How team members compare to benchmarks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData.map((employee) => (
                    <div key={employee.employee_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{employee.employee_name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getPerformanceRating(employee.metrics.productivity_score).bg + ' ' + getPerformanceRating(employee.metrics.productivity_score).color}>
                            {getPerformanceRating(employee.metrics.productivity_score).label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded">
                          <h5 className="font-medium mb-2">Vs Team Average</h5>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Sales</span>
                              <span className={`font-bold ${employee.comparisons.vs_team_avg.sales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(employee.comparisons.vs_team_avg.sales)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Satisfaction</span>
                              <span className={`font-bold ${employee.comparisons.vs_team_avg.satisfaction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(employee.comparisons.vs_team_avg.satisfaction)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Productivity</span>
                              <span className={`font-bold ${employee.comparisons.vs_team_avg.productivity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(employee.comparisons.vs_team_avg.productivity)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded">
                          <h5 className="font-medium mb-2">Vs Previous Period</h5>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Sales Growth</span>
                              <span className={`font-bold ${employee.comparisons.vs_previous_period.sales_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(employee.comparisons.vs_previous_period.sales_growth)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Order Growth</span>
                              <span className={`font-bold ${employee.comparisons.vs_previous_period.order_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(employee.comparisons.vs_previous_period.order_growth)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Satisfaction Change</span>
                              <span className={`font-bold ${employee.comparisons.vs_previous_period.satisfaction_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(employee.comparisons.vs_previous_period.satisfaction_change)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            employeeData && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Comparisons</CardTitle>
                  <CardDescription>How {employeeData.employee_name} compares to benchmarks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">Vs Team Average</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Sales Performance</span>
                          <div className="text-right">
                            <span className={`font-bold ${employeeData.comparisons.vs_team_avg.sales >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(employeeData.comparisons.vs_team_avg.sales)}
                            </span>
                            <p className="text-xs text-muted-foreground">vs team avg</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Customer Satisfaction</span>
                          <div className="text-right">
                            <span className={`font-bold ${employeeData.comparisons.vs_team_avg.satisfaction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(employeeData.comparisons.vs_team_avg.satisfaction)}
                            </span>
                            <p className="text-xs text-muted-foreground">vs team avg</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Productivity Score</span>
                          <div className="text-right">
                            <span className={`font-bold ${employeeData.comparisons.vs_team_avg.productivity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(employeeData.comparisons.vs_team_avg.productivity)}
                            </span>
                            <p className="text-xs text-muted-foreground">vs team avg</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">Vs Previous Period</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Sales Growth</span>
                          <div className="text-right">
                            <span className={`font-bold ${employeeData.comparisons.vs_previous_period.sales_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(employeeData.comparisons.vs_previous_period.sales_growth)}
                            </span>
                            <p className="text-xs text-muted-foreground">vs prev period</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Order Growth</span>
                          <div className="text-right">
                            <span className={`font-bold ${employeeData.comparisons.vs_previous_period.order_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(employeeData.comparisons.vs_previous_period.order_growth)}
                            </span>
                            <p className="text-xs text-muted-foreground">vs prev period</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Satisfaction Change</span>
                          <div className="text-right">
                            <span className={`font-bold ${employeeData.comparisons.vs_previous_period.satisfaction_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(employeeData.comparisons.vs_previous_period.satisfaction_change)}
                            </span>
                            <p className="text-xs text-muted-foreground">vs prev period</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}