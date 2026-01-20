"""
Inventory Management Pydantic Schemas
Validation schemas for inventory, suppliers, purchase orders, and stock management
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# =====================================================
# SUPPLIER SCHEMAS
# =====================================================

class SupplierBase(BaseModel):
    supplier_code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    payment_terms: Optional[str] = Field(None, max_length=100)
    credit_limit: Optional[Decimal] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    is_active: bool = True
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    payment_terms: Optional[str] = Field(None, max_length=100)
    credit_limit: Optional[Decimal] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SupplierResponse(SupplierBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# INVENTORY CATEGORY SCHEMAS
# =====================================================

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = True
    display_order: Optional[int] = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_category_id: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# INVENTORY ITEM SCHEMAS
# =====================================================

class InventoryItemBase(BaseModel):
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    unit: str = Field(..., max_length=50)
    quantity: Decimal = Field(default=Decimal("0"), ge=0)
    min_quantity: Decimal = Field(default=Decimal("0"))
    max_quantity: Optional[Decimal] = None
    reorder_point: Optional[Decimal] = None
    reorder_quantity: Optional[Decimal] = None
    unit_cost: Decimal = Field(default=Decimal("0"))
    selling_price: Optional[Decimal] = None
    location: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    expiry_tracking: bool = False
    is_active: bool = True


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category_id: Optional[str] = None
    supplier_id: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=50)
    quantity: Optional[Decimal] = Field(None, ge=0)
    min_quantity: Optional[Decimal] = None
    max_quantity: Optional[Decimal] = None
    reorder_point: Optional[Decimal] = None
    reorder_quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    location: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    expiry_tracking: Optional[bool] = None
    is_active: Optional[bool] = None


class InventoryItemResponse(InventoryItemBase):
    id: str
    last_restocked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# STOCK MOVEMENT SCHEMAS
# =====================================================

class StockMovementBase(BaseModel):
    item_id: str
    movement_type: str = Field(..., pattern="^(in|out|adjustment|transfer|return|damage|expired)$")
    quantity: Decimal = Field(..., gt=0)
    unit_cost: Optional[Decimal] = None
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_id: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    reason: Optional[str] = None
    notes: Optional[str] = None


class StockMovementCreate(StockMovementBase):
    created_by: str


class StockMovementResponse(StockMovementBase):
    id: str
    previous_quantity: Optional[Decimal] = None
    new_quantity: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    created_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# PURCHASE ORDER SCHEMAS
# =====================================================

class PurchaseOrderBase(BaseModel):
    supplier_id: str
    order_date: date
    expected_delivery_date: Optional[date] = None
    status: str = Field(default="draft", pattern="^(draft|pending|approved|ordered|partial|received|cancelled)$")
    payment_terms: Optional[str] = Field(None, max_length=100)
    delivery_address: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    created_by: str


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(draft|pending|approved|ordered|partial|received|cancelled)$")
    tax_amount: Optional[Decimal] = None
    shipping_cost: Optional[Decimal] = None
    payment_status: Optional[str] = Field(None, pattern="^(unpaid|partial|paid)$")
    payment_terms: Optional[str] = Field(None, max_length=100)
    delivery_address: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    po_number: str
    actual_delivery_date: Optional[date] = None
    subtotal: Decimal
    tax_amount: Decimal
    shipping_cost: Decimal
    total_amount: Decimal
    payment_status: str
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# PURCHASE ORDER ITEM SCHEMAS
# =====================================================

class PurchaseOrderItemBase(BaseModel):
    item_id: str
    quantity: Decimal = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(default=Decimal("0"))
    discount_percent: Decimal = Field(default=Decimal("0"))
    notes: Optional[str] = None


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    po_id: str


class PurchaseOrderItemUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0)
    received_quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    notes: Optional[str] = None


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    po_id: str
    received_quantity: Decimal
    line_total: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# STOCK ALERT SCHEMAS
# =====================================================

class StockAlertBase(BaseModel):
    item_id: str
    alert_type: str = Field(..., pattern="^(low_stock|out_of_stock|overstock|expiring_soon|expired)$")
    alert_level: str = Field(default="warning", pattern="^(info|warning|critical)$")
    message: str
    current_quantity: Optional[Decimal] = None
    threshold_quantity: Optional[Decimal] = None


class StockAlertCreate(StockAlertBase):
    pass


class StockAlertUpdate(BaseModel):
    is_acknowledged: bool
    acknowledged_by: str


class StockAlertResponse(StockAlertBase):
    id: str
    is_acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# INVENTORY BATCH SCHEMAS
# =====================================================

class InventoryBatchBase(BaseModel):
    item_id: str
    batch_number: str = Field(..., max_length=100)
    quantity: Decimal = Field(..., ge=0)
    unit_cost: Optional[Decimal] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    supplier_id: Optional[str] = None
    po_id: Optional[str] = None
    notes: Optional[str] = None


class InventoryBatchCreate(InventoryBatchBase):
    pass


class InventoryBatchUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, ge=0)
    unit_cost: Optional[Decimal] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class InventoryBatchResponse(InventoryBatchBase):
    id: str
    is_expired: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# STOCK TAKE SCHEMAS
# =====================================================

class StockTakeBase(BaseModel):
    scheduled_date: date
    status: str = Field(default="scheduled", pattern="^(scheduled|in_progress|completed|cancelled)$")
    location: Optional[str] = Field(None, max_length=100)
    category_id: Optional[str] = None
    notes: Optional[str] = None


class StockTakeCreate(StockTakeBase):
    conducted_by: str


class StockTakeUpdate(BaseModel):
    actual_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(scheduled|in_progress|completed|cancelled)$")
    verified_by: Optional[str] = None
    notes: Optional[str] = None


class StockTakeResponse(StockTakeBase):
    id: str
    stock_take_number: str
    actual_date: Optional[date] = None
    conducted_by: Optional[str] = None
    verified_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# STOCK TAKE ITEM SCHEMAS
# =====================================================

class StockTakeItemBase(BaseModel):
    stock_take_id: str
    item_id: str
    system_quantity: Decimal
    counted_quantity: Optional[Decimal] = None
    variance_cost: Optional[Decimal] = None
    reason_for_variance: Optional[str] = None
    notes: Optional[str] = None


class StockTakeItemCreate(StockTakeItemBase):
    pass


class StockTakeItemUpdate(BaseModel):
    counted_quantity: Decimal
    variance_cost: Optional[Decimal] = None
    reason_for_variance: Optional[str] = None
    notes: Optional[str] = None


class StockTakeItemResponse(StockTakeItemBase):
    id: str
    variance: Optional[Decimal] = None
    counted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# STATISTICS AND REPORTING SCHEMAS
# =====================================================

class InventoryStatistics(BaseModel):
    total_items: int
    total_value: Decimal
    low_stock_items: int
    out_of_stock_items: int
    expiring_soon_items: int
    expired_items: int
    by_category: dict
    recent_movements: List[StockMovementResponse]


class PurchaseOrderStatistics(BaseModel):
    total_orders: int
    pending_orders: int
    total_amount: Decimal
    pending_amount: Decimal
    by_supplier: dict
    by_status: dict


class LowStockItem(BaseModel):
    item_id: str
    sku: str
    name: str
    current_quantity: Decimal
    min_quantity: Decimal
    reorder_point: Optional[Decimal]
    unit: str
    category: Optional[str]
    supplier: Optional[str]


class InventoryValuation(BaseModel):
    item_id: str
    sku: str
    name: str
    quantity: Decimal
    unit_cost: Decimal
    total_value: Decimal
    category: Optional[str]
