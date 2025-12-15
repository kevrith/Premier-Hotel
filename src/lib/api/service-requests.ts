/**
 * Service Requests API Client
 * TypeScript client for service request operations
 */

import api from './axios';

// =====================================================
// Types and Interfaces
// =====================================================

export interface ServiceRequestType {
  id: string;
  name: string;
  description?: string;
  category: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'amenities' | 'other';
  icon?: string;
  estimated_time?: number;
  requires_staff: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: string;
  request_number: string;
  guest_id: string;
  booking_id?: string;
  room_id?: string;
  request_type_id?: string;
  title: string;
  description?: string;
  category: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'amenities' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  assigned_to?: string;
  assigned_at?: string;
  assigned_by?: string;
  requested_at: string;
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
  location?: string;
  special_instructions?: string;
  items_requested?: Record<string, any>;
  resolution_notes?: string;
  staff_notes?: string;
  guest_feedback?: string;
  rating?: number;
  is_urgent: boolean;
  is_recurring: boolean;
  recurrence_pattern?: Record<string, any>;
  parent_request_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestStatusHistory {
  id: string;
  request_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  notes?: string;
  changed_at: string;
}

export interface ServiceRequestAttachment {
  id: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  description?: string;
  created_at: string;
}

export interface ServiceRequestComment {
  id: string;
  request_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestStats {
  total_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  cancelled_requests: number;
  urgent_requests: number;
  average_completion_time?: number;
  average_rating?: number;
  requests_by_category: Record<string, number>;
  requests_by_priority: Record<string, number>;
  completion_rate: number;
}

// Create/Update interfaces
export interface ServiceRequestTypeCreate {
  name: string;
  description?: string;
  category: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'amenities' | 'other';
  icon?: string;
  estimated_time?: number;
  requires_staff?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export interface ServiceRequestCreate {
  guest_id: string;
  booking_id?: string;
  room_id?: string;
  request_type_id?: string;
  title: string;
  description?: string;
  category: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'amenities' | 'other';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  location?: string;
  special_instructions?: string;
  items_requested?: Record<string, any>;
  scheduled_time?: string;
  estimated_duration?: number;
  is_urgent?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: Record<string, any>;
}

export interface ServiceRequestUpdate {
  title?: string;
  description?: string;
  category?: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'amenities' | 'other';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  location?: string;
  special_instructions?: string;
  items_requested?: Record<string, any>;
  scheduled_time?: string;
  estimated_duration?: number;
  is_urgent?: boolean;
}

export interface ServiceRequestAssign {
  assigned_to: string;
  assigned_by?: string;
  assigned_at?: string;
}

export interface ServiceRequestComplete {
  completed_at?: string;
  actual_duration?: number;
  resolution_notes?: string;
  staff_notes?: string;
}

export interface ServiceRequestFeedback {
  guest_feedback: string;
  rating: number;
}

export interface ServiceRequestAttachmentCreate {
  request_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  description?: string;
}

export interface ServiceRequestCommentCreate {
  request_id: string;
  user_id: string;
  comment: string;
  is_internal?: boolean;
}

// Query parameters
export interface ServiceRequestFilters {
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  category?: 'room_service' | 'housekeeping' | 'maintenance' | 'concierge' | 'amenities' | 'other';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  guest_id?: string;
  assigned_to?: string;
  room_id?: string;
  is_urgent?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// Service Request Types Service
// =====================================================

class ServiceRequestTypesService {
  /**
   * Get all service request types
   */
  async getAll(params?: { category?: string; is_active?: boolean }): Promise<ServiceRequestType[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

    const response = await api.get<ServiceRequestType[]>(
      `/service-requests/types${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Create a new service request type
   */
  async create(data: ServiceRequestTypeCreate): Promise<ServiceRequestType> {
    const response = await api.post<ServiceRequestType>('/service-requests/types', data);
    return response.data;
  }

  /**
   * Update a service request type
   */
  async update(typeId: string, data: Partial<ServiceRequestTypeCreate>): Promise<ServiceRequestType> {
    const response = await api.patch<ServiceRequestType>(`/service-requests/types/${typeId}`, data);
    return response.data;
  }

  /**
   * Delete a service request type
   */
  async delete(typeId: string): Promise<void> {
    await api.delete(`/service-requests/types/${typeId}`);
  }
}

// =====================================================
// Service Requests Service
// =====================================================

class ServiceRequestsService {
  /**
   * Get all service requests with filters
   */
  async getAll(filters?: ServiceRequestFilters): Promise<ServiceRequest[]> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.guest_id) queryParams.append('guest_id', filters.guest_id);
    if (filters?.assigned_to) queryParams.append('assigned_to', filters.assigned_to);
    if (filters?.room_id) queryParams.append('room_id', filters.room_id);
    if (filters?.is_urgent !== undefined) queryParams.append('is_urgent', filters.is_urgent.toString());
    if (filters?.from_date) queryParams.append('from_date', filters.from_date);
    if (filters?.to_date) queryParams.append('to_date', filters.to_date);
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.offset) queryParams.append('offset', filters.offset.toString());

    const response = await api.get<ServiceRequest[]>(
      `/service-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Get a specific service request by ID
   */
  async getById(requestId: string): Promise<ServiceRequest> {
    const response = await api.get<ServiceRequest>(`/service-requests/${requestId}`);
    return response.data;
  }

  /**
   * Create a new service request
   */
  async create(data: ServiceRequestCreate): Promise<ServiceRequest> {
    const response = await api.post<ServiceRequest>('/service-requests', data);
    return response.data;
  }

  /**
   * Update a service request
   */
  async update(requestId: string, data: ServiceRequestUpdate): Promise<ServiceRequest> {
    const response = await api.patch<ServiceRequest>(`/service-requests/${requestId}`, data);
    return response.data;
  }

  /**
   * Assign a service request to a staff member
   */
  async assign(requestId: string, data: ServiceRequestAssign): Promise<ServiceRequest> {
    const response = await api.patch<ServiceRequest>(`/service-requests/${requestId}/assign`, data);
    return response.data;
  }

  /**
   * Start working on a service request
   */
  async start(requestId: string, startedAt?: string): Promise<ServiceRequest> {
    const response = await api.patch<ServiceRequest>(`/service-requests/${requestId}/start`, {
      started_at: startedAt,
    });
    return response.data;
  }

  /**
   * Complete a service request
   */
  async complete(requestId: string, data: ServiceRequestComplete): Promise<ServiceRequest> {
    const response = await api.patch<ServiceRequest>(`/service-requests/${requestId}/complete`, data);
    return response.data;
  }

  /**
   * Cancel a service request
   */
  async cancel(requestId: string, resolutionNotes?: string): Promise<ServiceRequest> {
    const response = await api.patch<ServiceRequest>(`/service-requests/${requestId}/cancel`, {
      resolution_notes: resolutionNotes,
    });
    return response.data;
  }

  /**
   * Submit feedback for a completed request
   */
  async submitFeedback(requestId: string, data: ServiceRequestFeedback): Promise<ServiceRequest> {
    const response = await api.post<ServiceRequest>(`/service-requests/${requestId}/feedback`, data);
    return response.data;
  }

  /**
   * Get status history for a request
   */
  async getHistory(requestId: string): Promise<ServiceRequestStatusHistory[]> {
    const response = await api.get<ServiceRequestStatusHistory[]>(`/service-requests/${requestId}/history`);
    return response.data;
  }

  /**
   * Get current user's service requests
   */
  async getMyRequests(params?: { status?: string; limit?: number }): Promise<ServiceRequest[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<ServiceRequest[]>(
      `/service-requests/stats/my-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Get service request statistics
   */
  async getStats(params?: { from_date?: string; to_date?: string }): Promise<ServiceRequestStats> {
    const queryParams = new URLSearchParams();
    if (params?.from_date) queryParams.append('from_date', params.from_date);
    if (params?.to_date) queryParams.append('to_date', params.to_date);

    const response = await api.get<ServiceRequestStats>(
      `/service-requests/stats/overview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }
}

// =====================================================
// Attachments Service
// =====================================================

class ServiceRequestAttachmentsService {
  /**
   * Get all attachments for a request
   */
  async getAll(requestId: string): Promise<ServiceRequestAttachment[]> {
    const response = await api.get<ServiceRequestAttachment[]>(`/service-requests/${requestId}/attachments`);
    return response.data;
  }

  /**
   * Add an attachment to a request
   */
  async create(requestId: string, data: ServiceRequestAttachmentCreate): Promise<ServiceRequestAttachment> {
    const response = await api.post<ServiceRequestAttachment>(`/service-requests/${requestId}/attachments`, data);
    return response.data;
  }
}

// =====================================================
// Comments Service
// =====================================================

class ServiceRequestCommentsService {
  /**
   * Get all comments for a request
   */
  async getAll(requestId: string): Promise<ServiceRequestComment[]> {
    const response = await api.get<ServiceRequestComment[]>(`/service-requests/${requestId}/comments`);
    return response.data;
  }

  /**
   * Add a comment to a request
   */
  async create(requestId: string, data: ServiceRequestCommentCreate): Promise<ServiceRequestComment> {
    const response = await api.post<ServiceRequestComment>(`/service-requests/${requestId}/comments`, data);
    return response.data;
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get status color for UI
 */
export function getStatusColor(status: ServiceRequest['status']): string {
  const colors: Record<ServiceRequest['status'], string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    assigned: 'text-blue-600 bg-blue-50 border-blue-200',
    in_progress: 'text-purple-600 bg-purple-50 border-purple-200',
    completed: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
    rejected: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Get priority color for UI
 */
export function getPriorityColor(priority: ServiceRequest['priority']): string {
  const colors: Record<ServiceRequest['priority'], string> = {
    low: 'text-gray-600 bg-gray-50 border-gray-200',
    normal: 'text-blue-600 bg-blue-50 border-blue-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    urgent: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[priority] || 'text-blue-600 bg-blue-50 border-blue-200';
}

/**
 * Get category color for UI
 */
export function getCategoryColor(category: ServiceRequest['category']): string {
  const colors: Record<ServiceRequest['category'], string> = {
    room_service: 'text-purple-600 bg-purple-50 border-purple-200',
    housekeeping: 'text-blue-600 bg-blue-50 border-blue-200',
    maintenance: 'text-orange-600 bg-orange-50 border-orange-200',
    concierge: 'text-green-600 bg-green-50 border-green-200',
    amenities: 'text-pink-600 bg-pink-50 border-pink-200',
    other: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[category] || 'text-gray-600 bg-gray-50 border-gray-200';
}

/**
 * Format category for display
 */
export function formatCategory(category: ServiceRequest['category']): string {
  const formatted: Record<ServiceRequest['category'], string> = {
    room_service: 'Room Service',
    housekeeping: 'Housekeeping',
    maintenance: 'Maintenance',
    concierge: 'Concierge',
    amenities: 'Amenities',
    other: 'Other',
  };
  return formatted[category] || category;
}

/**
 * Format priority for display
 */
export function formatPriority(priority: ServiceRequest['priority']): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Format status for display
 */
export function formatStatus(status: ServiceRequest['status']): string {
  const formatted: Record<ServiceRequest['status'], string> = {
    pending: 'Pending',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
  };
  return formatted[status] || status;
}

/**
 * Check if request can be cancelled by guest
 */
export function canGuestCancel(request: ServiceRequest): boolean {
  return ['pending', 'assigned'].includes(request.status);
}

/**
 * Check if request can be started by staff
 */
export function canStaffStart(request: ServiceRequest): boolean {
  return ['pending', 'assigned'].includes(request.status);
}

/**
 * Check if request can be completed by staff
 */
export function canStaffComplete(request: ServiceRequest): boolean {
  return request.status === 'in_progress';
}

/**
 * Check if feedback can be submitted
 */
export function canSubmitFeedback(request: ServiceRequest): boolean {
  return request.status === 'completed' && !request.rating;
}

// =====================================================
// Export Service Instances
// =====================================================

export const serviceRequestTypesService = new ServiceRequestTypesService();
export const serviceRequestsService = new ServiceRequestsService();
export const serviceRequestAttachmentsService = new ServiceRequestAttachmentsService();
export const serviceRequestCommentsService = new ServiceRequestCommentsService();
