/**
 * AuditLogViewer Component
 * Displays user audit log with filtering and details
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, User, Calendar, MapPin, Search } from 'lucide-react';
import { adminAPI, type AuditLogEntry } from '@/lib/api/admin-enhanced';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface AuditLogViewerProps {
  userId?: string;
  userFullName?: string;
}

export function AuditLogViewer({ userId, userFullName }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let data: AuditLogEntry[];
      if (userId) {
        data = await adminAPI.getUserAuditLog(userId, 100);
      } else {
        data = await adminAPI.getAllAuditLogs(100);
      }
      setLogs(data);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'bg-green-100 text-green-800 border-green-300';
    if (actionLower.includes('update') || actionLower.includes('edit'))
      return 'bg-blue-100 text-blue-800 border-blue-300';
    if (actionLower.includes('delete')) return 'bg-red-100 text-red-800 border-red-300';
    if (actionLower.includes('deactivate') || actionLower.includes('terminate'))
      return 'bg-orange-100 text-orange-800 border-orange-300';
    if (actionLower.includes('reactivate')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (actionLower.includes('login')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDetails = (details: any) => {
    if (!details) return 'N/A';
    if (typeof details === 'string') return details;

    const entries = Object.entries(details);
    if (entries.length === 0) return 'N/A';

    return (
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="text-xs">
            <span className="font-medium">{key}:</span>{' '}
            <span className="text-gray-600">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter);
    const matchesSearch =
      !searchTerm ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAction && matchesSearch;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Audit Log
          {userFullName && (
            <Badge variant="outline" className="ml-2">
              {userFullName}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {userId
            ? 'Complete history of all actions performed on this user account'
            : 'Complete history of all user management actions in the system'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by action, email, or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="deactivate">Deactivate</SelectItem>
              <SelectItem value="reactivate">Reactivate</SelectItem>
              <SelectItem value="login">Login</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadLogs} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No audit log entries found</p>
            {(actionFilter !== 'all' || searchTerm) && (
              <Button
                variant="link"
                onClick={() => {
                  setActionFilter('all');
                  setSearchTerm('');
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Audit Log Table */}
        {!loading && filteredLogs.length > 0 && (
          <div className="border rounded-lg">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[140px]">Timestamp</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[130px]">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <div>
                            <div>{format(new Date(log.created_at), 'MMM dd, yyyy')}</div>
                            <div className="text-gray-500">
                              {format(new Date(log.created_at), 'HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div className="font-medium">{log.performed_by_name || 'Unknown'}</div>
                            <div className="text-gray-500 text-xs">{log.performed_by_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-md">{formatDetails(log.details)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {log.ip_address || 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredLogs.length > 0 && (
          <div className="mt-3 text-sm text-gray-500 text-center">
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
        )}
      </CardContent>
    </Card>
  );
}
