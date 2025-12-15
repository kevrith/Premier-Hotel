/**
 * Housekeeping Management API Service
 */
import api from './client';

// ============================================
// Types/Interfaces
// ============================================

export interface HousekeepingTask {
  id: string;
  room_id: string;
  assigned_to?: string;
  task_type: 'cleaning' | 'inspection' | 'maintenance' | 'turndown' | 'deep_clean' | 'laundry';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  estimated_duration?: number;
  actual_duration?: number;
  notes?: string;
  issues_found?: string;
  supplies_used?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HousekeepingTaskCreate {
  room_id: string;
  task_type: HousekeepingTask['task_type'];
  priority?: HousekeepingTask['priority'];
  assigned_to?: string;
  scheduled_time?: string;
  estimated_duration?: number;
  notes?: string;
  created_by?: string;
}

export interface RoomInspection {
  id: string;
  room_id: string;
  task_id?: string;
  inspector_id: string;
  inspection_date: string;
  cleanliness_score: number;
  maintenance_score: number;
  amenities_score: number;
  overall_score: number;
  checklist?: Record<string, any>;
  maintenance_issues?: string;
  missing_items?: string;
  damaged_items?: string;
  photos?: string[];
  status: 'passed' | 'failed' | 'needs_attention' | 'excellent';
  requires_follow_up: boolean;
  follow_up_notes?: string;
  notes?: string;
  created_at: string;
}

export interface HousekeepingSupply {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  reorder_quantity?: number;
  unit_cost?: number;
  storage_location?: string;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface SupplyUsage {
  id: string;
  supply_id: string;
  task_id?: string;
  quantity_used: number;
  used_by?: string;
  used_at: string;
  notes?: string;
}

export interface LostAndFound {
  id: string;
  item_name: string;
  description?: string;
  category?: string;
  found_location?: string;
  room_id?: string;
  found_by?: string;
  found_date: string;
  guest_id?: string;
  guest_name?: string;
  guest_contact?: string;
  status: 'unclaimed' | 'claimed' | 'disposed' | 'donated';
  claimed_at?: string;
  claimed_by?: string;
  storage_location?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HousekeepingStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  avg_completion_time: number;
  tasks_by_type: Record<string, number>;
  tasks_by_priority: Record<string, number>;
}

export interface RoomStatusSummary {
  total_rooms: number;
  clean_rooms: number;
  dirty_rooms: number;
  in_progress_rooms: number;
  inspected_rooms: number;
  maintenance_required: number;
}

export interface SupplyStats {
  total_supplies: number;
  low_stock_items: number;
  out_of_stock_items: number;
  categories: Record<string, number>;
  total_inventory_value: number;
}

// ============================================
// Housekeeping Service Class
// ============================================

class HousekeepingService {
  // ============================================
  // Task Management
  // ============================================

  async createTask(data: HousekeepingTaskCreate): Promise<HousekeepingTask> {
    const response = await api.post<HousekeepingTask>('/housekeeping/tasks', data);
    return response.data;
  }

  async getTasks(params?: {
    room_id?: string;
    assigned_to?: string;
    status?: string;
    task_type?: string;
    priority?: string;
    from_date?: string;
    to_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<HousekeepingTask[]> {
    const queryParams = new URLSearchParams();
    if (params?.room_id) queryParams.append('room_id', params.room_id);
    if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.task_type) queryParams.append('task_type', params.task_type);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.from_date) queryParams.append('from_date', params.from_date);
    if (params?.to_date) queryParams.append('to_date', params.to_date);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<HousekeepingTask[]>(`/housekeeping/tasks?${queryParams.toString()}`);
    return response.data;
  }

  async getMyTasks(status?: string): Promise<HousekeepingTask[]> {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);

    const response = await api.get<HousekeepingTask[]>(`/housekeeping/tasks/my-tasks?${queryParams.toString()}`);
    return response.data;
  }

  async getTask(taskId: string): Promise<HousekeepingTask> {
    const response = await api.get<HousekeepingTask>(`/housekeeping/tasks/${taskId}`);
    return response.data;
  }

  async updateTask(taskId: string, data: Partial<HousekeepingTask>): Promise<HousekeepingTask> {
    const response = await api.put<HousekeepingTask>(`/housekeeping/tasks/${taskId}`, data);
    return response.data;
  }

  async startTask(taskId: string, startedAt?: string): Promise<HousekeepingTask> {
    const response = await api.patch<HousekeepingTask>(`/housekeeping/tasks/${taskId}/start`, {
      started_at: startedAt
    });
    return response.data;
  }

