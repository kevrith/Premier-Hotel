"""
Staff Management Schemas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any
from datetime import date, time, datetime
from decimal import Decimal


# ============================================
# Staff Schemas
# ============================================

class StaffBase(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    position: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    hire_date: date
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None


class StaffCreate(StaffBase):
    user_id: str  # UUID of the auth user
    salary: Optional[Decimal] = Field(None, ge=0)


class StaffUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[Decimal] = Field(None, ge=0)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(None, pattern='^(active|inactive|on_leave|terminated)$')


class StaffResponse(StaffBase):
    id: str
    user_id: str
    salary: Optional[Decimal] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Staff Shift Schemas
# ============================================

class StaffShiftBase(BaseModel):
    shift_date: date
    start_time: time
    end_time: time
    shift_type: str = Field(..., pattern='^(morning|afternoon|evening|night|full_day)$')
    notes: Optional[str] = None


class StaffShiftCreate(StaffShiftBase):
    staff_id: str


class StaffShiftUpdate(BaseModel):
    shift_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    shift_type: Optional[str] = Field(None, pattern='^(morning|afternoon|evening|night|full_day)$')
    status: Optional[str] = Field(None, pattern='^(scheduled|completed|cancelled|no_show)$')
    notes: Optional[str] = None


class StaffShiftResponse(StaffShiftBase):
    id: str
    staff_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Staff Attendance Schemas
# ============================================

class AttendanceCheckIn(BaseModel):
    staff_id: str
    notes: Optional[str] = None


class AttendanceCheckOut(BaseModel):
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern='^(present|absent|late|half_day|on_leave)$')
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: str
    staff_id: str
    date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Staff Performance Schemas
# ============================================

class PerformanceEvaluationBase(BaseModel):
    evaluation_date: date
    rating: int = Field(..., ge=1, le=5)
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    goals: Optional[str] = None
    comments: Optional[str] = None


class PerformanceEvaluationCreate(PerformanceEvaluationBase):
    staff_id: str
    evaluator_id: str


class PerformanceEvaluationUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    goals: Optional[str] = None
    comments: Optional[str] = None


class PerformanceEvaluationResponse(PerformanceEvaluationBase):
    id: str
    staff_id: str
    evaluator_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Staff Leave Schemas
# ============================================

class LeaveRequestBase(BaseModel):
    leave_type: str = Field(..., pattern='^(annual|sick|personal|maternity|paternity|unpaid)$')
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestCreate(LeaveRequestBase):
    staff_id: str

    @property
    def days_count(self) -> int:
        """Calculate number of days"""
        return (self.end_date - self.start_date).days + 1


class LeaveRequestUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[str] = Field(None, pattern='^(pending|approved|rejected|cancelled)$')
    notes: Optional[str] = None


class LeaveApproval(BaseModel):
    status: str = Field(..., pattern='^(approved|rejected)$')
    notes: Optional[str] = None


class LeaveRequestResponse(LeaveRequestBase):
    id: str
    staff_id: str
    days_count: int
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Staff Analytics/Stats Schemas
# ============================================

class StaffStats(BaseModel):
    total_staff: int
    active_staff: int
    on_leave: int
    departments: Dict[str, int]
    average_attendance_rate: float


class AttendanceStats(BaseModel):
    staff_id: str
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    attendance_rate: float


class ShiftStats(BaseModel):
    staff_id: str
    total_shifts: int
    completed_shifts: int
    no_show_shifts: int
    completion_rate: float
