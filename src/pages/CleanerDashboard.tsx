import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Clock, CheckCircle2, AlertTriangle, BedDouble, TrendingUp,
  ClipboardCheck, Package, PlayCircle, ListChecks, WifiOff, Loader2,
  Calendar, RefreshCw, Search, Star, BarChart2, MessageSquare, Plus, Wrench, ShoppingBag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import housekeepingService, {
  HousekeepingTask, HousekeepingSupply, LostAndFound
} from '@/lib/api/housekeeping';
import { roomsAPI, Room } from '@/lib/api/rooms';
import { api } from '@/lib/api/client';

interface MaintenanceFlag {
  id: string;
  room_id: string;
  task_id?: string;
  issue_type: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  created_at: string;
}

interface LinenItem {
  id: string;
  item_name: string;
  category: string;
  total_quantity: number;
  in_use_quantity: number;
  in_laundry_quantity: number;
  damaged_quantity: number;
  available_quantity: number;
  reorder_level: number;
  unit: string;
}

// Enterprise: checklist template — also saved to inspection record
const CHECKLIST_ITEMS = [
  { id: 'bed_linens',    label: 'Bed linens changed and properly made' },
  { id: 'bathroom',      label: 'Bathroom cleaned and sanitized' },
  { id: 'toiletries',    label: 'Toiletries restocked' },
  { id: 'towels',        label: 'Towels replaced' },
  { id: 'floor',         label: 'Floor vacuumed/mopped' },
  { id: 'dusting',       label: 'Surfaces and furniture dusted' },
  { id: 'windows',       label: 'Windows and mirrors cleaned' },
  { id: 'trash',         label: 'Trash bins emptied' },
  { id: 'minibar',       label: 'Minibar restocked' },
  { id: 'appliances',    label: 'All appliances checked and working' },
];

