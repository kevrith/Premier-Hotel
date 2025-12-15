import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Plus,
  PlayCircle,
  CheckCircle2,
  Package,
  Search,
  Calendar
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import housekeepingService from '@/lib/api/housekeeping';

export default function HousekeepingDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [roomStatus, setRoomStatus] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to access housekeeping dashboard');
      navigate('/login');
      return;
    }

    const userRole = user?.role || 'customer';
    if (!['admin', 'manager', 'cleaner', 'staff'].includes(userRole)) {
      toast.error('You do not have permission to access housekeeping');
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [isAuthenticated, user, navigate]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const userRole = user?.role || 'customer';

      if (userRole === 'cleaner') {
        // Cleaners see only their tasks
        const [myTasksData, statsData, roomStatusData] = await Promise.all([
          housekeepingService.getMyTasks(),
          housekeepingService.getStats(),
          housekeepingService.getRoomStatus()
        ]);

        setMyTasks(myTasksData);
        setStats(statsData);
        setRoomStatus(roomStatusData);
      } else {
        // Managers/Admin see all tasks
        const [allTasks, statsData, roomStatusData] = await Promise.all([
          housekeepingService.getTasks({ limit: 100 }),
          housekeepingService.getStats(),
          housekeepingService.getRoomStatus()
        ]);

        setTasks(allTasks);
        setStats(statsData);
        setRoomStatus(roomStatusData);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load housekeeping data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await housekeepingService.startTask(taskId);
      toast.success('Task started');
      loadDashboardData();
    } catch (error) {
      console.error('Error starting task:', error);
      toast.error('Failed to start task');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await housekeepingService.completeTask(taskId, {
        completed_at: new Date().toISOString()
      });
      toast.success('Task completed successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      on_hold: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      normal: 'bg-gray-100 text-gray-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const StatCard = ({ title, value, icon: Icon, subtitle, color }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  const TaskCard = ({ task }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getPriorityBadge(task.priority)}>
                {task.priority}
              </Badge>
              <Badge className={getStatusBadge(task.status)}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg capitalize">
              {task.task_type.replace('_', ' ')}
            </h3>
            <p className="text-sm text-muted-foreground">
              Room: {task.room_id}
            </p>
          </div>
        </div>

        {task.scheduled_time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(task.scheduled_time).toLocaleString()}
            </span>
          </div>
        )}

        {task.notes && (
          <p className="text-sm text-muted-foreground mb-4">
            {task.notes}
          </p>
        )}

        <div className="flex gap-2">
          {task.status === 'pending' || task.status === 'assigned' ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleStartTask(task.id)}
              className="flex-1"
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Start Task
            </Button>
          ) : task.status === 'in_progress' ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleCompleteTask(task.id)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedTask(task)}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!isAuthenticated || !['admin', 'manager', 'cleaner', 'staff'].includes(user?.role || '')) {
    return null;
  }

  const userRole = user?.role || 'customer';
  const displayTasks = userRole === 'cleaner' ? myTasks : tasks;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Housekeeping Dashboard</h1>
            <p className="text-muted-foreground">
              {userRole === 'cleaner' ? 'Your assigned tasks' : 'Manage housekeeping operations'}
            </p>
          </div>

          {['admin', 'manager'].includes(userRole) && (
            <Button onClick={() => navigate('/housekeeping/create-task')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading housekeeping data...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats && (
                <>
                  <StatCard
                    title="Total Tasks"
                    value={stats.total_tasks}
                    icon={ClipboardList}
                    subtitle="All tasks"
                    color="text-blue-600"
                  />
                  <StatCard
                    title="Pending"
                    value={stats.pending_tasks}
                    icon={Clock}
                    subtitle="Awaiting assignment"
                    color="text-yellow-600"
                  />
                  <StatCard
                    title="In Progress"
                    value={stats.in_progress_tasks}
                    icon={PlayCircle}
                    subtitle="Currently being worked on"
                    color="text-purple-600"
                  />
                  <StatCard
                    title="Completed"
                    value={stats.completed_tasks}
                    icon={CheckCircle}
                    subtitle="Finished tasks"
                    color="text-green-600"
                  />
                </>
              )}
            </div>

            {/* Room Status Summary */}
            {roomStatus && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Room Status Overview</CardTitle>
                  <CardDescription>Current status of all rooms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{roomStatus.total_rooms}</div>
                      <div className="text-sm text-muted-foreground">Total Rooms</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{roomStatus.clean_rooms}</div>
                      <div className="text-sm text-muted-foreground">Clean</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{roomStatus.dirty_rooms}</div>
                      <div className="text-sm text-muted-foreground">Dirty</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{roomStatus.in_progress_rooms}</div>
                      <div className="text-sm text-muted-foreground">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{roomStatus.inspected_rooms}</div>
                      <div className="text-sm text-muted-foreground">Inspected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{roomStatus.maintenance_required}</div>
                      <div className="text-sm text-muted-foreground">Maintenance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks List */}
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList>
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {displayTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-16">
                      <div className="text-center">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                        <p className="text-muted-foreground mb-4">
                          {userRole === 'cleaner'
                            ? 'You have no assigned tasks'
                            : 'Create your first housekeeping task'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayTasks.filter(t => t.status === 'pending').map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="in_progress">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayTasks.filter(t => t.status === 'in_progress').map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayTasks.filter(t => t.status === 'completed').map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
