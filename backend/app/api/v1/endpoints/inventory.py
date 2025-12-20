"""
Inventory Management API Endpoints
Handles inventory items, suppliers, purchase orders, stock movements, and reporting
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, date
from supabase import Client
from decimal import Decimal

from app.core.supabase import get_supabase
from app.middleware.auth import require_role
from app.schemas.inventory import (
    # Suppliers
    SupplierCreate, SupplierUpdate, SupplierResponse,
    # Categories
    CategoryCreate, CategoryUpdate, CategoryResponse,
    # Inventory Items
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    # Stock Movements
    StockMovementCreate, StockMovementResponse,
    # Purchase Orders
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse,
    PurchaseOrderItemCreate, PurchaseOrderItemUpdate, PurchaseOrderItemResponse,
    # Stock Alerts
    StockAlertResponse, StockAlertUpdate,
    # Batches
    InventoryBatchCreate, InventoryBatchUpdate, InventoryBatchResponse,
    # Stock Takes
    StockTakeCreate, StockTakeUpdate, StockTakeResponse,
    StockTakeItemCreate, StockTakeItemUpdate, StockTakeItemResponse,
    # Statistics
    InventoryStatistics, PurchaseOrderStatistics, LowStockItem, InventoryValuation
)

router = APIRouter()


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_supplier_code() -> str:
    """Generate unique supplier code"""
    return f"SUP-{datetime.now().strftime('%Y%m%d%H%M%S')}"


def generate_po_number() -> str:
    """Generate unique purchase order number"""
    return f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"


def generate_stock_take_number() -> str:
    """Generate unique stock take number"""
    return f"ST-{datetime.now().strftime('%Y%m%d%H%M%S')}"


# =====================================================
# SUPPLIER ENDPOINTS
# =====================================================

@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all suppliers with optional filtering"""
    query = supabase.table("suppliers").select("*")

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("name")
    result = query.execute()

    return [SupplierResponse(**item) for item in result.data]


