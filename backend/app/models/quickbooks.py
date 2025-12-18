"""
QuickBooks POS 2013 Integration - Data Models

This module defines Pydantic models for QuickBooks integration including:
- QBXML request/response structures
- Sales receipt models
- Inventory models
- Sync configuration and logging

Author: Premier Hotel Development Team
Date: 2025-12-18
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class SyncType(str, Enum):
    """Types of synchronization operations"""
    SALE = "sale"
    INVENTORY_PULL = "inventory_pull"
    INVENTORY_PUSH = "inventory_push"
    CUSTOMER = "customer"


class SyncDirection(str, Enum):
    """Direction of sync operation"""
    TO_QB = "to_qb"
    FROM_QB = "from_qb"


class SyncStatus(str, Enum):
    """Status of sync operation"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ReferenceType(str, Enum):
    """Type of entity being synced"""
    ORDER = "order"
    BOOKING = "booking"
    INVENTORY_ITEM = "inventory_item"
    MENU_ITEM = "menu_item"
    CUSTOMER = "customer"


class ConnectionStatus(str, Enum):
    """QuickBooks connection status"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class PaymentMethod(str, Enum):
    """Payment method types"""
    MPESA = "mpesa"
    CASH = "cash"
    CARD = "card"
    CHECK = "check"


# ============================================================================
# Configuration Models
# ============================================================================

class QuickBooksConfig(BaseModel):
    """QuickBooks POS configuration model"""
    id: Optional[str] = None
    company_file_path: str = Field(..., description="Path to QB POS company file")
    web_connector_url: str = Field(..., description="Web Connector SOAP endpoint URL")
    username: str = Field(..., description="QB Web Connector username")
    password_hash: Optional[str] = Field(None, description="Hashed password")

    # Sync settings
    sync_enabled: bool = Field(default=False, description="Enable/disable sync")
    sync_sales: bool = Field(default=True, description="Sync sales transactions")
    sync_inventory: bool = Field(default=True, description="Sync inventory")
    inventory_sync_interval_minutes: int = Field(default=60, description="Inventory sync interval")

    # Status
    connection_status: ConnectionStatus = Field(default=ConnectionStatus.DISCONNECTED)
    last_connection_test: Optional[datetime] = None
    last_inventory_sync: Optional[datetime] = None
    last_sales_sync: Optional[datetime] = None

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        use_enum_values = True


class QuickBooksConfigUpdate(BaseModel):
    """Model for updating QB configuration"""
    company_file_path: Optional[str] = None
    web_connector_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None  # Plain password, will be hashed
    sync_enabled: Optional[bool] = None
    sync_sales: Optional[bool] = None
    sync_inventory: Optional[bool] = None
    inventory_sync_interval_minutes: Optional[int] = None


# ============================================================================
# Sync Log Models
# ============================================================================

class QuickBooksSyncLog(BaseModel):
    """Sync transaction log model"""
    id: Optional[str] = None

    # Operation details
    sync_type: SyncType
    sync_direction: SyncDirection

    # Reference to source entity
    reference_type: Optional[ReferenceType] = None
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None

    # QuickBooks identifiers
    qb_txn_id: Optional[str] = Field(None, description="QB Transaction ID")
    qb_list_id: Optional[str] = Field(None, description="QB List ID")
    qb_edit_sequence: Optional[str] = Field(None, description="QB Edit Sequence")

    # Request/Response
    qbxml_request: Optional[str] = Field(None, description="QBXML request XML")
    qbxml_response: Optional[str] = Field(None, description="QBXML response XML")

    # Status
    status: SyncStatus = Field(default=SyncStatus.PENDING)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=5)

    # Timestamps
    synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Additional data
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


class QuickBooksSyncLogCreate(BaseModel):
    """Model for creating sync log entries"""
    sync_type: SyncType
    sync_direction: SyncDirection
    reference_type: Optional[ReferenceType] = None
    reference_id: Optional[str] = None
    reference_number: Optional[str] = None
    qbxml_request: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# Item Mapping Models
# ============================================================================

class QuickBooksItemMapping(BaseModel):
    """Item mapping between Hotel and QuickBooks"""
    id: Optional[str] = None

    # Hotel item reference
    hotel_item_id: str
    hotel_item_type: str = Field(..., description="'menu_item' or 'inventory_item'")
    hotel_item_name: str
    hotel_item_sku: Optional[str] = None

    # QB item reference
    qb_item_list_id: str = Field(..., description="QuickBooks ItemRef ListID")
    qb_item_full_name: str = Field(..., description="QB item full name")
    qb_edit_sequence: Optional[str] = None

    # Sync configuration
    sync_inventory: bool = Field(default=True)
    sync_sales: bool = Field(default=True)
    sync_enabled: bool = Field(default=True)
    sync_price: bool = Field(default=False)
    price_markup_percentage: float = Field(default=0.0)

    # Last sync info
    last_synced: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_error: Optional[str] = None

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None


class QuickBooksItemMappingCreate(BaseModel):
    """Model for creating item mappings"""
    hotel_item_id: str
    hotel_item_type: str
    hotel_item_name: str
    hotel_item_sku: Optional[str] = None
    qb_item_list_id: str
    qb_item_full_name: str
    sync_inventory: bool = True
    sync_sales: bool = True
    sync_price: bool = False
    price_markup_percentage: float = 0.0


# ============================================================================
# Customer Mapping Models
# ============================================================================

class QuickBooksCustomerMapping(BaseModel):
    """Customer mapping between Hotel users and QB customers"""
    id: Optional[str] = None

    # Hotel user reference
    user_id: str
    user_email: str
    user_full_name: Optional[str] = None

    # QB customer reference
    qb_customer_list_id: str
    qb_customer_name: str
    qb_edit_sequence: Optional[str] = None

    # Sync configuration
    sync_enabled: bool = Field(default=True)
    auto_create_in_qb: bool = Field(default=True)

    # Last sync info
    last_synced: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_error: Optional[str] = None

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class QuickBooksCustomerMappingCreate(BaseModel):
    """Model for creating customer mappings"""
    user_id: str
    user_email: str
    user_full_name: Optional[str] = None
    qb_customer_list_id: str
    qb_customer_name: str
    auto_create_in_qb: bool = True


# ============================================================================
# QBXML Request/Response Models
# ============================================================================

class QBXMLLineItem(BaseModel):
    """Line item for sales receipts"""
    item_ref_list_id: str = Field(..., description="QB Item ListID")
    item_ref_full_name: str = Field(..., description="QB Item name")
    description: Optional[str] = None
    quantity: float = Field(..., gt=0)
    rate: float = Field(..., ge=0)
    amount: float = Field(..., ge=0)
    sales_tax_code_ref: Optional[str] = "TAX"  # or "NON"

    @validator('amount')
    def validate_amount(cls, v, values):
        """Validate that amount = quantity * rate"""
        if 'quantity' in values and 'rate' in values:
            expected = round(values['quantity'] * values['rate'], 2)
            if abs(v - expected) > 0.01:
                return expected
        return v


class QBXMLSalesReceipt(BaseModel):
    """Sales receipt for QBXML"""
    txn_date: str = Field(..., description="Transaction date (YYYY-MM-DD)")
    ref_number: str = Field(..., description="Receipt/Invoice number")
    customer_ref_list_id: Optional[str] = None
    customer_ref_full_name: Optional[str] = "Walk-in Customer"

    # Line items
    sales_receipt_line_items: List[QBXMLLineItem]

    # Payment information
    payment_method_ref_name: str = Field(default="Cash")
    memo: Optional[str] = None

    # Financial totals
    subtotal: float = Field(..., ge=0)
    sales_tax_percentage: float = Field(default=0.0)
    sales_tax_total: Optional[float] = None
    total_amount: float = Field(..., ge=0)


class QBXMLInventoryAdjustment(BaseModel):
    """Inventory adjustment for QBXML"""
    txn_date: str = Field(..., description="Transaction date (YYYY-MM-DD)")
    ref_number: str = Field(..., description="Adjustment reference")
    account_ref_name: str = Field(default="Inventory Adjustment")

    # Item being adjusted
    item_ref_list_id: str
    item_ref_full_name: str
    quantity_difference: int = Field(..., description="Positive for add, negative for remove")
    new_quantity: int = Field(..., ge=0)

    # Cost information
    unit_cost: Optional[float] = None
    memo: Optional[str] = None


class QBXMLInventoryQuery(BaseModel):
    """Query for inventory levels"""
    item_ref_list_id: Optional[str] = None
    item_ref_full_name: Optional[str] = None
    max_returned: int = Field(default=100)
    active_status: str = Field(default="ActiveOnly")  # ActiveOnly, InactiveOnly, All


class QBXMLCustomer(BaseModel):
    """Customer data for QBXML"""
    name: str = Field(..., description="Customer name (unique in QB)")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bill_address_line1: Optional[str] = None
    bill_address_city: Optional[str] = None
    bill_address_country: Optional[str] = "Kenya"


# ============================================================================
# Response Models
# ============================================================================

class QuickBooksSyncStats(BaseModel):
    """Statistics for sync operations"""
    total_syncs: int
    completed: int
    failed: int
    pending: int
    last_sync: Optional[datetime] = None


class QuickBooksConnectionTest(BaseModel):
    """Connection test result"""
    success: bool
    message: str
    connection_status: ConnectionStatus
    tested_at: datetime
    error_details: Optional[str] = None


class QuickBooksSyncResponse(BaseModel):
    """Response from sync operation"""
    success: bool
    sync_log_id: str
    qb_txn_id: Optional[str] = None
    message: str
    synced_at: Optional[datetime] = None


# ============================================================================
# Utility Functions
# ============================================================================

def format_qb_date(date: datetime) -> str:
    """Format datetime for QuickBooks (YYYY-MM-DD)"""
    return date.strftime("%Y-%m-%d")


def parse_qb_date(date_str: str) -> datetime:
    """Parse QuickBooks date string"""
    return datetime.strptime(date_str, "%Y-%m-%d")


def map_payment_method_to_qb(payment_method: str) -> str:
    """Map Premier Hotel payment methods to QB payment methods"""
    mapping = {
        "mpesa": "M-Pesa",
        "cash": "Cash",
        "card": "Credit Card",
        "check": "Check"
    }
    return mapping.get(payment_method.lower(), "Cash")
