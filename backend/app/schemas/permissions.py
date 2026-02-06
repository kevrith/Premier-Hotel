"""Permission Management Schemas"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class UserPermissionsUpdate(BaseModel):
    """Update user permissions"""
    user_id: str
    permissions: List[str]


class UserPermissionsResponse(BaseModel):
    """User with permissions"""
    id: str
    email: Optional[str]
    full_name: str
    role: str
    permissions: List[str] = []
    updated_at: datetime

    class Config:
        from_attributes = True


class AvailablePermission(BaseModel):
    """Available permission definition"""
    key: str
    label: str
    description: str
    category: str
