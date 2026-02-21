import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ClipboardList, CheckCircle, Clock, AlertTriangle,
  Plus, PlayCircle, CheckCircle2, Trash2, RefreshCw,
  Calendar, BedDouble, Loader2, Search, Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import housekeepingService, {
  HousekeepingTask, HousekeepingTaskCreate,
  HousekeepingStats, RoomStatusSummary
} from '@/lib/api/housekeeping';
import { roomsAPI, Room } from '@/lib/api/rooms';
import { staffService, Staff } from '@/lib/api/staff';

const TASK_TYPES = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'turndown', label: 'Turndown Service' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'laundry', label: 'Laundry' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const getStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    on_hold: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityBadge = (priority: string) => {
  const colors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    normal: 'bg-gray-100 text-gray-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export function HousekeepingManagement() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [stats, setStats] = useState<HousekeepingStats | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatusSummary | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newTask, setNewTask] = useState<Partial<HousekeepingTaskCreate>>({
    room_id: '',
    task_type: 'cleaning',
    priority: 'normal',
    assigned_to: '',
    scheduled_time: '',
    estimated_duration: 30,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, statsData, roomStatusData, roomsData] = await Promise.all([
        housekeepingService.getTasks({ limit: 200 }),
        housekeepingService.getStats(),
        housekeepingService.getRoomStatus(),
        roomsAPI.listRooms(),
      ]);
      setTasks(tasksData);
      setStats(statsData);
      setRoomStatus(roomStatusData);
      setRooms(roomsData);

      // Fetch staff - try to get all and filter for housekeeping roles
      try {
        const allStaff = await staffService.getAllStaff({ status: 'active' });
        const hkStaff = allStaff.filter((s: Staff) =>
          /housekeep|clean/i.test(s.department || '') ||
          /housekeep|clean/i.test(s.position || '')
        );
        setStaffList(hkStaff.length > 0 ? hkStaff : allStaff);
      } catch {
        // Staff endpoint might fail, that's ok
        setStaffList([]);
      }
    } catch (error: any) {
      console.error('Error loading housekeeping data:', error);
      toast.error('Failed to load housekeeping data');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.room_number : roomId.substring(0, 8);
  };

  const getStaffName = (staffId: string | undefined) => {
    if (!staffId) return 'Unassigned';
    const staff = staffList.find(s => s.id === staffId || s.user_id === staffId);
    return staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || task.task_type === typeFilter;
    const roomNum = getRoomNumber(task.room_id);
    const matchesSearch = searchTerm === '' ||
      roomNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesType && matchesSearch;
  });

  const handleCreateTask = async () => {
    if (!newTask.room_id) {
      toast.error('Please select a room');
      return;
    }
    setIsSubmitting(true);
    try {
      const taskData: HousekeepingTaskCreate = {
        room_id: newTask.room_id!,
        task_type: (newTask.task_type as HousekeepingTaskCreate['task_type']) || 'cleaning',
        priority: (newTask.priority as HousekeepingTaskCreate['priority']) || 'normal',
        assigned_to: newTask.assigned_to || undefined,
        scheduled_time: newTask.scheduled_time || undefined,
        estimated_duration: newTask.estimated_duration || undefined,
        notes: newTask.notes || undefined,
      };
      await housekeepingService.createTask(taskData);
      toast.success('Task created successfully');
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error?.response?.data?.detail || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await housekeepingService.startTask(taskId);
      toast.success('Task started');
      loadData();
    } catch (error: any) {
      toast.error('Failed to start task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await housekeepingService.completeTask(taskId, {
        completed_at: new Date().toISOString(),
      });
      toast.success('Task completed');
      loadData();
    } catch (error: any) {
      toast.error('Failed to complete task');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await housekeepingService.deleteTask(taskToDelete);
      toast.success('Task deleted');
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
      loadData();
    } catch (error: any) {
      toast.error('Failed to delete task');
    }
  };

  const resetForm = () => {
    setNewTask({
      room_id: '',
      task_type: 'cleaning',
      priority: 'normal',
      assigned_to: '',
      scheduled_time: '',
      estimated_duration: 30,
      notes: '',
    });
    setIsCreateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span className="text-muted-foreground">Loading housekeeping data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_tasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_tasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <PlayCircle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.in_progress_tasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_tasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue_tasks}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Room Status */}
      {roomStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Room Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-blue-600">{roomStatus.total_rooms}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">{roomStatus.clean_rooms}</div>
                <div className="text-sm text-muted-foreground">Clean</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-50">
                <div className="text-2xl font-bold text-yellow-600">{roomStatus.dirty_rooms}</div>
                <div className="text-sm text-muted-foreground">Dirty</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">{roomStatus.in_progress_rooms}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{roomStatus.inspected_rooms}</div>
                <div className="text-sm text-muted-foreground">Inspected</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">{roomStatus.maintenance_required}</div>
                <div className="text-sm text-muted-foreground">Maintenance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Housekeeping Tasks
              </CardTitle>
              <CardDescription>Manage and assign cleaning tasks to staff</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TASK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Cards */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">Create a new task or adjust your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map(task => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getPriorityBadge(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusBadge(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg capitalize mb-1">
                      {task.task_type.replace('_', ' ')}
                    </h3>

                    <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                      <p className="flex items-center gap-1.5">
                        <BedDouble className="h-3.5 w-3.5" />
                        Room {getRoomNumber(task.room_id)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {getStaffName(task.assigned_to)}
                      </p>
                      {task.scheduled_time && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(task.scheduled_time).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded mb-3 line-clamp-2">
                        {task.notes}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {(task.status === 'pending' || task.status === 'assigned') && (
                        <Button size="sm" className="flex-1" onClick={() => handleStartTask(task.id)}>
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setTaskToDelete(task.id); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Housekeeping Task</DialogTitle>
            <DialogDescription>Assign a cleaning or maintenance task to staff</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select
                value={newTask.room_id || ''}
                onValueChange={(val) => setNewTask({ ...newTask, room_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.room_number} - {room.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select
                value={newTask.task_type || 'cleaning'}
                onValueChange={(val) => setNewTask({ ...newTask, task_type: val as HousekeepingTaskCreate['task_type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newTask.priority || 'normal'}
                onValueChange={(val) => setNewTask({ ...newTask, priority: val as HousekeepingTaskCreate['priority'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={newTask.assigned_to || 'unassigned'}
                onValueChange={(val) => setNewTask({ ...newTask, assigned_to: val === 'unassigned' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.user_id || staff.id}>
                      {staff.first_name} {staff.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Time</Label>
              <Input
                type="datetime-local"
                value={newTask.scheduled_time || ''}
                onChange={(e) => setNewTask({ ...newTask, scheduled_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Duration (min)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                placeholder="30"
                value={newTask.estimated_duration || ''}
                onChange={(e) => setNewTask({ ...newTask, estimated_duration: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes or special instructions..."
                value={newTask.notes || ''}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setTaskToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask}>
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