export default function CleanerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();

  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [supplies, setSupplies] = useState<HousekeepingSupply[]>([]);
  const [lostItems, setLostItems] = useState<LostAndFound[]>([]);
  const [maintenanceFlags, setMaintenanceFlags] = useState<MaintenanceFlag[]>([]);
  const [linenItems, setLinenItems] = useState<LinenItem[]>([]);
  const [myStats, setMyStats] = useState<{ completed_today: number; completed_week: number; avg_time: number; avg_score: number } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');

  // Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Inspection dialog
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [cleanlinessScore, setCleanlinessScore] = useState(8);
  const [maintenanceScore, setMaintenanceScore] = useState(8);
  const [amenitiesScore, setAmenitiesScore] = useState(8);
  const [issuesFound, setIssuesFound] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Lost & Found form
  const [showLostFoundForm, setShowLostFoundForm] = useState(false);
  const [lostFoundForm, setLostFoundForm] = useState({ item_name: '', description: '', room_id: '', storage_location: '', category: '' });
  const [submittingLost, setSubmittingLost] = useState(false);

  // Maintenance flag form
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagTaskId, setFlagTaskId] = useState<string | undefined>(undefined);
  const [flagRoomId, setFlagRoomId] = useState('');
  const [flagForm, setFlagForm] = useState({ issue_type: 'other', title: '', description: '', priority: 'normal' });
  const [submittingFlag, setSubmittingFlag] = useState(false);

  // Linen movement
  const [showLinenMove, setShowLinenMove] = useState(false);
  const [linenMoveForm, setLinenMoveForm] = useState({ linen_item_id: '', room_id: '', movement_type: 'issued', quantity: 1, notes: '' });
  const [submittingLinen, setSubmittingLinen] = useState(false);

  // Timers
  const [roomTimers, setRoomTimers] = useState<Record<string, { startTime: Date; elapsed: number }>>({});
  const timerRef = useRef<any>(null);

  // Load offline queue and timers
  useEffect(() => {
    const q = localStorage.getItem('cleanerOfflineQueue');
    const t = localStorage.getItem('roomTimers');
    if (q) { try { setOfflineQueue(JSON.parse(q)); } catch {} }
    if (t) {
      try {
        const p = JSON.parse(t);
        Object.keys(p).forEach(k => { p[k].startTime = new Date(p[k].startTime); });
        setRoomTimers(p);
      } catch {}
    }
  }, []);

  // Online/offline
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); toast.success('Connection restored'); processOfflineQueue(); };
    const onOffline = () => { setIsOnline(false); toast.error('Offline mode — actions will sync when reconnected'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [offlineQueue]);

  // Timer tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRoomTimers(prev => {
        const u = { ...prev };
        Object.keys(u).forEach(id => { u[id] = { ...u[id], elapsed: Math.floor((Date.now() - u[id].startTime.getTime()) / 1000) }; });
        return u;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => { localStorage.setItem('roomTimers', JSON.stringify(roomTimers)); }, [roomTimers]);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated || !['cleaner', 'housekeeping', 'admin'].includes(role || '')) {
      toast.error('Access denied');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    if (isAuthenticated && ['cleaner', 'housekeeping', 'admin'].includes(role || '')) loadData();
  }, [isAuthenticated, role]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, roomsData] = await Promise.all([
        housekeepingService.getMyTasks(),
        roomsAPI.listRooms().catch(() => []),
      ]);
      setTasks(tasksData);
      setRooms(roomsData);

      const [suppliesData, lostData, flagsData, linenData] = await Promise.all([
        housekeepingService.getSupplies().catch(() => []),
        housekeepingService.getLostItems({ limit: 50 }).catch(() => []),
        api.get('/maintenance/flags').then(r => (r.data as any) || []).catch(() => []),
        api.get('/maintenance/linen').then(r => (r.data as any) || []).catch(() => []),
      ]);
      setSupplies(suppliesData);
      setLostItems(lostData);
      setMaintenanceFlags(flagsData as MaintenanceFlag[]);
      setLinenItems(linenData as LinenItem[]);

      // Personal performance: filter from tasks data
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const completedToday = tasksData.filter(t => t.status === 'completed' && t.completed_at?.startsWith(today)).length;
      const completedWeek = tasksData.filter(t => t.status === 'completed' && (t.completed_at || '') >= weekAgo).length;
      const durations = tasksData.filter(t => t.actual_duration && t.actual_duration > 0).map(t => t.actual_duration!);
      const avgTime = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      setMyStats({ completed_today: completedToday, completed_week: completedWeek, avg_time: avgTime, avg_score: 0 });
    } catch (err: any) {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    toast.success(`Syncing ${offlineQueue.length} offline action(s)...`);
    const remaining: any[] = [];
    for (const action of offlineQueue) {
      try {
        if (action.type === 'start') {
          await housekeepingService.startTask(action.taskId);
        } else if (action.type === 'complete') {
          await housekeepingService.completeTask(action.taskId, {
            completed_at: action.completedAt,
            actual_duration: action.timeSpent,
            notes: action.notes,
            issues_found: action.issuesFound,
          });
        }
      } catch {
        remaining.push(action);
      }
    }
    setOfflineQueue(remaining);
    localStorage.setItem('cleanerOfflineQueue', JSON.stringify(remaining));
    if (remaining.length === 0) toast.success('All offline actions synced');
    else toast.error(`${remaining.length} action(s) failed to sync`);
    loadData();
  };

  const queueOfflineAction = (action: any) => {
    const q = [...offlineQueue, { ...action, timestamp: new Date().toISOString() }];
    setOfflineQueue(q);
    localStorage.setItem('cleanerOfflineQueue', JSON.stringify(q));
  };

  const getRoomNumber = (roomId: string) => rooms.find(r => r.id === roomId)?.room_number ?? roomId.substring(0, 8);
  const getRoomType   = (roomId: string) => rooms.find(r => r.id === roomId)?.type ?? '';

  const handleStartCleaning = async (taskId: string) => {
    if (!isOnline) {
      queueOfflineAction({ type: 'start', taskId });
      setRoomTimers(p => ({ ...p, [taskId]: { startTime: new Date(), elapsed: 0 } }));
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t));
      toast.success('Started (offline — will sync)');
      return;
    }
    try {
      await housekeepingService.startTask(taskId);
      setRoomTimers(p => ({ ...p, [taskId]: { startTime: new Date(), elapsed: 0 } }));
      toast.success('Task started');
      loadData();
    } catch { toast.error('Failed to start task'); }
  };

  const handleOpenCompletion = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setChecklistItems({});
    setCleanlinessScore(8);
    setMaintenanceScore(8);
    setAmenitiesScore(8);
    setIssuesFound('');
    setCompletionNotes('');
    setShowInspectionDialog(true);
  };

  const allChecked = CHECKLIST_ITEMS.every(i => checklistItems[i.id]);

  const handleInspectionComplete = async () => {
    if (!selectedTask) return;
    if (!allChecked) { toast.error('Complete all checklist items before finishing'); return; }

    const taskId = selectedTask.id;
    const timer = roomTimers[taskId];
    const timeSpent = timer ? Math.floor(timer.elapsed / 60) : 0;
    const completedAt = new Date().toISOString();
    const overallScore = Math.round((cleanlinessScore + maintenanceScore + amenitiesScore) / 3);

    if (!isOnline) {
      queueOfflineAction({ type: 'complete', taskId, timeSpent, completedAt, notes: completionNotes, issuesFound });
      setRoomTimers(p => { const u = { ...p }; delete u[taskId]; return u; });
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: 'completed' as const } : t));
      toast.success(`Room done! Time: ${timeSpent}m (will sync)`);
      setShowInspectionDialog(false);
      return;
    }

    setSubmittingCompletion(true);
    try {
      // 1. Complete the task
      await housekeepingService.completeTask(taskId, {
        completed_at: completedAt,
        actual_duration: timeSpent,
        notes: completionNotes || `Inspection complete. Score: ${overallScore}/10`,
        issues_found: issuesFound || undefined,
      });

      // 2. Save inspection record with scores and checklist
      await housekeepingService.createInspection({
        room_id: selectedTask.room_id,
        task_id: taskId,
        inspector_id: user?.id || '',
        cleanliness_score: cleanlinessScore,
        maintenance_score: maintenanceScore,
        amenities_score: amenitiesScore,
        overall_score: overallScore,
        checklist: checklistItems,
        maintenance_issues: issuesFound || undefined,
        status: issuesFound ? 'needs_attention' : overallScore >= 9 ? 'excellent' : 'passed',
        requires_follow_up: !!issuesFound,
        follow_up_notes: issuesFound || undefined,
        notes: completionNotes || undefined,
      });

      setRoomTimers(p => { const u = { ...p }; delete u[taskId]; return u; });
      toast.success(`Room ${getRoomNumber(selectedTask.room_id)} cleaned! Score: ${overallScore}/10 — Time: ${timeSpent}m`);
      setShowInspectionDialog(false);
      setSelectedTask(null);
      loadData();
    } catch (err: any) {
      toast.error('Failed to complete task');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const handleReportLostItem = async () => {
    if (!lostFoundForm.item_name.trim()) { toast.error('Item name is required'); return; }
    setSubmittingLost(true);
    try {
      await housekeepingService.createLostItem({
        item_name: lostFoundForm.item_name,
        description: lostFoundForm.description || undefined,
        room_id: lostFoundForm.room_id || undefined,
        storage_location: lostFoundForm.storage_location || undefined,
        category: lostFoundForm.category || undefined,
        found_by: user?.id,
      });
      toast.success('Item reported to lost & found');
      setLostFoundForm({ item_name: '', description: '', room_id: '', storage_location: '', category: '' });
      setShowLostFoundForm(false);
      const updated = await housekeepingService.getLostItems({ limit: 50 });
      setLostItems(updated);
    } catch { toast.error('Failed to report item'); }
    finally { setSubmittingLost(false); }
  };

  const openFlagForm = (roomId: string, taskId?: string) => {
    setFlagRoomId(roomId);
    setFlagTaskId(taskId);
    setFlagForm({ issue_type: 'other', title: '', description: '', priority: 'normal' });
    setShowFlagForm(true);
  };

  const handleReportFlag = async () => {
    if (!flagForm.title.trim()) { toast.error('Title is required'); return; }
    setSubmittingFlag(true);
    try {
      await api.post('/maintenance/flags', {
        room_id: flagRoomId,
        task_id: flagTaskId,
        issue_type: flagForm.issue_type,
        title: flagForm.title,
        description: flagForm.description || undefined,
        priority: flagForm.priority,
      });
      toast.success('Issue flagged — manager will be notified');
      setShowFlagForm(false);
      const updated = await api.get('/maintenance/flags').then(r => r.data as unknown as MaintenanceFlag[]);
      setMaintenanceFlags(updated || []);
    } catch { toast.error('Failed to report issue'); }
    finally { setSubmittingFlag(false); }
  };

  const handleLinenMovement = async () => {
    if (!linenMoveForm.linen_item_id) { toast.error('Select a linen item'); return; }
    setSubmittingLinen(true);
    try {
      await api.post('/maintenance/linen/movement', linenMoveForm);
      toast.success('Linen movement recorded');
      setShowLinenMove(false);
      setLinenMoveForm({ linen_item_id: '', room_id: '', movement_type: 'issued', quantity: 1, notes: '' });
      const updated = await api.get('/maintenance/linen').then(r => r.data as unknown as LinenItem[]);
      setLinenItems(updated || []);
    } catch { toast.error('Failed to record movement'); }
    finally { setSubmittingLinen(false); }
  };

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  const pendingTasks    = tasks.filter(t => ['pending', 'assigned'].includes(t.status));
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks  = tasks.filter(t => t.status === 'completed');
  const lowStockItems   = supplies.filter(s => s.current_stock < s.minimum_stock);

  const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <span className={`text-lg font-bold ${value >= 9 ? 'text-green-600' : value >= 7 ? 'text-blue-600' : value >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>{value}/10</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-primary" />
    </div>
  );

  const TaskCard = ({ task }: { task: HousekeepingTask }) => {
    const timer = roomTimers[task.id];
    return (
      <Card className={task.priority === 'urgent' ? 'border-red-500 border-2' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BedDouble className="h-5 w-5" />
                Room {getRoomNumber(task.room_id)}
                {task.priority === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <CardDescription className="mt-1">
                {getRoomType(task.room_id)} {task.task_type !== 'cleaning' && `• ${task.task_type.replace('_', ' ')}`}
              </CardDescription>
            </div>
            <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'}>
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {timer && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">Time Elapsed</span>
              <span className="text-2xl font-bold text-blue-600 font-mono">{formatTime(timer.elapsed)}</span>
            </div>
          )}
          <div className="space-y-1 text-sm text-muted-foreground">
            {task.scheduled_time && <p><Calendar className="inline h-3 w-3 mr-1" />Scheduled: {new Date(task.scheduled_time).toLocaleString()}</p>}
            {task.started_at && <p><Clock className="inline h-3 w-3 mr-1" />Started: {new Date(task.started_at).toLocaleString()}</p>}
            {task.actual_duration && <p><Sparkles className="inline h-3 w-3 mr-1" />Duration: {task.actual_duration} min</p>}
          </div>
          {task.notes && <div className="p-3 bg-muted rounded-md text-sm">{task.notes}</div>}
          <Separator />
          <div className="space-y-2">
            {['pending', 'assigned'].includes(task.status) && (
              <Button className="w-full h-12 text-base font-semibold" onClick={() => handleStartCleaning(task.id)}>
                <PlayCircle className="h-5 w-5 mr-2" /> Start Cleaning
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button className="w-full h-12 text-base font-semibold" onClick={() => handleOpenCompletion(task)}>
                <ListChecks className="h-5 w-5 mr-2" /> Complete & Inspect
              </Button>
            )}
            {task.status === 'completed' && (
              <Button className="w-full h-12 text-base font-semibold" variant="secondary" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Completed
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => openFlagForm(task.room_id, task.id)}
            >
              <Wrench className="h-4 w-4 mr-2" /> Flag Repair Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isAuthenticated || !['cleaner', 'housekeeping', 'admin'].includes(role || '')) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-muted-foreground">Loading your tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-16">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Housekeeping Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user?.full_name}!</p>
            </div>
          </div>
          <div className="flex gap-2">
            {offlineQueue.length > 0 && (
              <Badge variant="secondary" className="h-10 px-4 text-base">{offlineQueue.length} queued</Badge>
            )}
            {!isOnline && (
              <Badge variant="destructive" className="h-10 px-4 text-base">
                <WifiOff className="h-4 w-4 mr-2" /> Offline
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingTasks.length}</div><p className="text-xs text-muted-foreground">Tasks to do</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{inProgressTasks.length}</div><p className="text-xs text-muted-foreground">Cleaning now</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Done Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{myStats?.completed_today ?? completedTasks.length}</div><p className="text-xs text-muted-foreground">Completed</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <Package className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{lowStockItems.length}</div><p className="text-xs text-muted-foreground">Items low</p></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="assigned" className="h-10 text-xs sm:text-sm">
              Tasks ({pendingTasks.length + inProgressTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="h-10 text-xs sm:text-sm">
              Done ({completedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="h-10 text-xs sm:text-sm">
              Supplies
            </TabsTrigger>
            <TabsTrigger value="linen" className="h-10 text-xs sm:text-sm">
              Linen
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="h-10 text-xs sm:text-sm">
              Issues {maintenanceFlags.filter(f => f.status === 'open').length > 0 && `(${maintenanceFlags.filter(f => f.status === 'open').length})`}
            </TabsTrigger>
            <TabsTrigger value="lost-found" className="h-10 text-xs sm:text-sm">
              Lost & Found
            </TabsTrigger>
            <TabsTrigger value="performance" className="h-10 text-xs sm:text-sm">
              My Stats
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="assigned" className="space-y-6">
            {pendingTasks.length === 0 && inProgressTasks.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No tasks assigned right now</p>
              </CardContent></Card>
            ) : (
              <>
                {inProgressTasks.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" />In Progress ({inProgressTasks.length})</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{inProgressTasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
                  </div>
                )}
                {pendingTasks.filter(t => t.priority === 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Urgent ({pendingTasks.filter(t => t.priority === 'urgent').length})</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pendingTasks.filter(t => t.priority === 'urgent').map(t => <TaskCard key={t.id} task={t} />)}</div>
                  </div>
                )}
                {pendingTasks.filter(t => t.priority !== 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BedDouble className="h-5 w-5" />Pending ({pendingTasks.filter(t => t.priority !== 'urgent').length})</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pendingTasks.filter(t => t.priority !== 'urgent').map(t => <TaskCard key={t.id} task={t} />)}</div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-6">
            {completedTasks.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No completed tasks yet</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{completedTasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
            )}
          </TabsContent>

          {/* Supplies Tab */}
          <TabsContent value="inventory" className="space-y-6">
            {lowStockItems.length > 0 && (
              <Card className="border-orange-500 border-2 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700"><AlertTriangle className="h-5 w-5" />Low Stock Alert</CardTitle>
                  <CardDescription className="text-orange-600">{lowStockItems.length} item(s) below minimum</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-md">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <p className="text-sm text-muted-foreground">Current: {item.current_stock} {item.unit} (min: {item.minimum_stock})</p>
                        </div>
                        <Badge variant="destructive">Low</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>All Supplies</CardTitle>
                <CardDescription>Current stock levels of cleaning supplies</CardDescription>
              </CardHeader>
              <CardContent>
                {supplies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No supplies tracked</p></div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {supplies.map(item => (
                      <div key={item.id} className={`p-4 rounded-lg border ${item.current_stock < item.minimum_stock ? 'bg-orange-50 border-orange-200' : 'bg-muted'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          {item.current_stock < item.minimum_stock && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{item.current_stock}</span>
                          <span className="text-muted-foreground">{item.unit}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Min: {item.minimum_stock} {item.unit}</p>
                        {item.storage_location && <p className="text-xs text-muted-foreground mt-1">Location: {item.storage_location}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Linen Inventory Tab */}
          <TabsContent value="linen" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Linen & Room Inventory</h2>
                <p className="text-sm text-muted-foreground">Track towels, sheets, pillows and more</p>
              </div>
              <Button onClick={() => setShowLinenMove(true)}>
                <Plus className="h-4 w-4 mr-2" /> Log Movement
              </Button>
            </div>

            {linenItems.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No linen items tracked yet</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {linenItems.map(item => {
                  const isLow = item.available_quantity <= item.reorder_level;
                  return (
                    <Card key={item.id} className={isLow ? 'border-orange-400 border-2' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{item.item_name}</CardTitle>
                          <Badge variant="outline" className="capitalize">{item.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="text-xl font-bold text-green-700">{item.available_quantity}</p>
                            <p className="text-xs text-muted-foreground">Available</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="text-xl font-bold text-blue-700">{item.in_use_quantity}</p>
                            <p className="text-xs text-muted-foreground">In Use</p>
                          </div>
                          <div className="text-center p-2 bg-yellow-50 rounded">
                            <p className="text-xl font-bold text-yellow-700">{item.in_laundry_quantity}</p>
                            <p className="text-xs text-muted-foreground">Laundry</p>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <p className="text-xl font-bold text-red-700">{item.damaged_quantity}</p>
                            <p className="text-xs text-muted-foreground">Damaged</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>Total: {item.total_quantity} {item.unit}</span>
                          <span>Min: {item.reorder_level}</span>
                        </div>
                        {isLow && (
                          <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" /> Low stock — notify manager
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Maintenance Issues Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Maintenance Issues</h2>
                <p className="text-sm text-muted-foreground">Room repairs and issues you've reported</p>
              </div>
              <Button variant="destructive" onClick={() => { setFlagRoomId(''); setFlagTaskId(undefined); setFlagForm({ issue_type: 'other', title: '', description: '', priority: 'normal' }); setShowFlagForm(true); }}>
                <Wrench className="h-4 w-4 mr-2" /> Report Issue
              </Button>
            </div>

            {maintenanceFlags.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No issues reported</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {maintenanceFlags.map(flag => (
                  <Card key={flag.id} className={flag.priority === 'urgent' ? 'border-red-500 border-2' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{flag.title}</CardTitle>
                        <div className="flex gap-1">
                          <Badge variant={flag.status === 'open' ? 'destructive' : flag.status === 'resolved' ? 'secondary' : 'default'}>
                            {flag.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{flag.priority}</Badge>
                        </div>
                      </div>
                      <CardDescription className="capitalize">{flag.issue_type.replace('_', ' ')} — Room {getRoomNumber(flag.room_id)}</CardDescription>
                    </CardHeader>
                    {flag.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(flag.created_at).toLocaleDateString()}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lost & Found Tab */}
          <TabsContent value="lost-found" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Lost & Found</h2>
                <p className="text-sm text-muted-foreground">Report items found in rooms</p>
              </div>
              <Button onClick={() => setShowLostFoundForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Report Item
              </Button>
            </div>

            {lostItems.length === 0 ? (
              <Card><CardContent className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No lost & found items reported</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {lostItems.map(item => (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{item.item_name}</CardTitle>
                        <Badge variant={item.status === 'unclaimed' ? 'default' : item.status === 'claimed' ? 'secondary' : 'outline'}>
                          {item.status}
                        </Badge>
                      </div>
                      {item.category && <CardDescription>{item.category}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {item.description && <p>{item.description}</p>}
                      {item.room_id && <p>Room: {getRoomNumber(item.room_id)}</p>}
                      {item.storage_location && <p>Stored: {item.storage_location}</p>}
                      <p>Reported: {new Date(item.found_date || item.created_at).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />My Performance</CardTitle>
                <CardDescription>Your personal housekeeping statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{myStats?.completed_today ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Done Today</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{myStats?.completed_week ?? 0}</p>
                    <p className="text-sm text-muted-foreground">This Week</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{myStats?.avg_time ?? 0}m</p>
                    <p className="text-sm text-muted-foreground">Avg Time</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">{pendingTasks.length + inProgressTasks.length}</p>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Recent Completions</CardTitle>
              </CardHeader>
              <CardContent>
                {completedTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No completed tasks yet today</p>
                ) : (
                  <div className="space-y-3">
                    {completedTasks.slice(0, 10).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Room {getRoomNumber(t.room_id)}</p>
                          <p className="text-xs text-muted-foreground">{t.task_type.replace('_', ' ')} • {t.actual_duration ? `${t.actual_duration}m` : 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{t.priority}</Badge>
                          {t.completed_at && <p className="text-xs text-muted-foreground mt-1">{new Date(t.completed_at).toLocaleTimeString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Inspection Dialog */}
      <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Room {selectedTask ? getRoomNumber(selectedTask.room_id) : ''} — Inspection
            </DialogTitle>
            <DialogDescription>Complete all items and rate the room before finishing</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Checklist */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><ListChecks className="h-4 w-4" />Cleaning Checklist</h3>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.map(item => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted">
                    <Checkbox
                      id={item.id}
                      checked={checklistItems[item.id] || false}
                      onCheckedChange={v => setChecklistItems(p => ({ ...p, [item.id]: v as boolean }))}
                      className="mt-1"
                    />
                    <label htmlFor={item.id} className="text-sm font-medium cursor-pointer flex-1">{item.label}</label>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Progress: </span>
                <span className="font-bold">{Object.values(checklistItems).filter(Boolean).length} / {CHECKLIST_ITEMS.length}</span>
              </div>
            </div>

            <Separator />

            {/* Scores */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Star className="h-4 w-4" />Quality Scores</h3>
              <div className="space-y-4">
                <ScoreSlider label="Cleanliness" value={cleanlinessScore} onChange={setCleanlinessScore} />
                <ScoreSlider label="Maintenance" value={maintenanceScore} onChange={setMaintenanceScore} />
                <ScoreSlider label="Amenities" value={amenitiesScore} onChange={setAmenitiesScore} />
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className={`text-3xl font-bold ${Math.round((cleanlinessScore + maintenanceScore + amenitiesScore) / 3) >= 9 ? 'text-green-600' : 'text-blue-600'}`}>
                    {Math.round((cleanlinessScore + maintenanceScore + amenitiesScore) / 3)}/10
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Issues */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Issues Found (optional)</h3>
              <Textarea
                placeholder="Describe any maintenance issues, damage, or missing items..."
                value={issuesFound}
                onChange={e => setIssuesFound(e.target.value)}
                rows={3}
              />
            </div>

            {/* Notes */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Notes (optional)</h3>
              <Textarea
                placeholder="Any additional notes..."
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Timer summary */}
            {selectedTask && roomTimers[selectedTask.id] && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
                <p className="text-sm text-blue-700">Time spent: <span className="font-bold font-mono">{formatTime(roomTimers[selectedTask.id].elapsed)}</span></p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInspectionDialog(false)} className="h-12">Cancel</Button>
            <Button
              onClick={handleInspectionComplete}
              className="h-12 font-semibold"
              disabled={!allChecked || submittingCompletion}
            >
              {submittingCompletion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Complete Cleaning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Repair Issue Dialog */}
      <Dialog open={showFlagForm} onOpenChange={setShowFlagForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Wrench className="h-5 w-5" />Report Maintenance Issue</DialogTitle>
            <DialogDescription>Flag a repair or maintenance issue for the manager to action</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={flagForm.issue_type} onValueChange={v => setFlagForm(p => ({ ...p, issue_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="furniture">Furniture / Fittings</SelectItem>
                  <SelectItem value="hvac">AC / Heating</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="structural">Structural / Wall / Ceiling</SelectItem>
                  <SelectItem value="cleanliness">Cleanliness Issue</SelectItem>
                  <SelectItem value="linen">Linen / Bedding</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!flagRoomId && (
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={flagRoomId} onValueChange={setFlagRoomId}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input placeholder="e.g. Leaking tap in bathroom" value={flagForm.title}
                onChange={e => setFlagForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={flagForm.priority} onValueChange={v => setFlagForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the issue in detail..." value={flagForm.description}
                onChange={e => setFlagForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagForm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReportFlag} disabled={submittingFlag}>
              {submittingFlag && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Report Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linen Movement Dialog */}
      <Dialog open={showLinenMove} onOpenChange={setShowLinenMove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Linen Movement</DialogTitle>
            <DialogDescription>Record issuing, returning, or sending linen to laundry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Linen Item *</Label>
              <Select value={linenMoveForm.linen_item_id} onValueChange={v => setLinenMoveForm(p => ({ ...p, linen_item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {linenItems.map(i => <SelectItem key={i.id} value={i.id}>{i.item_name} (avail: {i.available_quantity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={linenMoveForm.movement_type} onValueChange={v => setLinenMoveForm(p => ({ ...p, movement_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued">Issued to Room</SelectItem>
                  <SelectItem value="returned">Returned from Room</SelectItem>
                  <SelectItem value="sent_to_laundry">Sent to Laundry</SelectItem>
                  <SelectItem value="returned_from_laundry">Returned from Laundry</SelectItem>
                  <SelectItem value="damaged">Marked Damaged</SelectItem>
                  <SelectItem value="disposed">Disposed / Written Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={linenMoveForm.room_id} onValueChange={v => setLinenMoveForm(p => ({ ...p, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific room</SelectItem>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={linenMoveForm.quantity}
                onChange={e => setLinenMoveForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={linenMoveForm.notes}
                onChange={e => setLinenMoveForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinenMove(false)}>Cancel</Button>
            <Button onClick={handleLinenMovement} disabled={submittingLinen}>
              {submittingLinen && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Movement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost & Found Dialog */}
      <Dialog open={showLostFoundForm} onOpenChange={setShowLostFoundForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Lost & Found Item</DialogTitle>
            <DialogDescription>Record an item found in a guest room</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input placeholder="e.g. Laptop charger, Watch, Book"
                value={lostFoundForm.item_name}
                onChange={e => setLostFoundForm(p => ({ ...p, item_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={lostFoundForm.category} onValueChange={v => setLostFoundForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="valuables">Valuables</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room Found In</Label>
              <Select value={lostFoundForm.room_id} onValueChange={v => setLostFoundForm(p => ({ ...p, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the item..." value={lostFoundForm.description}
                onChange={e => setLostFoundForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input placeholder="e.g. Housekeeping office, Safe" value={lostFoundForm.storage_location}
                onChange={e => setLostFoundForm(p => ({ ...p, storage_location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostFoundForm(false)}>Cancel</Button>
            <Button onClick={handleReportLostItem} disabled={submittingLost}>
              {submittingLost && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Report Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
