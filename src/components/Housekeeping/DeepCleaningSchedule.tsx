/**
 * Deep Cleaning Schedule Component
 * Manage and track deep cleaning schedules for all rooms — wired to real API
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { housekeepingService, type HousekeepingSchedule, type HousekeepingScheduleCreate } from '@/lib/api/housekeeping';

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90,
};

function deriveStatus(schedule: HousekeepingSchedule): 'scheduled' | 'overdue' | 'completed' {
  if (!schedule.next_scheduled_at) return 'scheduled';
  const next = new Date(schedule.next_scheduled_at);
  const now = new Date();
  if (next < now) return 'overdue';
  return 'scheduled';
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function DeepCleaningSchedule() {
  const [schedules, setSchedules] = useState<HousekeepingSchedule[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selected, setSelected] = useState<HousekeepingSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await housekeepingService.getSchedules({ task_type: 'deep_clean' });
      setSchedules(data);
    } catch {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = schedules.filter(s => {
    if (statusFilter === 'all') return true;
    return deriveStatus(s) === statusFilter;
  }).sort((a, b) =>
    new Date(a.next_scheduled_at ?? '').getTime() - new Date(b.next_scheduled_at ?? '').getTime()
  );

  const stats = {
    total: schedules.length,
    scheduled: schedules.filter(s => deriveStatus(s) === 'scheduled').length,
    overdue: schedules.filter(s => deriveStatus(s) === 'overdue').length,
    thisWeek: schedules.filter(s => { const d = daysUntil(s.next_scheduled_at); return d !== null && d >= 0 && d <= 7; }).length,
  };

  const handleComplete = async (id: string) => {
    try {
      const updated = await housekeepingService.completeSchedule(id);
      setSchedules(prev => prev.map(s => s.id === id ? updated : s));
      toast.success('Deep cleaning marked as complete');
    } catch {
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await housekeepingService.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  const statusColor = (s: HousekeepingSchedule) => {
    const st = deriveStatus(s);
    if (st === 'overdue') return 'bg-red-100 text-red-800';
    if (st === 'scheduled') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
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
          <Button variant="outline" onClick={() => {
            const rows = filtered.map(s =>
              `${s.room_id ?? 'All'},${s.frequency},${s.last_executed_at?.split('T')[0] ?? ''},${s.next_scheduled_at?.split('T')[0] ?? ''},${deriveStatus(s)}`
            );
            const csv = ['Room,Frequency,Last Cleaned,Next Scheduled,Status', ...rows].join('\n');
            const a = document.createElement('a');
            a.href = 'data:text/csv,' + encodeURIComponent(csv);
            a.download = 'deep_cleaning_schedule.csv';
            a.click();
          }}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button onClick={() => { setSelected(null); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Schedule
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: '' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
          { label: 'Due This Week', value: stats.thisWeek, color: 'text-orange-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading schedules…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {statusFilter !== 'all' ? 'No schedules match your filter' : 'No deep cleaning schedules yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room / Area</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Cleaned</TableHead>
                  <TableHead>Next Scheduled</TableHead>
                  <TableHead>Days Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => {
                  const days = daysUntil(s.next_scheduled_at);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.room_id ?? 'All Rooms'}</TableCell>
                      <TableCell className="capitalize">{s.frequency}</TableCell>
                      <TableCell>
                        {s.last_executed_at
                          ? new Date(s.last_executed_at).toLocaleDateString()
                          : <span className="text-muted-foreground">Never</span>}
                      </TableCell>
                      <TableCell>
                        {s.next_scheduled_at
                          ? new Date(s.next_scheduled_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {days === null ? '—' : (
                          <span className={days < 0 ? 'text-red-600 font-medium' : days <= 3 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(s)}>{deriveStatus(s)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {deriveStatus(s) !== 'completed' && (
                            <Button size="sm" variant="ghost" onClick={() => handleComplete(s.id)} title="Mark complete">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setSelected(s); setShowDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
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

      <ScheduleDialog
        isOpen={showDialog}
        onClose={() => { setShowDialog(false); setSelected(null); }}
        schedule={selected}
        onSave={() => { setShowDialog(false); setSelected(null); load(); }}
      />
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

interface ScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: HousekeepingSchedule | null;
  onSave: () => void;
}

function ScheduleDialog({ isOpen, onClose, schedule, onSave }: ScheduleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HousekeepingScheduleCreate>({
    task_type: 'deep_clean',
    frequency: 'monthly',
    room_id: '',
    notes: '',
  });

  useEffect(() => {
    if (schedule) {
      setForm({
        task_type: schedule.task_type,
        frequency: schedule.frequency,
        room_id: schedule.room_id ?? '',
        notes: schedule.notes ?? '',
        assigned_to: schedule.assigned_to,
      });
    } else {
      setForm({ task_type: 'deep_clean', frequency: 'monthly', room_id: '', notes: '' });
    }
  }, [schedule, isOpen]);

  const handleSubmit = async () => {
    if (!form.frequency) { toast.error('Frequency is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, room_id: form.room_id || undefined };
      if (schedule) {
        await housekeepingService.updateSchedule(schedule.id, payload);
        toast.success('Schedule updated');
      } else {
        await housekeepingService.createSchedule(payload);
        toast.success('Schedule created');
      }
      onSave();
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit Schedule' : 'Add Deep Cleaning Schedule'}</DialogTitle>
          <DialogDescription>
            {schedule ? 'Update this deep cleaning schedule' : 'Create a recurring deep cleaning schedule'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Room ID (leave blank for all)</Label>
              <Input
                value={form.room_id ?? ''}
                onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                placeholder="Room UUID or blank"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (7 days)</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly (14 days)</SelectItem>
                  <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                  <SelectItem value="quarterly">Quarterly (90 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Special instructions…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : schedule ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
