"""
Service Requests Schemas
Pydantic models for service request management
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal


# =====================================================
# Service Request Types Schemas
# =====================================================

class ServiceRequestTypeBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    category: str = Field(..., pattern="^(room_service|housekeeping|maintenance|concierge|amenities|other)$")
    icon: Optional[str] = Field(None, max_length=50)
    estimated_time: Optional[int] = Field(None, ge=0)  # in minutes
    requires_staff: bool = True
    is_active: bool = True
    display_order: int = 0


class ServiceRequestTypeCreate(ServiceRequestTypeBase):
    pass


class ServiceRequestTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = Field(None, pattern="^(room_service|housekeeping|maintenance|concierge|amenities|other)$")
    icon: Optional[str] = Field(None, max_length=50)
    estimated_time: Optional[int] = Field(None, ge=0)
    requires_staff: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class ServiceRequestTypeResponse(ServiceRequestTypeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Service Requests Schemas
# =====================================================

class ServiceRequestBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: str = Field(..., pattern="^(room_service|housekeeping|maintenance|concierge|amenities|other)$")
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    location: Optional[str] = Field(None, max_length=200)
    special_instructions: Optional[str] = None
    items_requested: Optional[Dict[str, Any]] = None
    scheduled_time: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(None, ge=0)
    is_urgent: bool = False
    is_recurring: bool = False
    recurrence_pattern: Optional[Dict[str, Any]] = None


class ServiceRequestCreate(ServiceRequestBase):
    guest_id: str
    booking_id: Optional[str] = None
    room_id: Optional[str] = None
    request_type_id: Optional[str] = None


class ServiceRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, pattern="^(room_service|housekeeping|maintenance|concierge|amenities|other)$")
    priority: Optional[str] = Field(None, pattern="^(low|normal|high|urgent)$")
    status: Optional[str] = Field(None, pattern="^(pending|assigned|in_progress|completed|cancelled|rejected)$")
    location: Optional[str] = Field(None, max_length=200)
    special_instructions: Optional[str] = None
    items_requested: Optional[Dict[str, Any]] = None
    scheduled_time: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(None, ge=0)
    is_urgent: Optional[bool] = None


class ServiceRequestAssign(BaseModel):
    assigned_to: str
    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None


class ServiceRequestStart(BaseModel):
    started_at: Optional[datetime] = None


class ServiceRequestComplete(BaseModel):
    completed_at: Optional[datetime] = None
    actual_duration: Optional[int] = Field(None, ge=0)
    resolution_notes: Optional[str] = None
    staff_notes: Optional[str] = None


class ServiceRequestCancel(BaseModel):
    resolution_notes: Optional[str] = None


class ServiceRequestFeedback(BaseModel):
    guest_feedback: str
    rating: int = Field(..., ge=1, le=5)


class ServiceRequestResponse(ServiceRequestBase):
    id: str
    request_number: str
    guest_id: str
    booking_id: Optional[str] = None
    room_id: Optional[str] = None
    request_type_id: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[str] = None
    requested_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    actual_duration: Optional[int] = None
    resolution_notes: Optional[str] = None
    staff_notes: Optional[str] = None
    guest_feedback: Optional[str] = None
    rating: Optional[int] = None
    parent_request_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Service Request Status History Schemas
# =====================================================

class ServiceRequestStatusHistoryBase(BaseModel):
    old_status: Optional[str] = None
    new_status: str
    notes: Optional[str] = None


class ServiceRequestStatusHistoryCreate(ServiceRequestStatusHistoryBase):
    request_id: str
    changed_by: Optional[str] = None


class ServiceRequestStatusHistoryResponse(ServiceRequestStatusHistoryBase):
    id: str
    request_id: str
    changed_by: Optional[str] = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Service Request Attachments Schemas
# =====================================================

class ServiceRequestAttachmentBase(BaseModel):
    file_name: str = Field(..., max_length=255)
    file_url: str
    file_type: Optional[str] = Field(None, max_length=100)
    file_size: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None


class ServiceRequestAttachmentCreate(ServiceRequestAttachmentBase):
    request_id: str
    uploaded_by: Optional[str] = None


class ServiceRequestAttachmentResponse(ServiceRequestAttachmentBase):
    id: str
    request_id: str
    uploaded_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Service Request Comments Schemas
# =====================================================

class ServiceRequestCommentBase(BaseModel):
    comment: str
    is_internal: bool = False


class ServiceRequestCommentCreate(ServiceRequestCommentBase):
    request_id: str
    user_id: str


class ServiceRequestCommentUpdate(BaseModel):
    comment: Optional[str] = None
    is_internal: Optional[bool] = None


class ServiceRequestCommentResponse(ServiceRequestCommentBase):
    id: str
    request_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Extended Response Models (with related data)
# =====================================================

class ServiceRequestWithDetails(ServiceRequestResponse):
    """Service request with guest, room, and staff details"""
    guest_name: Optional[str] = None
    room_number: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    request_type_name: Optional[str] = None


class ServiceRequestStats(BaseModel):
    """Statistics for service requests"""
    total_requests: int = 0
    pending_requests: int = 0
    in_progress_requests: int = 0
    completed_requests: int = 0
    cancelled_requests: int = 0
    urgent_requests: int = 0
    average_completion_time: Optional[float] = None  # in minutes
    average_rating: Optional[float] = None
    requests_by_category: Dict[str, int] = {}
    requests_by_priority: Dict[str, int] = {}
    completion_rate: float = 0.0


class ServiceRequestDashboard(BaseModel):
    """Dashboard data for service requests"""
    stats: ServiceRequestStats
    recent_requests: List[ServiceRequestWithDetails] = []
    urgent_requests: List[ServiceRequestWithDetails] = []
    my_assigned_requests: List[ServiceRequestWithDetails] = []


# =====================================================
# Query Parameters
# =====================================================

class ServiceRequestFilters(BaseModel):
    """Query parameters for filtering service requests"""
    status: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    guest_id: Optional[str] = None
    assigned_to: Optional[str] = None
    room_id: Optional[str] = None
    is_urgent: Optional[bool] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    search: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    sort_by: str = Field(default="requested_at", pattern="^(requested_at|completed_at|priority|status)$")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
