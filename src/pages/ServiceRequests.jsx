/**
 * Service Requests Page
 * Allows guests to request services and track their status
 * Staff can view, assign, and manage service requests
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MapPin,
  Calendar,
  MessageSquare,
  Star,
  FileText,
  Wrench,
  Sparkles,
  UtensilsCrossed,
  Car,
  Waves,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  serviceRequestsService,
  serviceRequestTypesService,
  getStatusColor,
  getPriorityColor,
  getCategoryColor,
  formatCategory,
  formatPriority,
  formatStatus,
  canGuestCancel,
  canStaffStart,
  canStaffComplete,
  canSubmitFeedback,
} from '@/lib/api/service-requests';

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
  });

  // Form states
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'normal',
    location: '',
    special_instructions: '',
    request_type_id: '',
  });
  const [feedback, setFeedback] = useState({
    guest_feedback: '',
    rating: 5,
  });

  // Get user from auth store (adjust based on your auth implementation)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user?.user_metadata?.role || 'customer';

  useEffect(() => {
    loadData();
  }, [filters, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load request types
      const types = await serviceRequestTypesService.getAll({ is_active: true });
      setRequestTypes(types);

      // Load requests based on tab
      let requestFilters = { ...filters };
      if (activeTab === 'my-requests') {
        const myRequests = await serviceRequestsService.getMyRequests({ limit: 100 });
        setRequests(myRequests);
      } else if (activeTab === 'urgent') {
        requestFilters.is_urgent = true;
        const data = await serviceRequestsService.getAll(requestFilters);
        setRequests(data);
      } else if (activeTab === 'assigned') {
        requestFilters.assigned_to = user.id;
        const data = await serviceRequestsService.getAll(requestFilters);
        setRequests(data);
      } else {
        const data = await serviceRequestsService.getAll(requestFilters);
        setRequests(data);
      }

      // Load stats (for staff/admin)
      if (['admin', 'manager', 'staff'].includes(userRole)) {
        const statsData = await serviceRequestsService.getStats();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const requestData = {
        ...newRequest,
        guest_id: user.id,
      };
      await serviceRequestsService.create(requestData);
      toast.success('Service request created successfully');
      setShowCreateDialog(false);
      setNewRequest({
        title: '',
        description: '',
        category: '',
        priority: 'normal',
        location: '',
        special_instructions: '',
        request_type_id: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create service request');
    }
  };

  const handleSelectRequestType = (typeId) => {
    const type = requestTypes.find((t) => t.id === typeId);
    if (type) {
      setNewRequest({
        ...newRequest,
        request_type_id: typeId,
        title: type.name,
        category: type.category,
        description: type.description || '',
        estimated_duration: type.estimated_time,
      });
    }
  };

  const handleStartRequest = async (requestId) => {
    try {
      await serviceRequestsService.start(requestId);
      toast.success('Request started');
      loadData();
    } catch (error) {
      console.error('Error starting request:', error);
      toast.error('Failed to start request');
    }
  };

  const handleCompleteRequest = async (requestId) => {
    try {
      await serviceRequestsService.complete(requestId, {
        completed_at: new Date().toISOString(),
      });
      toast.success('Request completed');
      loadData();
    } catch (error) {
      console.error('Error completing request:', error);
      toast.error('Failed to complete request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await serviceRequestsService.cancel(requestId);
      toast.success('Request cancelled');
      loadData();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await serviceRequestsService.submitFeedback(selectedRequest.id, feedback);
      toast.success('Feedback submitted successfully');
      setShowFeedbackDialog(false);
      setFeedback({ guest_feedback: '', rating: 5 });
      loadData();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      room_service: UtensilsCrossed,
      housekeeping: Sparkles,
      maintenance: Wrench,
      concierge: Car,
      amenities: Waves,
      other: HelpCircle,
    };
    return icons[category] || HelpCircle;
  };

  const filteredRequests = requests.filter((request) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.request_number.toLowerCase().includes(query) ||
        request.title.toLowerCase().includes(query) ||
        request.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const StatCard = ({ title, value, icon: Icon, subtitle, color }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground mt-1">
            {userRole === 'customer'
              ? 'Request services and track your requests'
              : 'Manage and fulfill guest service requests'}
          </p>
        </div>
        {userRole === 'customer' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Service Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <Label htmlFor="request_type">Request Type</Label>
                  <Select
                    value={newRequest.request_type_id}
                    onValueChange={handleSelectRequestType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a request type" />
                    </SelectTrigger>
                    <SelectContent>
                      {requestTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {formatCategory(type.category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newRequest.priority}
                      onValueChange={(value) => setNewRequest({ ...newRequest, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newRequest.location}
                      onChange={(e) => setNewRequest({ ...newRequest, location: e.target.value })}
                      placeholder="e.g., Room 101, Lobby"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea
                    id="special_instructions"
                    value={newRequest.special_instructions}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, special_instructions: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Request</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Statistics (for staff/admin) */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Requests"
            value={stats.total_requests}
            icon={FileText}
            color="text-blue-600"
          />
          <StatCard
            title="Pending"
            value={stats.pending_requests}
            icon={Clock}
            subtitle={`${stats.in_progress_requests} in progress`}
            color="text-yellow-600"
          />
          <StatCard
            title="Completed"
            value={stats.completed_requests}
            icon={CheckCircle}
            subtitle={`${stats.completion_rate.toFixed(1)}% completion rate`}
            color="text-green-600"
          />
          <StatCard
            title="Urgent"
            value={stats.urgent_requests}
            icon={AlertCircle}
            color="text-red-600"
          />
        </div>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by request number, title, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="concierge">Concierge</SelectItem>
                <SelectItem value="amenities">Amenities</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          {userRole === 'customer' && <TabsTrigger value="my-requests">My Requests</TabsTrigger>}
          {['admin', 'manager', 'staff'].includes(userRole) && (
            <>
              <TabsTrigger value="urgent">Urgent</TabsTrigger>
              <TabsTrigger value="assigned">My Assigned</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading service requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No service requests found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map((request) => {
                const CategoryIcon = getCategoryIcon(request.category);
                return (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <CategoryIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{request.title}</h3>
                                <Badge className={getPriorityColor(request.priority)}>
                                  {formatPriority(request.priority)}
                                </Badge>
                                <Badge className={getStatusColor(request.status)}>
                                  {formatStatus(request.status)}
                                </Badge>
                                {request.is_urgent && (
                                  <Badge className="bg-red-100 text-red-700 border-red-200">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Request #{request.request_number}
                              </p>
                              {request.description && (
                                <p className="text-sm mb-2">{request.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CategoryIcon className="h-4 w-4" />
                                  {formatCategory(request.category)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(request.requested_at).toLocaleDateString()}
                                </span>
                                {request.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {request.location}
                                  </span>
                                )}
                                {request.rating && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    {request.rating}/5
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Guest actions */}
                          {userRole === 'customer' && (
                            <>
                              {canGuestCancel(request) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelRequest(request.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                              {canSubmitFeedback(request) && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowFeedbackDialog(true);
                                  }}
                                >
                                  <Star className="h-4 w-4 mr-1" />
                                  Rate
                                </Button>
                              )}
                            </>
                          )}

                          {/* Staff actions */}
                          {['admin', 'manager', 'staff'].includes(userRole) && (
                            <>
                              {canStaffStart(request) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartRequest(request.id)}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  Start
                                </Button>
                              )}
                              {canStaffComplete(request) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteRequest(request.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              )}
                            </>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Service Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFeedback({ ...feedback, rating })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        rating <= feedback.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback.guest_feedback}
                onChange={(e) => setFeedback({ ...feedback, guest_feedback: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Feedback</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceRequests;
