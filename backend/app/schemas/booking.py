"""
Booking Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal


class GuestInfo(BaseModel):
    """Guest information schema"""
    first_name: str
    last_name: str
    email: str
    phone: str
    id_number: Optional[str] = None
    special_requests: Optional[str] = None


class BookingCreate(BaseModel):
    """Booking creation schema"""
    room_id: str
    check_in_date: date
    check_out_date: date
    guest_info: GuestInfo
    total_guests: int = Field(..., ge=1)
    special_requests: Optional[str] = None


class BookingUpdate(BaseModel):
    """Booking update schema"""
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    guest_info: Optional[GuestInfo] = None
    total_guests: Optional[int] = Field(None, ge=1)
    special_requests: Optional[str] = None


class BookingResponse(BaseModel):
    """Booking response schema"""
    id: str
    booking_reference: str
    customer_id: str
    room_id: str
    check_in_date: date
    check_out_date: date
    status: str
    total_amount: Decimal
    guest_info: Dict[str, Any]
    pricing: Optional[Dict[str, Any]] = None
    total_guests: int  # Number of guests - important for occupancy tracking
    special_requests: Optional[str] = None
    payment_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BookingCancel(BaseModel):
    """Booking cancellation schema"""
    reason: Optional[str] = None


class BookingCheckIn(BaseModel):
    """Check-in schema"""
    notes: Optional[str] = None


class BookingCheckOut(BaseModel):
    """Check-out schema"""
    notes: Optional[str] = None
    damages: Optional[str] = None
    additional_charges: Optional[Decimal] = Field(None, ge=0)
