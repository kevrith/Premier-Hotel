"""
Housekeeping Management Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, time
from decimal import Decimal


# ============================================
# Housekeeping Task Schemas
# ============================================

class HousekeepingTaskBase(BaseModel):
    room_id: str
    task_type: str = Field(..., pattern='^(cleaning|inspection|maintenance|turndown|deep_clean|laundry)$')
    priority: str = Field(default='normal', pattern='^(low|normal|high|urgent)$')
    scheduled_time: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(None, description="Duration in minutes")
    notes: Optional[str] = None


class HousekeepingTaskCreate(HousekeepingTaskBase):
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None


class HousekeepingTaskUpdate(BaseModel):
    assigned_to: Optional[str] = None
    task_type: Optional[str] = Field(None, pattern='^(cleaning|inspection|maintenance|turndown|deep_clean|laundry)$')
    priority: Optional[str] = Field(None, pattern='^(low|normal|high|urgent)$')
    status: Optional[str] = Field(None, pattern='^(pending|assigned|in_progress|completed|cancelled|on_hold)$')
    scheduled_time: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    notes: Optional[str] = None
    issues_found: Optional[str] = None
    supplies_used: Optional[Dict[str, Any]] = None


class HousekeepingTaskResponse(HousekeepingTaskBase):
    id: str
    assigned_to: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    actual_duration: Optional[int] = None
    issues_found: Optional[str] = None
    supplies_used: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskStartRequest(BaseModel):
    started_at: Optional[datetime] = None


class TaskCompleteRequest(BaseModel):
    completed_at: Optional[datetime] = None
    actual_duration: Optional[int] = None
    issues_found: Optional[str] = None
    supplies_used: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


# ============================================
# Room Inspection Schemas
# ============================================

class RoomInspectionBase(BaseModel):
    room_id: str
    task_id: Optional[str] = None
    cleanliness_score: int = Field(..., ge=1, le=5)
    maintenance_score: int = Field(..., ge=1, le=5)
    amenities_score: int = Field(..., ge=1, le=5)
    overall_score: int = Field(..., ge=1, le=5)
    maintenance_issues: Optional[str] = None
    missing_items: Optional[str] = None
    damaged_items: Optional[str] = None
    notes: Optional[str] = None


class RoomInspectionCreate(RoomInspectionBase):
    inspector_id: str
    checklist: Optional[Dict[str, Any]] = None
    photos: Optional[List[str]] = None
    requires_follow_up: bool = False
    follow_up_notes: Optional[str] = None


class RoomInspectionUpdate(BaseModel):
    cleanliness_score: Optional[int] = Field(None, ge=1, le=5)
    maintenance_score: Optional[int] = Field(None, ge=1, le=5)
    amenities_score: Optional[int] = Field(None, ge=1, le=5)
    overall_score: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[str] = Field(None, pattern='^(passed|failed|needs_attention|excellent)$')
    maintenance_issues: Optional[str] = None
    missing_items: Optional[str] = None
    damaged_items: Optional[str] = None
    requires_follow_up: Optional[bool] = None
    follow_up_notes: Optional[str] = None
    notes: Optional[str] = None


class RoomInspectionResponse(RoomInspectionBase):
    id: str
    inspector_id: str
    inspection_date: datetime
    checklist: Optional[Dict[str, Any]] = None
    photos: Optional[List[str]] = None
    status: str
    requires_follow_up: bool
    follow_up_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Housekeeping Supply Schemas
# ============================================

class HousekeepingSupplyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=50)
    minimum_stock: Decimal = Field(default=0, ge=0)
    reorder_quantity: Optional[Decimal] = Field(None, ge=0)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    storage_location: Optional[str] = None


class HousekeepingSupplyCreate(HousekeepingSupplyBase):
    current_stock: Decimal = Field(default=0, ge=0)


class HousekeepingSupplyUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[Decimal] = Field(None, ge=0)
    minimum_stock: Optional[Decimal] = Field(None, ge=0)
    reorder_quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    storage_location: Optional[str] = None
    status: Optional[str] = Field(None, pattern='^(active|inactive|discontinued)$')


class HousekeepingSupplyResponse(HousekeepingSupplyBase):
    id: str
    current_stock: Decimal
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplyUsageCreate(BaseModel):
    supply_id: str
    task_id: Optional[str] = None
    quantity_used: Decimal = Field(..., gt=0)
    used_by: Optional[str] = None
    notes: Optional[str] = None


class SupplyUsageResponse(BaseModel):
    id: str
    supply_id: str
    task_id: Optional[str] = None
    quantity_used: Decimal
    used_by: Optional[str] = None
    used_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# Housekeeping Schedule Schemas
# ============================================

class HousekeepingScheduleBase(BaseModel):
    room_id: Optional[str] = None
    task_type: str
    frequency: str = Field(..., pattern='^(daily|weekly|biweekly|monthly|quarterly)$')
    preferred_time: Optional[time] = None
    notes: Optional[str] = None


class HousekeepingScheduleCreate(HousekeepingScheduleBase):
    assigned_to: Optional[str] = None


class HousekeepingScheduleUpdate(BaseModel):
    assigned_to: Optional[str] = None
    task_type: Optional[str] = None
    frequency: Optional[str] = Field(None, pattern='^(daily|weekly|biweekly|monthly|quarterly)$')
    preferred_time: Optional[time] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class HousekeepingScheduleResponse(HousekeepingScheduleBase):
    id: str
    assigned_to: Optional[str] = None
    is_active: bool
    last_executed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Lost and Found Schemas
# ============================================

class LostAndFoundBase(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    found_location: Optional[str] = None


class LostAndFoundCreate(LostAndFoundBase):
    room_id: Optional[str] = None
    found_by: Optional[str] = None
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None
    guest_contact: Optional[str] = None
    storage_location: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class LostAndFoundUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None
    guest_contact: Optional[str] = None
    status: Optional[str] = Field(None, pattern='^(unclaimed|claimed|disposed|donated)$')
    claimed_at: Optional[datetime] = None
    claimed_by: Optional[str] = None
    storage_location: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class LostAndFoundResponse(LostAndFoundBase):
    id: str
    room_id: Optional[str] = None
    found_by: Optional[str] = None
    found_date: datetime
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None
    guest_contact: Optional[str] = None
    status: str
    claimed_at: Optional[datetime] = None
    claimed_by: Optional[str] = None
    storage_location: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Stats and Analytics Schemas
# ============================================

class RoomStatusSummary(BaseModel):
    total_rooms: int
    clean_rooms: int
    dirty_rooms: int
    in_progress_rooms: int
    inspected_rooms: int
    maintenance_required: int


class HousekeepingStats(BaseModel):
    total_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    completed_tasks: int
    overdue_tasks: int
    avg_completion_time: float  # in minutes
    tasks_by_type: Dict[str, int]
    tasks_by_priority: Dict[str, int]


class CleanerPerformance(BaseModel):
    cleaner_id: str
    cleaner_name: str
    total_tasks: int
    completed_tasks: int
    avg_completion_time: float
    quality_score: float
    tasks_on_time: int
    tasks_delayed: int


class SupplyStats(BaseModel):
    total_supplies: int
    low_stock_items: int
    out_of_stock_items: int
    categories: Dict[str, int]
    total_inventory_value: Decimal
