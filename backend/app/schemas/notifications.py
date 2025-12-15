"""
Notification System Pydantic Schemas
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, time


class NotificationPreferencesBase(BaseModel):
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    in_app_enabled: bool = True
    booking_confirmations: bool = True
    booking_reminders: bool = True
    payment_receipts: bool = True
    promotional_offers: bool = True
    loyalty_updates: bool = True
    service_updates: bool = True
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    preferred_language: str = 'en'
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: str = 'UTC'


class NotificationPreferencesResponse(NotificationPreferencesBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationBase(BaseModel):
    notification_type: str = Field(..., pattern="^(email|sms|push|in_app)$")
    title: str = Field(..., max_length=500)
    message: str
    event_type: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")


class NotificationCreate(NotificationBase):
    user_id: str


class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationUpdate(BaseModel):
    read_at: Optional[datetime] = None


class NotificationStats(BaseModel):
    total_notifications: int
    unread_count: int
    by_type: Dict[str, int]
    recent_notifications: List[NotificationResponse]