@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new supplier"""
    supplier_data = supplier.model_dump()

    # Generate supplier code if not provided
    if not supplier_data.get("supplier_code"):
        supplier_data["supplier_code"] = generate_supplier_code()

    result = supabase.table("suppliers").insert(supplier_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create supplier")

    return SupplierResponse(**result.data[0])


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get supplier by ID"""
    result = supabase.table("suppliers").select("*").eq("id", supplier_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return SupplierResponse(**result.data[0])


@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    supplier: SupplierUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update supplier"""
    update_data = supplier.model_dump(exclude_unset=True)

    result = supabase.table("suppliers").update(update_data).eq("id", supplier_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return SupplierResponse(**result.data[0])


# =====================================================
# CATEGORY ENDPOINTS
# =====================================================

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all inventory categories"""
    query = supabase.table("inventory_categories").select("*")

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("display_order", desc=False)
    result = query.execute()

    return [CategoryResponse(**item) for item in result.data]


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new category"""
    category_data = category.model_dump()

    result = supabase.table("inventory_categories").insert(category_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create category")

    return CategoryResponse(**result.data[0])


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update category"""
    update_data = category.model_dump(exclude_unset=True)

    result = supabase.table("inventory_categories").update(update_data).eq("id", category_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Category not found")

    return CategoryResponse(**result.data[0])


# =====================================================
# INVENTORY ITEM ENDPOINTS
# =====================================================

@router.get("/items", response_model=List[InventoryItemResponse])
async def get_inventory_items(
    category_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    low_stock: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["admin", "manager", "staff", "chef", "waiter"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all inventory items with filtering"""
    query = supabase.table("inventory_items").select("*")

    if category_id:
        query = query.eq("category_id", category_id)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    if low_stock:
        # This will need to be handled differently since we can't compare columns in the query builder
        # For now, fetch all and filter in Python
        pass

    query = query.order("name").limit(limit).offset(offset)
    result = query.execute()

    items = [InventoryItemResponse(**item) for item in result.data]

    # Filter low stock items if requested
    if low_stock:
        items = [item for item in items if item.quantity <= item.min_quantity]

    return items


@router.post("/items", response_model=InventoryItemResponse)
async def create_inventory_item(
    item: InventoryItemCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new inventory item"""
    item_data = item.model_dump()

    result = supabase.table("inventory_items").insert(item_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create inventory item")

    return InventoryItemResponse(**result.data[0])


@router.get("/items/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(
    item_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff", "chef", "waiter"])),
    supabase: Client = Depends(get_supabase)
):
    """Get inventory item by ID"""
    result = supabase.table("inventory_items").select("*").eq("id", item_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return InventoryItemResponse(**result.data[0])


@router.patch("/items/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: str,
    item: InventoryItemUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update inventory item"""
    update_data = item.model_dump(exclude_unset=True)

    result = supabase.table("inventory_items").update(update_data).eq("id", item_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return InventoryItemResponse(**result.data[0])


@router.delete("/items/{item_id}")
async def delete_inventory_item(
    item_id: str,
    current_user: dict = Depends(require_role(["admin"])),
    supabase: Client = Depends(get_supabase)
):
    """Delete inventory item"""
    result = supabase.table("inventory_items").delete().eq("id", item_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return {"message": "Inventory item deleted successfully"}


# =====================================================
# STOCK MOVEMENT ENDPOINTS
# =====================================================

@router.get("/movements", response_model=List[StockMovementResponse])
async def get_stock_movements(
    item_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get stock movements with filtering"""
    query = supabase.table("stock_movements").select("*")

    if item_id:
        query = query.eq("item_id", item_id)

    if movement_type:
        query = query.eq("movement_type", movement_type)

    if start_date:
        query = query.gte("created_at", start_date.isoformat())

    if end_date:
        query = query.lte("created_at", end_date.isoformat())

    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    result = query.execute()

    return [StockMovementResponse(**item) for item in result.data]


@router.post("/movements", response_model=StockMovementResponse)
async def create_stock_movement(
    movement: StockMovementCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a stock movement and update inventory quantity"""
    movement_data = movement.model_dump()
    movement_data["created_by"] = current_user["id"]

    # Get current item quantity
    item_result = supabase.table("inventory_items").select("quantity, unit_cost").eq("id", movement_data["item_id"]).execute()

    if not item_result.data:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    current_item = item_result.data[0]
    previous_quantity = Decimal(str(current_item["quantity"]))

    # Calculate new quantity based on movement type
    quantity_change = Decimal(str(movement_data["quantity"]))
    if movement_data["movement_type"] in ["in", "return"]:
        new_quantity = previous_quantity + quantity_change
    elif movement_data["movement_type"] in ["out", "damage", "expired"]:
        new_quantity = previous_quantity - quantity_change
        if new_quantity < 0:
            raise HTTPException(status_code=400, detail="Insufficient stock")
    else:  # adjustment, transfer
        new_quantity = quantity_change

    # Add calculated fields
    movement_data["previous_quantity"] = float(previous_quantity)
    movement_data["new_quantity"] = float(new_quantity)
    movement_data["unit_cost"] = movement_data.get("unit_cost") or current_item["unit_cost"]
    movement_data["total_cost"] = float(quantity_change) * float(movement_data["unit_cost"])

    # Create movement record
    movement_result = supabase.table("stock_movements").insert(movement_data).execute()

    if not movement_result.data:
        raise HTTPException(status_code=400, detail="Failed to create stock movement")

    # Update inventory quantity
    update_data = {
        "quantity": float(new_quantity),
        "last_restocked_at": datetime.now().isoformat() if movement_data["movement_type"] == "in" else current_item.get("last_restocked_at")
    }
    supabase.table("inventory_items").update(update_data).eq("id", movement_data["item_id"]).execute()

    return StockMovementResponse(**movement_result.data[0])


# =====================================================
# PURCHASE ORDER ENDPOINTS
# =====================================================

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def get_purchase_orders(
    supplier_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get purchase orders with filtering"""
    query = supabase.table("purchase_orders").select("*")

    if supplier_id:
        query = query.eq("supplier_id", supplier_id)

    if status:
        query = query.eq("status", status)

    if start_date:
        query = query.gte("order_date", start_date.isoformat())

    if end_date:
        query = query.lte("order_date", end_date.isoformat())

    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    result = query.execute()

    return [PurchaseOrderResponse(**item) for item in result.data]


@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    po: PurchaseOrderCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new purchase order"""
    po_data = po.model_dump()
    po_data["po_number"] = generate_po_number()
    po_data["created_by"] = current_user["id"]

    result = supabase.table("purchase_orders").insert(po_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create purchase order")

    return PurchaseOrderResponse(**result.data[0])


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get purchase order by ID"""
    result = supabase.table("purchase_orders").select("*").eq("id", po_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return PurchaseOrderResponse(**result.data[0])


@router.patch("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: str,
    po: PurchaseOrderUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update purchase order"""
    update_data = po.model_dump(exclude_unset=True)

    result = supabase.table("purchase_orders").update(update_data).eq("id", po_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return PurchaseOrderResponse(**result.data[0])


@router.patch("/purchase-orders/{po_id}/approve", response_model=PurchaseOrderResponse)
async def approve_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Approve a purchase order"""
    update_data = {
        "status": "approved",
        "approved_by": current_user["id"],
        "approved_at": datetime.now().isoformat()
    }

    result = supabase.table("purchase_orders").update(update_data).eq("id", po_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return PurchaseOrderResponse(**result.data[0])


# =====================================================
# PURCHASE ORDER ITEMS ENDPOINTS
# =====================================================

@router.get("/purchase-orders/{po_id}/items", response_model=List[PurchaseOrderItemResponse])
async def get_po_items(
    po_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get all items for a purchase order"""
    result = supabase.table("purchase_order_items").select("*").eq("po_id", po_id).execute()

    return [PurchaseOrderItemResponse(**item) for item in result.data]


@router.post("/purchase-orders/{po_id}/items", response_model=PurchaseOrderItemResponse)
async def add_po_item(
    po_id: str,
    item: PurchaseOrderItemCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Add item to purchase order"""
    item_data = item.model_dump()
    item_data["po_id"] = po_id

    result = supabase.table("purchase_order_items").insert(item_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to add item to purchase order")

    return PurchaseOrderItemResponse(**result.data[0])


@router.patch("/purchase-orders/{po_id}/items/{item_id}", response_model=PurchaseOrderItemResponse)
async def update_po_item(
    po_id: str,
    item_id: str,
    item: PurchaseOrderItemUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update purchase order item"""
    update_data = item.model_dump(exclude_unset=True)

    result = supabase.table("purchase_order_items").update(update_data).eq("id", item_id).eq("po_id", po_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order item not found")

    return PurchaseOrderItemResponse(**result.data[0])


@router.delete("/purchase-orders/{po_id}/items/{item_id}")
async def delete_po_item(
    po_id: str,
    item_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Delete purchase order item"""
    result = supabase.table("purchase_order_items").delete().eq("id", item_id).eq("po_id", po_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Purchase order item not found")

    return {"message": "Purchase order item deleted successfully"}


# =====================================================
# STOCK ALERTS ENDPOINTS
# =====================================================

@router.get("/alerts", response_model=List[StockAlertResponse])
async def get_stock_alerts(
    item_id: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    is_acknowledged: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get stock alerts"""
    query = supabase.table("stock_alerts").select("*")

    if item_id:
        query = query.eq("item_id", item_id)

    if alert_type:
        query = query.eq("alert_type", alert_type)

    if is_acknowledged is not None:
        query = query.eq("is_acknowledged", is_acknowledged)

    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()

    return [StockAlertResponse(**item) for item in result.data]


@router.patch("/alerts/{alert_id}/acknowledge", response_model=StockAlertResponse)
async def acknowledge_alert(
    alert_id: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Acknowledge a stock alert"""
    update_data = {
        "is_acknowledged": True,
        "acknowledged_by": current_user["id"],
        "acknowledged_at": datetime.now().isoformat()
    }

    result = supabase.table("stock_alerts").update(update_data).eq("id", alert_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Stock alert not found")

    return StockAlertResponse(**result.data[0])


# =====================================================
# STATISTICS AND REPORTS ENDPOINTS
# =====================================================

@router.get("/statistics", response_model=InventoryStatistics)
async def get_inventory_statistics(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get inventory statistics"""
    # Get all items
    items_result = supabase.table("inventory_items").select("*").eq("is_active", True).execute()
    items = items_result.data

    # Get alerts
    alerts_result = supabase.table("stock_alerts").select("*").eq("is_acknowledged", False).execute()
    alerts = alerts_result.data

    # Get recent movements
    movements_result = supabase.table("stock_movements").select("*").order("created_at", desc=True).limit(10).execute()
    recent_movements = [StockMovementResponse(**m) for m in movements_result.data]

    # Calculate statistics
    total_value = sum(Decimal(str(item["quantity"])) * Decimal(str(item["unit_cost"])) for item in items)
    low_stock = sum(1 for item in items if Decimal(str(item["quantity"])) <= Decimal(str(item["min_quantity"])))
    out_of_stock = sum(1 for item in items if Decimal(str(item["quantity"])) == 0)

    # Group by category
    by_category = {}
    for item in items:
        cat_id = item.get("category_id", "Uncategorized")
        if cat_id not in by_category:
            by_category[cat_id] = {"count": 0, "value": 0}
        by_category[cat_id]["count"] += 1
        by_category[cat_id]["value"] += float(Decimal(str(item["quantity"])) * Decimal(str(item["unit_cost"])))

    return InventoryStatistics(
        total_items=len(items),
        total_value=total_value,
        low_stock_items=low_stock,
        out_of_stock_items=out_of_stock,
        expiring_soon_items=len([a for a in alerts if a["alert_type"] == "expiring_soon"]),
        expired_items=len([a for a in alerts if a["alert_type"] == "expired"]),
        by_category=by_category,
        recent_movements=recent_movements
    )


@router.get("/reports/low-stock", response_model=List[LowStockItem])
async def get_low_stock_report(
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get low stock items report"""
    result = supabase.table("inventory_items").select("*").eq("is_active", True).execute()

    low_stock_items = []
    for item in result.data:
        if Decimal(str(item["quantity"])) <= Decimal(str(item["min_quantity"])):
            low_stock_items.append(LowStockItem(
                item_id=item["id"],
                sku=item["sku"],
                name=item["name"],
                current_quantity=Decimal(str(item["quantity"])),
                min_quantity=Decimal(str(item["min_quantity"])),
                reorder_point=Decimal(str(item["reorder_point"])) if item.get("reorder_point") else None,
                unit=item["unit"],
                category=item.get("category_id"),
                supplier=item.get("supplier_id")
            ))

    return low_stock_items


@router.get("/reports/valuation", response_model=List[InventoryValuation])
async def get_inventory_valuation(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Get inventory valuation report"""
    result = supabase.table("inventory_items").select("*").eq("is_active", True).execute()

    valuations = []
    for item in result.data:
        quantity = Decimal(str(item["quantity"]))
        unit_cost = Decimal(str(item["unit_cost"]))
        valuations.append(InventoryValuation(
            item_id=item["id"],
            sku=item["sku"],
            name=item["name"],
            quantity=quantity,
            unit_cost=unit_cost,
            total_value=quantity * unit_cost,
            category=item.get("category_id")
        ))

    return sorted(valuations, key=lambda x: x.total_value, reverse=True)