  async completeTask(taskId: string, data: {
    completed_at?: string;
    actual_duration?: number;
    issues_found?: string;
    supplies_used?: Record<string, any>;
    notes?: string;
  }): Promise<HousekeepingTask> {
    const response = await api.patch<HousekeepingTask>(`/housekeeping/tasks/${taskId}/complete`, data);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/housekeeping/tasks/${taskId}`);
  }

  // ============================================
  // Inspections
  // ============================================

  async createInspection(data: Omit<RoomInspection, 'id' | 'inspection_date' | 'created_at'>): Promise<RoomInspection> {
    const response = await api.post<RoomInspection>('/housekeeping/inspections', data);
    return response.data;
  }

  async getInspections(params?: {
    room_id?: string;
    inspector_id?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<RoomInspection[]> {
    const queryParams = new URLSearchParams();
    if (params?.room_id) queryParams.append('room_id', params.room_id);
    if (params?.inspector_id) queryParams.append('inspector_id', params.inspector_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.from_date) queryParams.append('from_date', params.from_date);
    if (params?.to_date) queryParams.append('to_date', params.to_date);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<RoomInspection[]>(`/housekeeping/inspections?${queryParams.toString()}`);
    return response.data;
  }

  // ============================================
  // Supply Management
  // ============================================

  async createSupply(data: Omit<HousekeepingSupply, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<HousekeepingSupply> {
    const response = await api.post<HousekeepingSupply>('/housekeeping/supplies', data);
    return response.data;
  }

  async getSupplies(params?: {
    category?: string;
    status?: string;
    low_stock?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<HousekeepingSupply[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.low_stock) queryParams.append('low_stock', 'true');
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<HousekeepingSupply[]>(`/housekeeping/supplies?${queryParams.toString()}`);
    return response.data;
  }

  async getLowStockSupplies(): Promise<HousekeepingSupply[]> {
    const response = await api.get<HousekeepingSupply[]>('/housekeeping/supplies/low-stock');
    return response.data;
  }

  async updateSupply(supplyId: string, data: Partial<HousekeepingSupply>): Promise<HousekeepingSupply> {
    const response = await api.put<HousekeepingSupply>(`/housekeeping/supplies/${supplyId}`, data);
    return response.data;
  }

  async logSupplyUsage(data: {
    supply_id: string;
    task_id?: string;
    quantity_used: number;
    used_by?: string;
    notes?: string;
  }): Promise<SupplyUsage> {
    const response = await api.post<SupplyUsage>('/housekeeping/supplies/usage', data);
    return response.data;
  }

  // ============================================
  // Lost and Found
  // ============================================

  async createLostItem(data: Omit<LostAndFound, 'id' | 'found_date' | 'status' | 'created_at' | 'updated_at'>): Promise<LostAndFound> {
    const response = await api.post<LostAndFound>('/housekeeping/lost-and-found', data);
    return response.data;
  }

  async getLostItems(params?: {
    status?: string;
    category?: string;
    skip?: number;
    limit?: number;
  }): Promise<LostAndFound[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<LostAndFound[]>(`/housekeeping/lost-and-found?${queryParams.toString()}`);
    return response.data;
  }

  async claimLostItem(itemId: string, data: {
    claimed_by?: string;
    notes?: string;
  }): Promise<LostAndFound> {
    const response = await api.patch<LostAndFound>(`/housekeeping/lost-and-found/${itemId}/claim`, data);
    return response.data;
  }

  // ============================================
  // Statistics
  // ============================================

  async getStats(params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<HousekeepingStats> {
    const queryParams = new URLSearchParams();
    if (params?.from_date) queryParams.append('from_date', params.from_date);
    if (params?.to_date) queryParams.append('to_date', params.to_date);

    const response = await api.get<HousekeepingStats>(`/housekeeping/stats/overview?${queryParams.toString()}`);
    return response.data;
  }

  async getRoomStatus(): Promise<RoomStatusSummary> {
    const response = await api.get<RoomStatusSummary>('/housekeeping/stats/room-status');
    return response.data;
  }

  async getSupplyStats(): Promise<SupplyStats> {
    const response = await api.get<SupplyStats>('/housekeeping/stats/supplies');
    return response.data;
  }

  // ============================================
  // Helper Methods
  // ============================================

  getTaskTypeLabel(type: HousekeepingTask['task_type']): string {
    const labels: Record<HousekeepingTask['task_type'], string> = {
      cleaning: 'Cleaning',
      inspection: 'Inspection',
      maintenance: 'Maintenance',
      turndown: 'Turndown Service',
      deep_clean: 'Deep Clean',
      laundry: 'Laundry'
    };
    return labels[type];
  }

  getPriorityColor(priority: HousekeepingTask['priority']): string {
    const colors: Record<HousekeepingTask['priority'], string> = {
      low: 'blue',
      normal: 'gray',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority];
  }

  getStatusColor(status: HousekeepingTask['status']): string {
    const colors: Record<HousekeepingTask['status'], string> = {
      pending: 'yellow',
      assigned: 'blue',
      in_progress: 'purple',
      completed: 'green',
      cancelled: 'red',
      on_hold: 'gray'
    };
    return colors[status];
  }

  getInspectionStatusColor(status: RoomInspection['status']): string {
    const colors: Record<RoomInspection['status'], string> = {
      passed: 'green',
      failed: 'red',
      needs_attention: 'yellow',
      excellent: 'emerald'
    };
    return colors[status];
  }

  calculateOverallScore(inspection: Partial<RoomInspection>): number {
    const { cleanliness_score = 0, maintenance_score = 0, amenities_score = 0 } = inspection;
    return Math.round((cleanliness_score + maintenance_score + amenities_score) / 3);
  }
}

export const housekeepingService = new HousekeepingService();
export default housekeepingService;
