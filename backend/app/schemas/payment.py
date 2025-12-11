"""
Payment Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal


class PaymentInitiate(BaseModel):
    """Payment initiation schema"""
    payment_method: Literal["mpesa", "cash", "card"]
    amount: Decimal = Field(..., gt=0)
    reference_type: Literal["booking", "order"]
    reference_id: str
    phone_number: Optional[str] = None  # Required for M-Pesa
    description: Optional[str] = None


class MpesaSTKPush(BaseModel):
    """M-Pesa STK Push request"""
    phone_number: str = Field(..., pattern=r"^(254|0)[17]\d{8}$")
    amount: Decimal = Field(..., gt=0)
    account_reference: str
    transaction_desc: str = "Hotel Payment"


class MpesaCallback(BaseModel):
    """M-Pesa callback data"""
    checkout_request_id: str
    merchant_request_id: str
    result_code: int
    result_desc: str
    amount: Optional[Decimal] = None
    mpesa_receipt_number: Optional[str] = None
    transaction_date: Optional[str] = None
    phone_number: Optional[str] = None


class PaymentResponse(BaseModel):
    """Payment response schema"""
    id: str
    reference_type: str
    reference_id: str
    payment_method: str
    amount: Decimal
    status: str
    transaction_id: Optional[str] = None
    mpesa_receipt: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentStatusQuery(BaseModel):
    """Query payment status"""
    checkout_request_id: str
