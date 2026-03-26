"""
Stock/Inventory Management Endpoints
Handles stock receiving, adjustments, and inventory tracking
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone, date, timedelta
from supabase import Client
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin, get_supabase
from app.middleware.auth_secure import get_current_user
from app.core.cache import cache_get, cache_set, cache_invalidate

router = APIRouter()


def generate_receipt_number() -> str:
    import random, string
    return "RCV-" + datetime.now(timezone.utc).strftime('%Y%m%d') + "-" + "".join(random.choices(string.digits, k=4))


class StockReceiveRequest(BaseModel):
    menu_item_id: str
    quantity: float
    unit_cost: float
    supplier: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    received_at: Optional[str] = None  # ISO date string, defaults to now


class StockAdjustRequest(BaseModel):
    menu_item_id: str
    new_quantity: float
    reason: str


class UpdateMenuItemStockSettings(BaseModel):
    track_inventory: bool
    reorder_level: Optional[float] = 0
    unit: Optional[str] = "piece"
    cost_price: Optional[float] = 0
    stock_department: Optional[str] = None  # 'kitchen', 'bar', 'both', or None (auto)


class CreateStockItemRequest(BaseModel):
    name: str
    category: str
    unit: str = "kg"
    reorder_level: float = 0
    cost_price: float = 0
    stock_department: Optional[str] = "kitchen"  # 'kitchen', 'bar', 'both'
    initial_quantity: float = 0


class UpdateStockItemRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[float] = None
    cost_price: Optional[float] = None
    stock_department: Optional[str] = None


@router.post("/receive")
async def receive_stock(
    req: StockReceiveRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Record receiving of stock items (e.g., buying water, soda, alcohol).
    Increases the menu item's stock_quantity.
    """
    user_role = current_user.get("role", "")
    if user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can receive stock")

    # Fetch menu item
    item_res = supabase.table("menu_items").select("*").eq("id", req.menu_item_id).execute()
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item = item_res.data[0]
    current_qty = float(item.get("stock_quantity", 0) or 0)
    new_qty = current_qty + req.quantity
    total_cost = req.quantity * req.unit_cost

    receipt_number = generate_receipt_number()
    received_at = req.received_at or datetime.now(timezone.utc).isoformat()

    # Insert receipt record
    receipt_res = supabase.table("stock_receipts").insert({
        "receipt_number": receipt_number,
        "menu_item_id": req.menu_item_id,
        "item_name": item["name"],
        "quantity": req.quantity,
        "unit": item.get("unit", "piece"),
        "unit_cost": req.unit_cost,
        "total_cost": total_cost,
        "supplier": req.supplier,
        "invoice_number": req.invoice_number,
        "received_by": current_user["id"],
        "received_at": received_at,
        "notes": req.notes,
    }).execute()

    # Update menu item stock quantity and auto-toggle availability
    supabase.table("menu_items").update({
        "stock_quantity": new_qty,
        "track_inventory": True,
        "cost_price": req.unit_cost,
        "is_available": new_qty > 0,  # auto-available when stock > 0
    }).eq("id", req.menu_item_id).execute()

    cache_invalidate("stock_levels")
    return {
        "success": True,
        "receipt_number": receipt_number,
        "item_name": item["name"],
        "quantity_added": req.quantity,
        "new_stock_level": new_qty,
        "total_cost": total_cost,
    }


