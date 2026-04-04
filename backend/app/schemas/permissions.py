"""Permission Management Schemas"""
from pydantic import BaseModel
from typing import List, Optional


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
    assigned_location_id: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class AvailablePermission(BaseModel):
    """Available permission definition"""
    key: str
    label: str
    description: str
    category: str
