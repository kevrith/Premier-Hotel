"""
Menu Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class MenuItemBase(BaseModel):
    """Base menu item schema"""
    name: str
    name_sw: Optional[str] = None
    description: Optional[str] = None
    description_sw: Optional[str] = None
    category: str = Field(..., pattern="^(appetizers|mains|desserts|drinks|breakfast)$")
    base_price: Decimal = Field(..., gt=0)
    image_url: Optional[str] = None
    dietary_info: List[str] = []
    customizations: List[Dict[str, Any]] = []
    preparation_time: Optional[int] = Field(None, ge=0, description="Preparation time in minutes")


class MenuItemCreate(MenuItemBase):
    """Menu item creation schema"""
    pass


class MenuItemUpdate(BaseModel):
    """Menu item update schema"""
    name: Optional[str] = None
    name_sw: Optional[str] = None
    description: Optional[str] = None
    description_sw: Optional[str] = None
    category: Optional[str] = Field(None, pattern="^(appetizers|mains|desserts|drinks|breakfast)$")
    base_price: Optional[Decimal] = Field(None, gt=0)
    image_url: Optional[str] = None
    dietary_info: Optional[List[str]] = None
    customizations: Optional[List[Dict[str, Any]]] = None
    preparation_time: Optional[int] = Field(None, ge=0)
    available: Optional[bool] = None
    popular: Optional[bool] = None


class MenuItemResponse(MenuItemBase):
    """Menu item response schema"""
    id: str
    available: Optional[bool] = True
    popular: Optional[bool] = False
    rating: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
