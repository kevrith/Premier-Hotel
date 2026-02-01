import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Clock,
  Calendar,
  TrendingUp,
  Users,
  Shield,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: 'waiter' | 'chef' | 'cleaner' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  last_login_at?: string;
  created_at: string;
  performance_score?: number;
  tasks_completed?: number;
  department?: string;
}

export function EnhancedUserManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    loadStaffData();
  }, [roleFilter, statusFilter]);

  const loadStaffData = async () => {
    setIsLoading(true);
    try {
      // Fetch real staff data from backend
      const response = await fetch('/api/v1/staff/management');
      
      if (!response.ok) {
        throw new Error('Failed to fetch staff data');
      }

      const staffData = await response.json();
      setStaff(staffData);
      } catch (error: any) {
      console.error('Error loading staff data:', error);
      toast.error('Failed to load staff data');
      
      // Fallback to localStorage data if API is not available
      const cachedStaff = localStorage.getItem('staff_management_data');
      
      if (cachedStaff) {
        try {
          setStaff(JSON.parse(cachedStaff));
          toast.success('Using cached staff data');
        } catch (parseError) {
          console.error('Failed to parse cached staff data:', parseError);
          toast.error('Cached staff data is corrupted');
        }
      } else {
        toast.error('No cached staff data available');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (staffId: string, newRole: string) => {
    try {
      setStaff(prev => prev.map(staff => 
        staff.id === staffId ? { ...staff, role: newRole as any } : staff
      ));
      toast.success('Role updated successfully');
    } catch (error: any) {
      toast.error('Failed to update role');
    }
  };

  const handleStatusChange = async (staffId: string, newStatus: string) => {
    try {
      setStaff(prev => prev.map(staff => 
        staff.id === staffId ? { ...staff, status: newStatus as any } : staff
      ));
      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDeactivate = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    handleStatusChange(staffMember.id, 'inactive');
  };

  const handleReactivate = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    handleStatusChange(staffMember.id, 'active');
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phone_number.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      manager: 'default',
      waiter: 'secondary',
      chef: 'secondary',
      cleaner: 'secondary'
    };
    return variants[role] || 'outline';
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive'
    };
    return variants[status] || 'outline';
  };

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case 'Front of House': return <Users className="h-4 w-4" />;
      case 'Kitchen': return <Activity className="h-4 w-4" />;
      case 'Housekeeping': return <Shield className="h-4 w-4" />;
      case 'Management': return <TrendingUp className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enhanced Staff Management
              </CardTitle>
              <CardDescription>
                Manage staff roles, monitor performance, and track user activity
              </CardDescription>
            </div>
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="directory" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="directory">Staff Directory</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Staff Directory Tab */}
            <TabsContent value="directory" className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="cleaner">Cleaner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading staff data...</p>
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No staff members found</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(member.status)}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDepartmentIcon(member.department || '')}
                              <span className="text-sm">{member.department || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${member.performance_score || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{member.performance_score || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {member.last_login_at
                                ? format(new Date(member.last_login_at), 'MMM dd, yyyy HH:mm')
                                : 'Never'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => handleRoleChange(member.id, newRole)}
                              >
                                <SelectTrigger className="w-[120px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="waiter">Waiter</SelectItem>
                                  <SelectItem value="chef">Chef</SelectItem>
                                  <SelectItem value="cleaner">Cleaner</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {member.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeactivate(member)}
                                  className="text-orange-600 border-orange-600"
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReactivate(member)}
                                  className="text-green-600 border-green-600"
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Reactivate
                                </Button>
                              )}
                              
                              <Button size="sm" variant="ghost">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Staff Performance Overview</CardTitle>
                  <CardDescription>
                    Monitor staff performance metrics and productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredStaff.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {member.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold">{member.full_name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{member.role} • {member.department}</div>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-green-600 font-medium">
                                {member.performance_score || 0}% Performance
                              </span>
                              <span className="text-blue-600">
                                {member.tasks_completed || 0} Tasks Completed
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Last Active</div>
                          <div className="font-medium">
                            {member.last_login_at
                              ? format(new Date(member.last_login_at), 'MMM dd, HH:mm')
                              : 'Never'}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                              {member.status}
                            </Badge>
                            <Badge variant="outline">
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Staff Activity Log</CardTitle>
                  <CardDescription>
                    Recent activity and system interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredStaff.map((member) => (
                      <div key={member.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                              {member.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              <div className="text-sm text-muted-foreground">{member.role}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Last Login</div>
                            <div className="font-medium">
                              {member.last_login_at
                                ? format(new Date(member.last_login_at), 'MMM dd, yyyy HH:mm')
                                : 'Never'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>Tasks Completed: {member.tasks_completed || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-500" />
                            <span>Member Since: {format(new Date(member.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                            <span>Performance Score: {member.performance_score || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}