@router.get("/levels")
async def get_stock_levels(
    category: Optional[str] = None,
    low_stock_only: bool = False,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get current stock levels for all tracked menu items (or any with qty > 0)."""
    # 60-second cache (stock changes frequently — short TTL keeps it fresh)
    cache_key_args = dict(category=category or "all", low_stock_only=low_stock_only)
    cached = cache_get("stock_levels", **cache_key_args)
    if cached is not None:
        return cached

    query = supabase.table("menu_items").select(
        "id, name, category, stock_quantity, reorder_level, unit, cost_price, base_price, track_inventory, is_available, stock_department"
    ).or_("track_inventory.eq.true,stock_quantity.gt.0")

    if category:
        query = query.eq("category", category)

    result = query.order("name").execute()
    items = result.data or []

    if low_stock_only:
        items = [i for i in items if float(i.get("stock_quantity", 0)) <= float(i.get("reorder_level", 0))]

    # Add stock status
    for item in items:
        qty = float(item.get("stock_quantity", 0))
        reorder = float(item.get("reorder_level", 0))
        if qty <= 0:
            item["stock_status"] = "out_of_stock"
        elif qty <= reorder:
            item["stock_status"] = "low_stock"
        else:
            item["stock_status"] = "in_stock"

    cache_set("stock_levels", items, ttl=60, **cache_key_args)
    return items


@router.get("/receipts")
async def get_stock_receipts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    menu_item_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get stock receipt history."""
    if not start_date:
        start_date = (date.today() - timedelta(days=30)).isoformat()
    if not end_date:
        end_date = date.today().isoformat()

    query = supabase.table("stock_receipts").select("*")\
        .gte("received_at", f"{start_date}T00:00:00")\
        .lte("received_at", f"{end_date}T23:59:59")

    if menu_item_id:
        query = query.eq("menu_item_id", menu_item_id)

    result = query.order("received_at", desc=True).execute()
    return result.data or []


@router.post("/adjust")
async def adjust_stock(
    req: StockAdjustRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Manually adjust stock level (e.g., after physical stocktake)."""
    user_role = current_user.get("role", "")
    if user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can adjust stock")

    item_res = supabase.table("menu_items").select("*").eq("id", req.menu_item_id).execute()
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item = item_res.data[0]
    qty_before = float(item.get("stock_quantity", 0) or 0)
    adjustment_type = "increase" if req.new_quantity > qty_before else ("decrease" if req.new_quantity < qty_before else "recount")

    # Log adjustment
    try:
        supabase.table("stock_adjustments").insert({
            "menu_item_id": req.menu_item_id,
            "item_name": item["name"],
            "adjustment_type": adjustment_type,
            "quantity_before": qty_before,
            "quantity_after": req.new_quantity,
            "reason": req.reason,
            "adjusted_by": current_user["id"],
        }).execute()
    except Exception:
        pass

    # Update stock level and auto-toggle availability for tracked items
    supabase.table("menu_items").update({
        "stock_quantity": req.new_quantity,
        "is_available": req.new_quantity > 0,
    }).eq("id", req.menu_item_id).execute()

    cache_invalidate("stock_levels")
    return {
        "success": True,
        "item_name": item["name"],
        "quantity_before": qty_before,
        "quantity_after": req.new_quantity,
        "adjustment": req.new_quantity - qty_before,
    }


@router.patch("/settings/{menu_item_id}")
async def update_item_stock_settings(
    menu_item_id: str,
    req: UpdateMenuItemStockSettings,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Enable/disable inventory tracking for a menu item and set reorder level."""
    user_role = current_user.get("role", "")
    if user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can change stock settings")

    supabase.table("menu_items").update({
        "track_inventory": req.track_inventory,
        "reorder_level": req.reorder_level,
        "unit": req.unit,
        "cost_price": req.cost_price,
        "stock_department": req.stock_department,
    }).eq("id", menu_item_id).execute()

    return {"success": True}


@router.get("/summary")
async def get_stock_summary(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get stock summary stats for dashboard."""
    items_res = supabase.table("menu_items").select(
        "stock_quantity, reorder_level, cost_price, track_inventory"
    ).or_("track_inventory.eq.true,stock_quantity.gt.0").execute()

    items = items_res.data or []
    total_items = len(items)
    low_stock = sum(1 for i in items if float(i.get("stock_quantity", 0)) <= float(i.get("reorder_level", 0)) and float(i.get("stock_quantity", 0)) > 0)
    out_of_stock = sum(1 for i in items if float(i.get("stock_quantity", 0)) <= 0)
    total_value = sum(float(i.get("stock_quantity", 0)) * float(i.get("cost_price", 0)) for i in items)

    # Recent receipts (last 7 days)
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    receipts_res = supabase.table("stock_receipts").select("total_cost")\
        .gte("received_at", f"{week_ago}T00:00:00").execute()
    week_purchases = sum(float(r.get("total_cost", 0)) for r in (receipts_res.data or []))

    return {
        "total_tracked_items": total_items,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "total_inventory_value": round(total_value, 2),
        "week_purchases": round(week_purchases, 2),
    }


@router.post("/items")
async def create_stock_item(
    req: CreateStockItemRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a new tracked inventory item (kitchen/bar ingredient, not a menu item)."""
    user_role = current_user.get("role", "")
    if user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can add inventory items")

    # Check for duplicate name
    existing = supabase.table("menu_items").select("id").eq("name", req.name).eq("track_inventory", True).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail=f"Tracked item '{req.name}' already exists")

    # Create menu_item with track_inventory=true, hidden from menu (is_available=false, base_price=0)
    import uuid
    result = supabase.table("menu_items").insert({
        "id": str(uuid.uuid4()),
        "name": req.name,
        "category": req.category,
        "unit": req.unit,
        "reorder_level": req.reorder_level,
        "cost_price": req.cost_price,
        "stock_department": req.stock_department,
        "stock_quantity": req.initial_quantity,
        "track_inventory": True,
        "is_available": False,  # hidden from menu — it's an ingredient
        "base_price": 0,
        "description": f"Kitchen/bar inventory item — managed via stock system",
    }).execute()

    return {"success": True, "item": result.data[0] if result.data else None}


@router.patch("/items/{item_id}")
async def update_stock_item(
    item_id: str,
    req: UpdateStockItemRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update details (name, category, unit, reorder level, cost price, department) of a tracked item."""
    user_role = current_user.get("role", "")
    if user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can edit inventory items")

    # Build update payload from non-None fields
    payload = {}
    if req.name is not None:
        payload["name"] = req.name
    if req.category is not None:
        payload["category"] = req.category
    if req.unit is not None:
        payload["unit"] = req.unit
    if req.reorder_level is not None:
        payload["reorder_level"] = req.reorder_level
    if req.cost_price is not None:
        payload["cost_price"] = req.cost_price
    if req.stock_department is not None:
        payload["stock_department"] = req.stock_department

    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    supabase.table("menu_items").update(payload).eq("id", item_id).execute()
    return {"success": True}


@router.delete("/items/{item_id}")
async def delete_stock_item(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete a tracked inventory item (only items with is_available=false are deletable)."""
    user_role = current_user.get("role", "")
    if user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only managers and admins can delete inventory items")

    # Safety: only allow deleting items that are hidden from menu (pure inventory items)
    item_res = supabase.table("menu_items").select("id, name, is_available, base_price").eq("id", item_id).execute()
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Item not found")

    item = item_res.data[0]
    if item.get("is_available") or float(item.get("base_price", 0)) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete items that are on the menu. Disable tracking instead."
        )

    supabase.table("menu_items").delete().eq("id", item_id).execute()
    return {"success": True, "deleted": item["name"]}
