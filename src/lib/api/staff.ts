/**
 * Staff Management API Service
 */
import api from './client';

// ============================================
// Types/Interfaces
// ============================================

export interface Staff {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  hire_date: string;
  salary?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: Record<string, any>;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  created_at: string;
  updated_at: string;
}

export interface StaffCreate {
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  hire_date: string;
  salary?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: Record<string, any>;
}

export interface StaffUpdate {
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  salary?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: Record<string, any>;
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated';
}

export interface StaffShift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: 'morning' | 'afternoon' | 'evening' | 'night' | 'full_day';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftCreate {
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: 'morning' | 'afternoon' | 'evening' | 'night' | 'full_day';
  notes?: string;
}

export interface Attendance {
  id: string;
  staff_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  notes?: string;
  created_at: string;
}

export interface AttendanceCheckIn {
  staff_id: string;
  notes?: string;
}

export interface AttendanceCheckOut {
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  staff_id: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestCreate {
  staff_id: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveApproval {
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface PerformanceEvaluation {
  id: string;
  staff_id: string;
  evaluation_date: string;
  evaluator_id: string;
  rating: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  comments?: string;
  created_at: string;
}

export interface PerformanceEvaluationCreate {
  staff_id: string;
  evaluator_id: string;
  evaluation_date: string;
  rating: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  comments?: string;
}

export interface StaffStats {
  total_staff: number;
  active_staff: number;
  on_leave: number;
  departments: Record<string, number>;
  average_attendance_rate: number;
}

// ============================================
// Staff Management Service Class
// ============================================

class StaffService {
  /**
   * Create a new staff member
   */
  async createStaff(data: StaffCreate): Promise<Staff> {
    const response = await api.post<Staff>('/staff', data);
    return response.data;
  }

  /**
   * Get all staff members
   */
  async getAllStaff(params?: {
    department?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Staff[]> {
    const queryParams = new URLSearchParams();
    if (params?.department) queryParams.append('department', params.department);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<Staff[]>(`/staff?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get staff member by ID
   */
  async getStaff(staffId: string): Promise<Staff> {
    const response = await api.get<Staff>(`/staff/${staffId}`);
    return response.data;
  }

  /**
   * Update staff member
   */
  async updateStaff(staffId: string, data: StaffUpdate): Promise<Staff> {
    const response = await api.put<Staff>(`/staff/${staffId}`, data);
    return response.data;
  }

  /**
   * Delete staff member
   */
  async deleteStaff(staffId: string): Promise<void> {
    await api.delete(`/staff/${staffId}`);
  }

  // ============================================
  // Shift Management
  // ============================================

  /**
   * Create a shift
   */
  async createShift(data: StaffShiftCreate): Promise<StaffShift> {
    const response = await api.post<StaffShift>('/staff/shifts', data);
    return response.data;
  }

  /**
   * Get shifts
   */
  async getShifts(params?: {
    staff_id?: string;
    shift_date?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<StaffShift[]> {
    const queryParams = new URLSearchParams();
    if (params?.staff_id) queryParams.append('staff_id', params.staff_id);
    if (params?.shift_date) queryParams.append('shift_date', params.shift_date);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<StaffShift[]>(`/staff/shifts?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get my shifts (for logged-in staff)
   */
  async getMyShifts(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<StaffShift[]> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await api.get<StaffShift[]>(`/staff/shifts/my-shifts?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Update shift
   */
  async updateShift(shiftId: string, data: Partial<StaffShiftCreate> & { status?: StaffShift['status'] }): Promise<StaffShift> {
    const response = await api.put<StaffShift>(`/staff/shifts/${shiftId}`, data);
    return response.data;
  }

  // ============================================
  // Attendance Management
  // ============================================

  /**
   * Check in
   */
  async checkIn(data: AttendanceCheckIn): Promise<Attendance> {
    const response = await api.post<Attendance>('/staff/attendance/check-in', data);
    return response.data;
  }

  /**
   * Check out
   */
  async checkOut(data: AttendanceCheckOut): Promise<Attendance> {
    const response = await api.patch<Attendance>('/staff/attendance/check-out', data);
    return response.data;
  }

  /**
   * Get attendance records
   */
  async getAttendance(params?: {
    staff_id?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<Attendance[]> {
    const queryParams = new URLSearchParams();
    if (params?.staff_id) queryParams.append('staff_id', params.staff_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<Attendance[]>(`/staff/attendance?${queryParams.toString()}`);
    return response.data;
  }

  // ============================================
  // Leave Requests
  // ============================================

  /**
   * Create leave request
   */
  async createLeaveRequest(data: LeaveRequestCreate): Promise<LeaveRequest> {
    const response = await api.post<LeaveRequest>('/staff/leaves', data);
    return response.data;
  }

  /**
   * Get leave requests
   */
  async getLeaveRequests(params?: {
    staff_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<LeaveRequest[]> {
    const queryParams = new URLSearchParams();
    if (params?.staff_id) queryParams.append('staff_id', params.staff_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<LeaveRequest[]>(`/staff/leaves?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Approve or reject leave request
   */
  async approveLeave(leaveId: string, data: LeaveApproval): Promise<LeaveRequest> {
    const response = await api.patch<LeaveRequest>(`/staff/leaves/${leaveId}/approve`, data);
    return response.data;
  }

  // ============================================
  // Performance Evaluations
  // ============================================

  /**
   * Create performance evaluation
   */
  async createEvaluation(data: PerformanceEvaluationCreate): Promise<PerformanceEvaluation> {
    const response = await api.post<PerformanceEvaluation>('/staff/evaluations', data);
    return response.data;
  }

  /**
   * Get evaluations
   */
  async getEvaluations(params?: {
    staff_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<PerformanceEvaluation[]> {
    const queryParams = new URLSearchParams();
    if (params?.staff_id) queryParams.append('staff_id', params.staff_id);
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<PerformanceEvaluation[]>(`/staff/evaluations?${queryParams.toString()}`);
    return response.data;
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get staff statistics
   */
  async getStats(): Promise<StaffStats> {
    const response = await api.get<StaffStats>('/staff/stats/overview');
    return response.data;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get formatted shift time
   */
  formatShiftTime(shift: StaffShift): string {
    return `${shift.start_time} - ${shift.end_time}`;
  }

  /**
   * Get shift type label
   */
  getShiftTypeLabel(type: StaffShift['shift_type']): string {
    const labels: Record<StaffShift['shift_type'], string> = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      full_day: 'Full Day'
    };
    return labels[type];
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: Staff['status'] | StaffShift['status'] | LeaveRequest['status']): string {
    const colors: Record<string, string> = {
      active: 'green',
      inactive: 'gray',
      on_leave: 'yellow',
      terminated: 'red',
      scheduled: 'blue',
      completed: 'green',
      cancelled: 'red',
      no_show: 'orange',
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      present: 'green',
      absent: 'red',
      late: 'orange',
      half_day: 'yellow'
    };
    return colors[status] || 'gray';
  }
}

export const staffService = new StaffService();
export default staffService;
