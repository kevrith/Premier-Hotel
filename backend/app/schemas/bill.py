"""
Bill and Payment Schemas
Supports unified bill aggregation where multiple orders can be paid together
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class OrderInBill(BaseModel):
    """Order information within a bill"""
    order_id: str
    order_number: str
    waiter_id: str
    waiter_name: str
    items: List[Dict[str, Any]]
    amount: Decimal
    created_at: datetime


class BillCreate(BaseModel):
    """Bill creation schema"""
    table_number: Optional[str] = None
    room_number: Optional[str] = None
    location_type: str = Field(..., pattern="^(table|room)$")
    order_ids: List[str] = Field(..., min_items=1)
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None


class BillResponse(BaseModel):
    """Bill response schema"""
    id: str
    bill_number: str
    table_number: Optional[str] = None
    room_number: Optional[str] = None
    location_type: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    subtotal: Decimal
    tax: Decimal
    total_amount: Decimal
    payment_status: str
    settled_by_waiter_id: Optional[str] = None
    qr_code_data: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

    # Include order breakdown
    orders: List[OrderInBill] = []

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    """Payment creation schema"""
    bill_id: str
    amount: Decimal = Field(..., gt=0)
    payment_method: str = Field(..., pattern="^(cash|mpesa|card|room_charge)$")

    # M-Pesa specific
    mpesa_code: Optional[str] = Field(None, min_length=10, max_length=20)
    mpesa_phone: Optional[str] = None

    # Card specific
    card_transaction_ref: Optional[str] = None

    # Room charge specific
    room_charge_ref: Optional[str] = None

    # Additional info
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    """Payment response schema"""
    id: str
    payment_number: str
    bill_id: str
    amount: Decimal
    payment_method: str
    payment_status: str
    mpesa_code: Optional[str] = None
    mpesa_phone: Optional[str] = None
    card_transaction_ref: Optional[str] = None
    room_charge_ref: Optional[str] = None
    processed_by_waiter_id: str
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UnpaidOrdersResponse(BaseModel):
    """Response for fetching unpaid orders for a table/room"""
    location: str
    location_type: str
    orders: List[OrderInBill]
    total_amount: Decimal
    tax_included: Decimal
    subtotal: Decimal
    order_count: int


class BillSummary(BaseModel):
    """Summary of a bill for quick display"""
    bill_id: str
    bill_number: str
    total_amount: Decimal
    payment_status: str
    waiter_breakdown: List[Dict[str, Any]]  # [{"waiter_name": "Alice", "amount": 600}, ...]
    created_at: datetime


class MPesaCallbackData(BaseModel):
    """M-Pesa payment callback data"""
    mpesa_code: str
    amount: Decimal
    phone: str
    account_reference: str  # Bill number
    transaction_date: Optional[datetime] = None
