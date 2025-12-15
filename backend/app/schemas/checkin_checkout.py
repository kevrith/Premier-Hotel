"""
Check-in/Check-out Schemas
Pydantic models for guest check-in and check-out processes
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


# =====================================================
# Guest Registration Schemas
# =====================================================

class GuestRegistrationBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    id_type: Optional[str] = Field(None, pattern="^(passport|drivers_license|national_id|other)$")
    id_number: Optional[str] = Field(None, max_length=100)
    id_expiry_date: Optional[date] = None
    address_line1: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    emergency_contact_name: Optional[str] = Field(None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    purpose_of_visit: Optional[str] = Field(None, pattern="^(business|leisure|event|other)$")
    special_requests: Optional[str] = None


class GuestRegistrationCreate(GuestRegistrationBase):
    booking_id: str
    user_id: str


class GuestRegistrationResponse(GuestRegistrationBase):
    id: str
    booking_id: str
    user_id: str
    id_verified: bool
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Check-in Schemas
# =====================================================

class CheckinBase(BaseModel):
    checkin_type: str = Field(default="standard", pattern="^(standard|early|online|mobile|kiosk)$")
    scheduled_checkin: Optional[datetime] = None
    room_id: Optional[str] = None
    deposit_amount: Decimal = Field(default=Decimal("0"), ge=0)
    guest_notes: Optional[str] = None


class CheckinCreate(CheckinBase):
    booking_id: str
    registration_id: Optional[str] = None


class CheckinProcess(BaseModel):
    room_id: str
    key_card_number: Optional[str] = None
    deposit_paid: bool = False
    staff_notes: Optional[str] = None


class CheckinComplete(BaseModel):
    actual_checkin: Optional[datetime] = None
    key_card_issued: bool = True
    terms_accepted: bool = True


class CheckinResponse(CheckinBase):
    id: str
    booking_id: str
    registration_id: Optional[str] = None
    actual_checkin: Optional[datetime] = None
    room_assigned_at: Optional[datetime] = None
    room_ready: bool
    processed_by: Optional[str] = None
    key_card_number: Optional[str] = None
    key_card_issued: bool
    deposit_paid: bool
    status: str
    terms_accepted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Check-out Schemas
# =====================================================

class CheckoutBase(BaseModel):
    checkout_type: str = Field(default="standard", pattern="^(standard|late|express|online|mobile)$")
    scheduled_checkout: Optional[datetime] = None


class CheckoutCreate(CheckoutBase):
    booking_id: str
    checkin_id: Optional[str] = None


class CheckoutProcess(BaseModel):
    room_condition: str = Field(..., pattern="^(excellent|good|fair|damaged)$")
    damages_found: bool = False
    damage_description: Optional[str] = None
    damage_charges: Decimal = Field(default=Decimal("0"), ge=0)
    minibar_charges: Decimal = Field(default=Decimal("0"), ge=0)
    service_charges: Decimal = Field(default=Decimal("0"), ge=0)
    staff_notes: Optional[str] = None


class CheckoutComplete(BaseModel):
    actual_checkout: Optional[datetime] = None
    key_card_returned: bool = True
    checkout_rating: Optional[int] = Field(None, ge=1, le=5)
    checkout_feedback: Optional[str] = None


class CheckoutResponse(CheckoutBase):
    id: str
    booking_id: str
    checkin_id: Optional[str] = None
    actual_checkout: Optional[datetime] = None
    room_id: Optional[str] = None
    room_inspected: bool
    room_condition: Optional[str] = None
    damages_found: bool
    damage_charges: Decimal
    processed_by: Optional[str] = None
    key_card_returned: bool
    total_charges: Decimal
    deposit_refund: Decimal
    payment_settled: bool
    status: str
    checkout_rating: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Request Schemas
# =====================================================

class CheckinCheckoutRequestBase(BaseModel):
    request_type: str = Field(..., pattern="^(early_checkin|late_checkout)$")
    requested_time: datetime
    reason: Optional[str] = None


class CheckinCheckoutRequestCreate(CheckinCheckoutRequestBase):
    booking_id: str
    user_id: str


class CheckinCheckoutRequestProcess(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    processing_notes: Optional[str] = None
    additional_charge: Optional[Decimal] = Field(None, ge=0)


class CheckinCheckoutRequestResponse(CheckinCheckoutRequestBase):
    id: str
    booking_id: str
    user_id: str
    additional_charge: Decimal
    status: str
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    processing_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
