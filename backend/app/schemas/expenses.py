"""
Pydantic schemas for Expense Tracking
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

# =====================================================
# Expense Category Schemas
# =====================================================

class ExpenseCategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    category_type: str = Field(..., pattern="^(operational|maintenance|supplies|utilities|payroll|marketing|other)$")
    icon: Optional[str] = Field(None, max_length=50)
    budget_limit: Optional[Decimal] = None
    is_active: bool = True
    display_order: int = 0

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    category_type: Optional[str] = Field(None, pattern="^(operational|maintenance|supplies|utilities|payroll|marketing|other)$")
    icon: Optional[str] = Field(None, max_length=50)
    budget_limit: Optional[Decimal] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# =====================================================
# Expense Schemas
# =====================================================

class ExpenseBase(BaseModel):
    category_id: Optional[str] = None
    expense_type: str = Field(..., pattern="^(operational|maintenance|supplies|utilities|payroll|marketing|other)$")
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    vendor_name: Optional[str] = Field(None, max_length=200)
    invoice_number: Optional[str] = Field(None, max_length=100)
    amount: Decimal = Field(..., gt=0)
    tax_amount: Decimal = Field(default=Decimal("0"))
    currency: str = Field(default="USD", max_length=3)
    expense_date: date
    due_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, pattern="^(cash|bank_transfer|credit_card|debit_card|check|other)$")
    receipt_url: Optional[str] = None
    invoice_url: Optional[str] = None
    is_recurring: bool = False
    recurring_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    recurring_until: Optional[date] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    submitted_by: str

class ExpenseUpdate(BaseModel):
    category_id: Optional[str] = None
    expense_type: Optional[str] = Field(None, pattern="^(operational|maintenance|supplies|utilities|payroll|marketing|other)$")
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    vendor_name: Optional[str] = Field(None, max_length=200)
    invoice_number: Optional[str] = Field(None, max_length=100)
    amount: Optional[Decimal] = Field(None, gt=0)
    tax_amount: Optional[Decimal] = None
    expense_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, pattern="^(cash|bank_transfer|credit_card|debit_card|check|other)$")
    receipt_url: Optional[str] = None
    invoice_url: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class ExpenseApprove(BaseModel):
    approved_by: str
    approval_notes: Optional[str] = None

class ExpenseReject(BaseModel):
    approved_by: str
    approval_notes: str

class ExpenseMarkPaid(BaseModel):
    paid_date: date
    payment_method: str = Field(..., pattern="^(cash|bank_transfer|credit_card|debit_card|check|other)$")
    transaction_reference: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: str
    expense_number: str
    total_amount: Decimal
    status: str
    payment_status: str
    submitted_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    paid_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# =====================================================
# Budget Schemas
# =====================================================

class BudgetBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    period_type: str = Field(..., pattern="^(monthly|quarterly|yearly|custom)$")
    start_date: date
    end_date: date
    total_budget: Decimal = Field(..., gt=0)
    notes: Optional[str] = None

class BudgetCreate(BudgetBase):
    created_by: str

class BudgetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    total_budget: Optional[Decimal] = Field(None, gt=0)
    status: Optional[str] = Field(None, pattern="^(draft|active|completed|cancelled)$")
    notes: Optional[str] = None

class BudgetApprove(BaseModel):
    approved_by: str

class BudgetResponse(BudgetBase):
    id: str
    budget_number: str
    allocated_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    status: str
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# =====================================================
# Budget Allocation Schemas
# =====================================================

class BudgetAllocationBase(BaseModel):
    budget_id: str
    category_id: str
    allocated_amount: Decimal = Field(..., ge=0)
    alert_threshold_percent: int = Field(default=80, ge=0, le=100)
    notes: Optional[str] = None

class BudgetAllocationCreate(BudgetAllocationBase):
    pass

class BudgetAllocationUpdate(BaseModel):
    allocated_amount: Optional[Decimal] = Field(None, ge=0)
    alert_threshold_percent: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None

class BudgetAllocationResponse(BudgetAllocationBase):
    id: str
    spent_amount: Decimal
    remaining_amount: Decimal
    alert_triggered: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# =====================================================
# Expense Payment Schemas
# =====================================================

class ExpensePaymentBase(BaseModel):
    expense_id: str
    payment_date: date
    amount: Decimal = Field(..., gt=0)
    payment_method: str = Field(..., pattern="^(cash|bank_transfer|credit_card|debit_card|check|other)$")
    transaction_reference: Optional[str] = Field(None, max_length=100)
    check_number: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

class ExpensePaymentCreate(ExpensePaymentBase):
    processed_by: str

class ExpensePaymentResponse(ExpensePaymentBase):
    id: str
    payment_number: str
    processed_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# =====================================================
# Expense Approval Schemas
# =====================================================

class ExpenseApprovalResponse(BaseModel):
    id: str
    expense_id: str
    approver_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# =====================================================
# Statistics Schemas
# =====================================================

class ExpenseStatistics(BaseModel):
    total_expenses: int
    total_amount: Decimal
    pending_expenses: int
    pending_amount: Decimal
    approved_expenses: int
    approved_amount: Decimal
    paid_expenses: int
    paid_amount: Decimal
    by_category: dict
    by_type: dict
    monthly_trend: List[dict]

class BudgetStatistics(BaseModel):
    total_budget: Decimal
    allocated_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    utilization_percent: float
    by_category: List[dict]
    alerts: List[dict]
