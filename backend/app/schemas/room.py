"""
Room Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class RoomBase(BaseModel):
    """Base room schema"""
    room_number: str
    type: str
    type_sw: Optional[str] = None
    description: Optional[str] = None
    description_sw: Optional[str] = None
    base_price: Decimal = Field(..., gt=0, description="Price must be greater than 0")
    max_occupancy: int = Field(default=2, ge=1)
    floor: Optional[int] = None
    view_type: Optional[str] = None
    size_sqm: Optional[int] = None
    amenities: List[str] = []
    images: List[str] = []


class RoomCreate(RoomBase):
    """Room creation schema"""
    pass


class RoomUpdate(BaseModel):
    """Room update schema"""
    room_number: Optional[str] = None
    type: Optional[str] = None
    type_sw: Optional[str] = None
    description: Optional[str] = None
    description_sw: Optional[str] = None
    base_price: Optional[Decimal] = Field(None, gt=0)
    max_occupancy: Optional[int] = Field(None, ge=1)
    floor: Optional[int] = None
    view_type: Optional[str] = None
    size_sqm: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(available|occupied|maintenance|reserved)$")
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None


class RoomResponse(RoomBase):
    """Room response schema"""
    id: str
    status: str
    rating: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AvailabilityCheck(BaseModel):
    """Room availability check schema"""
    check_in: date
    check_out: date
    guests: Optional[int] = Field(None, ge=1)


class AvailabilityResponse(BaseModel):
    """Availability check response"""
    available: bool
    room_id: str
    check_in: date
    check_out: date
    message: str
