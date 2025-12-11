"""
Order Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class OrderItem(BaseModel):
    """Order item schema"""
    menu_item_id: str
    name: str
    quantity: int = Field(..., ge=1)
    price: Decimal = Field(..., gt=0)
    customizations: Optional[Dict[str, Any]] = None
    special_instructions: Optional[str] = None


class OrderCreate(BaseModel):
    """Order creation schema"""
    location: str
    location_type: str = Field(..., pattern="^(table|room)$")
    items: List[OrderItem]
    special_instructions: Optional[str] = None


class OrderUpdate(BaseModel):
    """Order update schema"""
    status: Optional[str] = Field(
        None,
        pattern="^(pending|confirmed|preparing|ready|served|completed|cancelled)$"
    )
    assigned_waiter_id: Optional[str] = None
    assigned_chef_id: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    """Order response schema"""
    id: str
    order_number: str
    customer_id: str
    location: str
    location_type: str
    status: str
    items: List[Dict[str, Any]]
    subtotal: Decimal
    tax: Decimal
    total_amount: Decimal
    assigned_waiter_id: Optional[str] = None
    assigned_chef_id: Optional[str] = None
    priority: str
    special_instructions: Optional[str] = None
    notes: Optional[str] = None
    estimated_ready_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    """Order status update schema"""
    status: str = Field(
        ...,
        pattern="^(pending|confirmed|preparing|ready|served|completed|cancelled)$"
    )
    notes: Optional[str] = None
