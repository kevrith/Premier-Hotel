"""
Maintenance Flags & Linen Inventory Endpoints
Cleaners report room issues; managers/admin resolve them.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

router = APIRouter()


class CreateMaintenanceFlag(BaseModel):
    room_id: str
    task_id: Optional[str] = None
    issue_type: str  # plumbing, electrical, furniture, hvac, appliance, structural, cleanliness, linen, other
    title: str
    description: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent


class ResolveMaintenanceFlag(BaseModel):
    resolution_notes: Optional[str] = None
    status: str = "resolved"  # resolved, in_progress, cancelled


class LinenMovement(BaseModel):
    linen_item_id: str
    room_id: Optional[str] = None
    task_id: Optional[str] = None
    movement_type: str  # issued, returned, sent_to_laundry, returned_from_laundry, damaged, disposed
    quantity: int = 1
    notes: Optional[str] = None


class UpdateLinenItem(BaseModel):
    total_quantity: Optional[int] = None
    in_use_quantity: Optional[int] = None
    in_laundry_quantity: Optional[int] = None
    damaged_quantity: Optional[int] = None
    notes: Optional[str] = None


# ─── Maintenance Flags ────────────────────────────────────────────────────────

@router.post("/flags")
async def report_maintenance_flag(
    data: CreateMaintenanceFlag,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Cleaner reports a maintenance/repair issue in a room"""
    payload = {
        "room_id": data.room_id,
        "task_id": data.task_id,
        "reported_by": current_user["id"],
        "issue_type": data.issue_type,
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
        "status": "open",
    }
    result = supabase.table("maintenance_flags").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create flag")
    return result.data[0]


@router.get("/flags")
async def list_maintenance_flags(
    status: Optional[str] = Query(default=None),
    room_id: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    limit: int = Query(default=100),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List maintenance flags — cleaners see their own; staff/managers see all"""
    query = supabase.table("maintenance_flags").select("*").order("created_at", desc=True).limit(limit)

    role = current_user.get("role", "")
    if role in ("cleaner", "housekeeping"):
        query = query.eq("reported_by", current_user["id"])

    if status:
        query = query.eq("status", status)
    if room_id:
        query = query.eq("room_id", room_id)
    if priority:
        query = query.eq("priority", priority)

    result = query.execute()
    return result.data or []


@router.get("/flags/summary")
async def maintenance_flags_summary(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Summary counts for manager/admin dashboard"""
    if current_user.get("role") not in ["admin", "manager", "owner"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = supabase.table("maintenance_flags").select("status, priority").execute()
    flags = result.data or []
    return {
        "open": sum(1 for f in flags if f["status"] == "open"),
        "in_progress": sum(1 for f in flags if f["status"] == "in_progress"),
        "resolved": sum(1 for f in flags if f["status"] == "resolved"),
        "urgent": sum(1 for f in flags if f["priority"] == "urgent" and f["status"] == "open"),
    }


@router.patch("/flags/{flag_id}")
async def update_maintenance_flag(
    flag_id: str,
    data: ResolveMaintenanceFlag,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Manager/Admin updates flag status (in_progress, resolved, cancelled)"""
    if current_user.get("role") not in ["admin", "manager", "owner"]:
        raise HTTPException(status_code=403, detail="Manager access required")

    update = {
        "status": data.status,
        "resolution_notes": data.resolution_notes,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if data.status == "resolved":
        update["resolved_by"] = current_user["id"]
        update["resolved_at"] = datetime.now(timezone.utc).isoformat()

    result = supabase.table("maintenance_flags").update(update).eq("id", flag_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Flag not found")
    return result.data[0]


# ─── Linen Inventory ─────────────────────────────────────────────────────────

@router.get("/linen")
async def list_linen_inventory(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all linen inventory items"""
    result = supabase.table("room_linen_inventory").select("*").order("category, item_name").execute()
    return result.data or []


@router.patch("/linen/{item_id}")
async def update_linen_item(
    item_id: str,
    data: UpdateLinenItem,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Manager updates linen quantities"""
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("room_linen_inventory").update(update).eq("id", item_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return result.data[0]


@router.post("/linen/movement")
async def log_linen_movement(
    data: LinenMovement,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Log a linen movement (issued, returned, laundry, damaged)"""
    payload = {
        "linen_item_id": data.linen_item_id,
        "room_id": data.room_id,
        "task_id": data.task_id,
        "moved_by": current_user["id"],
        "movement_type": data.movement_type,
        "quantity": data.quantity,
        "notes": data.notes,
    }
    result = supabase.table("linen_movements").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to log movement")

    # Update linen inventory counts based on movement type
    item_res = supabase.table("room_linen_inventory").select("*").eq("id", data.linen_item_id).execute()
    if item_res.data:
        item = item_res.data[0]
        qty = data.quantity
        update = {}
        if data.movement_type == "issued":
            update["in_use_quantity"] = max(0, (item.get("in_use_quantity") or 0) + qty)
        elif data.movement_type == "returned":
            update["in_use_quantity"] = max(0, (item.get("in_use_quantity") or 0) - qty)
        elif data.movement_type == "sent_to_laundry":
            update["in_laundry_quantity"] = max(0, (item.get("in_laundry_quantity") or 0) + qty)
            update["in_use_quantity"] = max(0, (item.get("in_use_quantity") or 0) - qty)
        elif data.movement_type == "returned_from_laundry":
            update["in_laundry_quantity"] = max(0, (item.get("in_laundry_quantity") or 0) - qty)
        elif data.movement_type == "damaged":
            update["damaged_quantity"] = max(0, (item.get("damaged_quantity") or 0) + qty)
            update["in_use_quantity"] = max(0, (item.get("in_use_quantity") or 0) - qty)
        elif data.movement_type == "disposed":
            update["total_quantity"] = max(0, (item.get("total_quantity") or 0) - qty)
            update["damaged_quantity"] = max(0, (item.get("damaged_quantity") or 0) - qty)
        if update:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("room_linen_inventory").update(update).eq("id", data.linen_item_id).execute()

    return result.data[0]


@router.get("/linen/movements")
async def list_linen_movements(
    room_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Linen movement history"""
    query = supabase.table("linen_movements").select("*").order("created_at", desc=True).limit(limit)
    if room_id:
        query = query.eq("room_id", room_id)
    result = query.execute()
    return result.data or []
