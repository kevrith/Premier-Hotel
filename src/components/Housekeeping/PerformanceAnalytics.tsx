/**
 * Performance Analytics Dashboard
 * Comprehensive analytics for housekeeping performance, quality, and efficiency
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Star,
  Users,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { housekeepingService } from '@/lib/api/housekeeping';

interface PerformanceMetrics {
  avg_cleaning_time: number;
  avg_quality_score: number;
  tasks_completed: number;
  completion_rate: number;
  on_time_rate: number;
  guest_satisfaction: number;
}

interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  tasks_completed: number;
  avg_time: number;
  avg_quality: number;
  completion_rate: number;
  rooms_cleaned: number;
}

interface TimeAnalytics {
  room_type: string;
  avg_time: number;
  min_time: number;
  max_time: number;
  sample_size: number;
}

interface QualityTrend {
  date: string;
  avg_score: number;
  inspections: number;
  passed: number;
  failed: number;
}

export function PerformanceAnalytics() {
  const { t } = useTranslation('common');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [timeAnalytics, setTimeAnalytics] = useState<TimeAnalytics[]>([]);
  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
  const [dateRange, setDateRange] = useState('7days');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Load all analytics data
      const stats = await housekeepingService.getStats({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      // Mock data - replace with actual API calls
      setMetrics({
        avg_cleaning_time: 45,
        avg_quality_score: 4.3,
        tasks_completed: 156,
        completion_rate: 94,
        on_time_rate: 89,
        guest_satisfaction: 4.6
      });

      setStaffPerformance([
        {
          staff_id: '1',
          staff_name: 'Maria Garcia',
          tasks_completed: 42,
          avg_time: 38,
          avg_quality: 4.7,
          completion_rate: 98,
          rooms_cleaned: 38
        },
        {
          staff_id: '2',
          staff_name: 'John Smith',
          tasks_completed: 39,
          avg_time: 42,
          avg_quality: 4.5,
          completion_rate: 95,
          rooms_cleaned: 35
        },
        {
          staff_id: '3',
          staff_name: 'Ana Rodriguez',
          tasks_completed: 45,
          avg_time: 40,
          avg_quality: 4.6,
          completion_rate: 96,
          rooms_cleaned: 41
        }
      ]);

      setTimeAnalytics([
        {
          room_type: 'Standard',
          avg_time: 35,
          min_time: 28,
          max_time: 45,
          sample_size: 42
        },
        {
          room_type: 'Deluxe',
          avg_time: 42,
          min_time: 35,
          max_time: 52,
          sample_size: 28
        },
        {
          room_type: 'Suite',
          avg_time: 60,
          min_time: 48,
          max_time: 75,
          sample_size: 15
        }
      ]);

      setQualityTrends([
        { date: '2025-12-20', avg_score: 4.2, inspections: 18, passed: 16, failed: 2 },
        { date: '2025-12-21', avg_score: 4.5, inspections: 22, passed: 21, failed: 1 },
        { date: '2025-12-22', avg_score: 4.3, inspections: 20, passed: 19, failed: 1 },
        { date: '2025-12-23', avg_score: 4.6, inspections: 25, passed: 24, failed: 1 },
        { date: '2025-12-24', avg_score: 4.4, inspections: 19, passed: 17, failed: 2 },
        { date: '2025-12-25', avg_score: 4.7, inspections: 16, passed: 16, failed: 0 },
        { date: '2025-12-26', avg_score: 4.5, inspections: 21, passed: 20, failed: 1 }
      ]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (value < threshold) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-blue-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Track efficiency, quality, and team performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg. Time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avg_cleaning_time}m</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {getTrendIcon(-2)}
                <span>2m faster</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Quality Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getQualityColor(metrics.avg_quality_score)}`}>
                {metrics.avg_quality_score.toFixed(1)}/5
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {getTrendIcon(0.2)}
                <span>+0.2 from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tasks Done
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.tasks_completed}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {getTrendIcon(12)}
                <span>+12 from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completion Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(metrics.completion_rate)}`}>
                {metrics.completion_rate}%
              </div>
              <Progress value={metrics.completion_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>On-Time Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(metrics.on_time_rate)}`}>
                {metrics.on_time_rate}%
              </div>
              <Progress value={metrics.on_time_rate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Guest Rating</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getQualityColor(metrics.guest_satisfaction)}`}>
                {metrics.guest_satisfaction.toFixed(1)}/5
              </div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= metrics.guest_satisfaction
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="quality">Quality Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance Rankings</CardTitle>
              <CardDescription>Individual staff member metrics and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Rooms Cleaned</TableHead>
                    <TableHead>Tasks Completed</TableHead>
                    <TableHead>Avg. Time</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerformance
                    .sort((a, b) => b.rooms_cleaned - a.rooms_cleaned)
                    .map((staff, index) => (
                      <TableRow key={staff.staff_id}>
                        <TableCell>
                          <Badge
                            variant={index === 0 ? 'default' : 'outline'}
                            className={
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : ''
                            }
                          >
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{staff.staff_name}</TableCell>
                        <TableCell>{staff.rooms_cleaned}</TableCell>
                        <TableCell>{staff.tasks_completed}</TableCell>
                        <TableCell>{staff.avg_time}m</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={getQualityColor(staff.avg_quality)}>
                              {staff.avg_quality.toFixed(1)}
                            </span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= staff.avg_quality
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={getPerformanceColor(staff.completion_rate)}>
                              {staff.completion_rate}%
                            </span>
                            <Progress value={staff.completion_rate} className="w-20 h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cleaning Time Analysis by Room Type</CardTitle>
              <CardDescription>Average cleaning duration and efficiency metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Average Time</TableHead>
                    <TableHead>Fastest</TableHead>
                    <TableHead>Slowest</TableHead>
                    <TableHead>Sample Size</TableHead>
                    <TableHead>Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeAnalytics.map((data) => {
                    const efficiency = ((data.min_time / data.avg_time) * 100).toFixed(0);
                    return (
                      <TableRow key={data.room_type}>
                        <TableCell className="font-medium">{data.room_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{data.avg_time}m</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600">{data.min_time}m</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600">{data.max_time}m</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{data.sample_size} rooms</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{efficiency}%</span>
                            </div>
                            <Progress value={parseInt(efficiency)} className="h-1" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeAnalytics.map((data) => (
              <Card key={data.room_type}>
                <CardHeader>
                  <CardTitle className="text-lg">{data.room_type}</CardTitle>
                  <CardDescription>{data.sample_size} rooms analyzed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average</span>
                    <span className="text-xl font-bold">{data.avg_time}m</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Best Time</span>
                    <span className="text-sm font-medium text-green-600">{data.min_time}m</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Slowest</span>
                    <span className="text-sm font-medium text-red-600">{data.max_time}m</span>
                  </div>
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-1">Time variance</div>
                    <Progress
                      value={((data.max_time - data.min_time) / data.max_time) * 100}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Score Trends</CardTitle>
              <CardDescription>Daily inspection results and quality metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Avg. Score</TableHead>
                    <TableHead>Inspections</TableHead>
                    <TableHead>Passed</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Pass Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualityTrends.map((trend) => {
                    const passRate = (trend.passed / trend.inspections) * 100;
                    return (
                      <TableRow key={trend.date}>
                        <TableCell>
                          {new Date(trend.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${getQualityColor(trend.avg_score)}`}>
                              {trend.avg_score.toFixed(1)}
                            </span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= trend.avg_score
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{trend.inspections}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">{trend.passed}</span>
                        </TableCell>
                        <TableCell>
                          <span className={trend.failed > 0 ? 'text-red-600 font-medium' : ''}>
                            {trend.failed}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={getPerformanceColor(passRate)}>
                              {passRate.toFixed(0)}%
                            </span>
                            <Progress value={passRate} className="w-20 h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Quality Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Quality Score</span>
                  <span className="text-2xl font-bold text-green-600">
                    {(
                      qualityTrends.reduce((sum, t) => sum + t.avg_score, 0) / qualityTrends.length
                    ).toFixed(1)}
                    /5
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Inspections</span>
                  <span className="text-xl font-bold">
                    {qualityTrends.reduce((sum, t) => sum + t.inspections, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pass Rate</span>
                  <span className="text-xl font-bold text-green-600">
                    {(
                      (qualityTrends.reduce((sum, t) => sum + t.passed, 0) /
                        qualityTrends.reduce((sum, t) => sum + t.inspections, 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Failed Inspections</span>
                  <span className="text-xl font-bold text-red-600">
                    {qualityTrends.reduce((sum, t) => sum + t.failed, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Improvement Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Quality Improving</div>
                      <div className="text-xs text-muted-foreground">
                        +5% improvement in last 7 days
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Faster Cleaning Times</div>
                      <div className="text-xs text-muted-foreground">
                        2 minutes faster on average
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">High Completion Rate</div>
                      <div className="text-xs text-muted-foreground">
                        94% of tasks completed on time
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
