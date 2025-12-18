import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BedDouble,
  TrendingUp,
  ClipboardCheck,
  Wrench
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const mockRooms = [
  {
    id: 'R-101',
    number: '101',
    floor: '1',
    type: 'Standard Room',
    status: 'pending',
    priority: 'urgent',
    lastCleaned: null,
    checkoutTime: new Date(Date.now() - 30 * 60 * 1000),
    nextCheckin: new Date(Date.now() + 2 * 60 * 60 * 1000),
    notes: 'Guest checked out 30 mins ago. New guest arriving in 2 hours.'
  },
  {
    id: 'R-205',
    number: '205',
    floor: '2',
    type: 'Deluxe Suite',
    status: 'in-progress',
    priority: 'high',
    lastCleaned: null,
    assignedTo: 'Sarah',
    startedAt: new Date(Date.now() - 15 * 60 * 1000),
    notes: 'Deep cleaning required'
  },
  {
    id: 'R-301',
    number: '301',
    floor: '3',
    type: 'Executive Suite',
    status: 'pending',
    priority: 'medium',
    lastCleaned: new Date(Date.now() - 24 * 60 * 60 * 1000),
    notes: 'Daily turnover - guest staying'
  },
  {
    id: 'R-102',
    number: '102',
    floor: '1',
    type: 'Standard Room',
    status: 'completed',
    priority: 'low',
    lastCleaned: new Date(Date.now() - 45 * 60 * 1000),
    cleanedBy: 'Sarah',
    notes: null
  }
];

const mockMaintenanceIssues = [
  {
    id: 'M-001',
    room: '203',
    issue: 'Leaking faucet in bathroom',
    priority: 'high',
    reportedAt: new Date(Date.now() - 60 * 60 * 1000),
    status: 'pending'
  },
  {
    id: 'M-002',
    room: '305',
    issue: 'Air conditioning not cooling properly',
    priority: 'medium',
    reportedAt: new Date(Date.now() - 120 * 60 * 1000),
    status: 'in-progress'
  }
];

export default function CleanerDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const [rooms, setRooms] = useState(mockRooms);
  const [activeTab, setActiveTab] = useState('assigned');

  useEffect(() => {
    if (!isAuthenticated || (role !== 'cleaner' && role !== 'admin')) {
      toast.error('Access denied. Cleaner privileges required.');
      navigate('/unauthorized');
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'cleaner' && role !== 'admin')) {
    return null;
  }

  const handleStartCleaning = (roomId) => {
    setRooms(rooms.map(room =>
      room.id === roomId
        ? { ...room, status: 'in-progress', assignedTo: user.firstName, startedAt: new Date() }
        : room
    ));
    toast.success(`Started cleaning room ${rooms.find(r => r.id === roomId).number}`);
  };

  const handleCompleteCleaning = (roomId) => {
    setRooms(rooms.map(room =>
      room.id === roomId
        ? { ...room, status: 'completed', lastCleaned: new Date(), cleanedBy: user.firstName }
        : room
    ));
    toast.success(`Room ${rooms.find(r => r.id === roomId).number} marked as clean!`);
  };

  const getTimeSince = (date) => {
    if (!date) return 'Never';
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };

  const getTimeUntil = (date) => {
    if (!date) return '';
    const minutes = Math.floor((date.getTime() - Date.now()) / 60000);
    if (minutes < 0) return 'Overdue';
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const pendingRooms = rooms.filter(r => r.status === 'pending');
  const inProgressRooms = rooms.filter(r => r.status === 'in-progress');
  const completedRooms = rooms.filter(r => r.status === 'completed');

  const RoomCard = ({ room }) => (
    <Card className={`${room.priority === 'urgent' ? 'border-red-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Room {room.number}
              {room.priority === 'urgent' && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>
              {room.type} • Floor {room.floor}
            </CardDescription>
          </div>
          <Badge variant={
            room.priority === 'urgent' ? 'destructive' :
            room.priority === 'high' ? 'default' :
            'secondary'
          }>
            {room.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="space-y-2 text-sm">
          {room.checkoutTime && (
            <p className="text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Checkout: {getTimeSince(room.checkoutTime)}
            </p>
          )}
          {room.nextCheckin && (
            <p className="text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Next check-in: {getTimeUntil(room.nextCheckin)}
            </p>
          )}
          {room.lastCleaned && (
            <p className="text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-1" />
              Last cleaned: {getTimeSince(room.lastCleaned)}
            </p>
          )}
          {room.startedAt && (
            <p className="text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Started: {getTimeSince(room.startedAt)}
            </p>
          )}
          {room.assignedTo && (
            <p className="text-muted-foreground">
              Assigned to: {room.assignedTo}
            </p>
          )}
        </div>

        {room.notes && (
          <>
            <Separator />
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">{room.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          {room.status === 'pending' && (
            <Button
              className="flex-1"
              onClick={() => handleStartCleaning(room.id)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Cleaning
            </Button>
          )}
          {room.status === 'in-progress' && (
            <Button
              className="flex-1"
              onClick={() => handleCompleteCleaning(room.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          {room.status === 'completed' && (
            <Button
              className="flex-1"
              variant="secondary"
              disabled
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Cleaner Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user?.firstName}!</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRooms.length}</div>
              <p className="text-xs text-muted-foreground">Rooms to clean</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressRooms.length}</div>
              <p className="text-xs text-muted-foreground">Currently cleaning</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRooms.length}</div>
              <p className="text-xs text-muted-foreground">Rooms cleaned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Issues</CardTitle>
              <Wrench className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockMaintenanceIssues.length}</div>
              <p className="text-xs text-muted-foreground">Reported issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assigned">
              Assigned ({pendingRooms.length + inProgressRooms.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedRooms.length})
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance
            </TabsTrigger>
          </TabsList>

          {/* Assigned Tab */}
          <TabsContent value="assigned" className="space-y-6">
            {pendingRooms.length === 0 && inProgressRooms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No rooms need cleaning right now</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {pendingRooms.filter(r => r.priority === 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Urgent ({pendingRooms.filter(r => r.priority === 'urgent').length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingRooms.filter(r => r.priority === 'urgent').map(room => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  </div>
                )}

                {inProgressRooms.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      In Progress ({inProgressRooms.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {inProgressRooms.map(room => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  </div>
                )}

                {pendingRooms.filter(r => r.priority !== 'urgent').length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <BedDouble className="h-5 w-5" />
                      Pending ({pendingRooms.filter(r => r.priority !== 'urgent').length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {pendingRooms.filter(r => r.priority !== 'urgent').map(room => (
                        <RoomCard key={room.id} room={room} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-6">
            {completedRooms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Rooms Yet</h3>
                  <p className="text-muted-foreground">Completed rooms will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedRooms.map(room => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Maintenance Issue</CardTitle>
                <CardDescription>Found a problem? Report it to maintenance team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g., 305"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue Description</label>
                  <Textarea placeholder="Describe the maintenance issue..." />
                </div>
                <Button>
                  <Wrench className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reported Issues</CardTitle>
                <CardDescription>Track maintenance requests you've reported</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMaintenanceIssues.map(issue => (
                    <div key={issue.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-semibold">Room {issue.room}</p>
                        <p className="text-sm text-muted-foreground">{issue.issue}</p>
                        <p className="text-xs text-muted-foreground">
                          Reported {getTimeSince(issue.reportedAt)}
                        </p>
                      </div>
                      <Badge variant={
                        issue.status === 'pending' ? 'default' :
                        issue.status === 'in-progress' ? 'secondary' :
                        'outline'
                      }>
                        {issue.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
