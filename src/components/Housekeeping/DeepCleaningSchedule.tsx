/**
 * Deep Cleaning Schedule Component
 * Manage and track deep cleaning schedules for all rooms
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

interface DeepCleaningSchedule {
  id: string;
  room_number: string;
  room_type: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  last_cleaned: string;
  next_scheduled: string;
  assigned_to?: string;
  status: 'scheduled' | 'overdue' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high';
  notes?: string;
}

const FREQUENCY_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90
};

export function DeepCleaningSchedule() {
  const { t } = useTranslation('common');
  const [schedules, setSchedules] = useState<DeepCleaningSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<DeepCleaningSchedule[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<DeepCleaningSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    filterSchedules();
  }, [schedules, statusFilter]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockData: DeepCleaningSchedule[] = [
        {
          id: '1',
          room_number: '101',
          room_type: 'Deluxe',
          frequency: 'weekly',
          last_cleaned: '2025-12-20',
          next_scheduled: '2025-12-27',
          status: 'scheduled',
          priority: 'normal'
        },
        {
          id: '2',
          room_number: '102',
          room_type: 'Suite',
          frequency: 'biweekly',
          last_cleaned: '2025-12-10',
          next_scheduled: '2025-12-24',
          status: 'overdue',
          priority: 'high'
        },
        {
          id: '3',
          room_number: '201',
          room_type: 'Standard',
          frequency: 'monthly',
          last_cleaned: '2025-11-27',
          next_scheduled: '2025-12-27',
          status: 'scheduled',
          priority: 'normal'
        }
      ];

      setSchedules(mockData);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const filterSchedules = () => {
    let filtered = schedules;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(schedule => schedule.status === statusFilter);
    }

    // Sort by next scheduled date
    filtered.sort((a, b) => new Date(a.next_scheduled).getTime() - new Date(b.next_scheduled).getTime());

    setFilteredSchedules(filtered);
  };

  const handleAddNew = () => {
    setSelectedSchedule(null);
    setShowDialog(true);
  };

  const handleEdit = (schedule: DeepCleaningSchedule) => {
    setSelectedSchedule(schedule);
    setShowDialog(true);
  };

  const handleComplete = async (scheduleId: string) => {
    try {
      // Update schedule
      const today = new Date().toISOString().split('T')[0];
      const schedule = schedules.find(s => s.id === scheduleId);

      if (schedule) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + FREQUENCY_DAYS[schedule.frequency]);

        const updatedSchedule = {
          ...schedule,
          last_cleaned: today,
          next_scheduled: nextDate.toISOString().split('T')[0],
          status: 'completed' as const
        };

        setSchedules(prev => prev.map(s => s.id === scheduleId ? updatedSchedule : s));
        toast.success('Deep cleaning marked as complete');
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast.success('Schedule deleted');
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntil = (date: string) => {
    const today = new Date();
    const scheduled = new Date(date);
    const diffTime = scheduled.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const stats = {
    total: schedules.length,
    scheduled: schedules.filter(s => s.status === 'scheduled').length,
    overdue: schedules.filter(s => s.status === 'overdue').length,
    thisWeek: schedules.filter(s => {
      const days = getDaysUntil(s.next_scheduled);
      return days >= 0 && days <= 7;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Deep Cleaning Schedule</h2>
          <p className="text-muted-foreground">Manage periodic deep cleaning for all rooms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Rooms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overdue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Due This Week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.thisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Schedule Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {statusFilter !== 'all' ? 'No schedules match your filter' : 'No deep cleaning schedules'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Cleaned</TableHead>
                  <TableHead>Next Scheduled</TableHead>
                  <TableHead>Days Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => {
                  const daysUntil = getDaysUntil(schedule.next_scheduled);
                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.room_number}</TableCell>
                      <TableCell>{schedule.room_type}</TableCell>
                      <TableCell className="capitalize">{schedule.frequency}</TableCell>
                      <TableCell>
                        {new Date(schedule.last_cleaned).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.next_scheduled).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            daysUntil < 0
                              ? 'text-red-600'
                              : daysUntil <= 3
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }`}
                        >
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(schedule.status)}>
                          {schedule.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(schedule.status === 'scheduled' || schedule.status === 'overdue') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleComplete(schedule.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <ScheduleDialog
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setSelectedSchedule(null);
        }}
        schedule={selectedSchedule}
        onSave={() => {
          setShowDialog(false);
          loadSchedules();
        }}
      />
    </div>
  );
}

// Schedule Dialog Component
interface ScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DeepCleaningSchedule | null;
  onSave: () => void;
}

function ScheduleDialog({ isOpen, onClose, schedule, onSave }: ScheduleDialogProps) {
  const [formData, setFormData] = useState<Partial<DeepCleaningSchedule>>({
    room_number: '',
    room_type: '',
    frequency: 'monthly',
    last_cleaned: new Date().toISOString().split('T')[0],
    next_scheduled: '',
    status: 'scheduled',
    priority: 'normal',
    notes: ''
  });

  useEffect(() => {
    if (schedule) {
      setFormData(schedule);
    } else {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      setFormData({
        room_number: '',
        room_type: '',
        frequency: 'monthly',
        last_cleaned: today.toISOString().split('T')[0],
        next_scheduled: nextMonth.toISOString().split('T')[0],
        status: 'scheduled',
        priority: 'normal',
        notes: ''
      });
    }
  }, [schedule, isOpen]);

  const handleSubmit = () => {
    if (!formData.room_number || !formData.frequency) {
      toast.error('Please fill in required fields');
      return;
    }

    toast.success(schedule ? 'Schedule updated' : 'Schedule created');
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit Schedule' : 'Add Deep Cleaning Schedule'}</DialogTitle>
          <DialogDescription>
            {schedule ? 'Update the deep cleaning schedule' : 'Create a new deep cleaning schedule'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Room Number *</Label>
              <Input
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g., 101"
              />
            </div>

            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select
                value={formData.room_type}
                onValueChange={(value) => setFormData({ ...formData, room_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Deluxe">Deluxe</SelectItem>
                  <SelectItem value="Suite">Suite</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cleaning Frequency *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (every 7 days)</SelectItem>
                <SelectItem value="biweekly">Bi-weekly (every 14 days)</SelectItem>
                <SelectItem value="monthly">Monthly (every 30 days)</SelectItem>
                <SelectItem value="quarterly">Quarterly (every 90 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Last Cleaned</Label>
              <Input
                type="date"
                value={formData.last_cleaned}
                onChange={(e) => setFormData({ ...formData, last_cleaned: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Next Scheduled</Label>
              <Input
                type="date"
                value={formData.next_scheduled}
                onChange={(e) => setFormData({ ...formData, next_scheduled: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or special instructions..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {schedule ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
