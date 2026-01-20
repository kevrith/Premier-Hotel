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
    quantity: int = Field(..., ge=1)
    name: Optional[str] = None  # Will be fetched from menu_items table
    price: Optional[Decimal] = None  # Will be fetched from menu_items table
    customizations: Optional[Dict[str, Any]] = None
    special_instructions: Optional[str] = None


class OrderCreate(BaseModel):
    """Order creation schema"""
    location: str
    location_type: str = Field(..., pattern="^(table|room)$")
    items: List[OrderItem]
    special_instructions: Optional[str] = None
    # Customer information (for walk-in and room service orders)
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    order_type: Optional[str] = Field(None, pattern="^(room_service|walk_in|dine_in)$")
    # NOTE: payment_method removed - payment happens at bill settlement, not order creation


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
    # Customer information fields (for walk-in and room service orders)
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    order_type: Optional[str] = None
    # Payment tracking (separate from order creation)
    payment_status: Optional[str] = None  # unpaid, paid, refunded
    bill_id: Optional[str] = None  # Link to consolidated bill
    paid_at: Optional[datetime] = None
    # Staff attribution
    created_by_staff_id: Optional[str] = None
    # Location details
    room_number: Optional[str] = None
    table_number: Optional[str] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    """Order status update schema"""
    status: str = Field(
        ...,
        pattern="^(pending|confirmed|preparing|ready|served|completed|cancelled)$"
    )
    notes: Optional[str] = None
