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
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

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

    # Update menu item stock quantity
    supabase.table("menu_items").update({
        "stock_quantity": new_qty,
        "track_inventory": True,
        "cost_price": req.unit_cost,  # update latest cost price
    }).eq("id", req.menu_item_id).execute()

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
    """Get current stock levels for all tracked menu items."""
    query = supabase.table("menu_items").select(
        "id, name, category, stock_quantity, reorder_level, unit, cost_price, track_inventory, is_available"
    ).eq("track_inventory", True)

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

    # Update stock level
    supabase.table("menu_items").update({
        "stock_quantity": req.new_quantity,
    }).eq("id", req.menu_item_id).execute()

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
    ).eq("track_inventory", True).execute()

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
