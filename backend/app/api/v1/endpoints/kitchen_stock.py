"""Kitchen Stock & Office Stock Endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import date, datetime, timezone
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

router = APIRouter()

ALLOWED_READ_ROLES = {"admin", "manager", "owner", "chef"}
ALLOWED_WRITE_ROLES = {"admin", "manager", "chef"}
ALLOWED_OFFICE_READ = {"admin", "manager", "owner"}
ALLOWED_OFFICE_WRITE = {"admin", "manager"}

KITCHEN_INV_PERMISSION = "can_manage_kitchen_inventory"


def _require_role(user: dict, roles: set, label: str = "this action", extra_permission: str | None = None):
    if user["role"] in roles:
        return
    if extra_permission:
        perms = user.get("permissions") or []
        if extra_permission in perms:
            return
    raise HTTPException(status_code=403, detail=f"Not authorised for {label}")


# ─── Kitchen Stock Items (catalogue) ─────────────────────────────────────────

class KitchenItemCreate(BaseModel):
    name: str
    unit: str = "kg"
    sort_order: int = 0


class KitchenItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/items")
async def get_kitchen_items(
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_READ_ROLES, "kitchen inventory", KITCHEN_INV_PERMISSION)
    supabase = get_supabase_admin()
    result = supabase.table("kitchen_stock_items").select("*").order("sort_order").execute()
    return result.data or []


@router.post("/items")
async def create_kitchen_item(
    body: KitchenItemCreate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_WRITE_ROLES, "kitchen inventory")
    supabase = get_supabase_admin()
    result = supabase.table("kitchen_stock_items").insert(body.dict()).execute()
    return result.data[0] if result.data else {}


@router.put("/items/{item_id}")
async def update_kitchen_item(
    item_id: str,
    body: KitchenItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_WRITE_ROLES, "kitchen inventory")
    supabase = get_supabase_admin()
    payload = {k: v for k, v in body.dict().items() if v is not None}
    result = supabase.table("kitchen_stock_items").update(payload).eq("id", item_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/items/{item_id}")
async def delete_kitchen_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "kitchen inventory")
    supabase = get_supabase_admin()
    supabase.table("kitchen_stock_items").update({"is_active": False}).eq("id", item_id).execute()
    return {"ok": True}


# ─── Kitchen Daily Stock Takes ────────────────────────────────────────────────

class DailyStockUpsert(BaseModel):
    item_id: str
    opening_stock: float = 0
    purchases: float = 0
    closing_stock: float = 0
    notes: Optional[str] = None


@router.get("/daily")
async def get_kitchen_daily_stock(
    stock_date: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get kitchen stock for a given date (defaults to today)."""
    _require_role(current_user, ALLOWED_READ_ROLES, "kitchen stock", KITCHEN_INV_PERMISSION)
    supabase = get_supabase_admin()
    target_date = stock_date or date.today().isoformat()

    # Fetch all active items
    items_res = supabase.table("kitchen_stock_items").select("*").eq("is_active", True).order("sort_order").execute()
    items = items_res.data or []

    # Fetch existing records for that date
    q = supabase.table("kitchen_daily_stock").select("*").eq("stock_date", target_date)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    logs_res = q.execute()
    logs_by_item = {r["item_id"]: r for r in (logs_res.data or [])}

    # Merge
    merged = []
    for item in items:
        log = logs_by_item.get(item["id"], {})
        merged.append({
            "item_id": item["id"],
            "name": item["name"],
            "unit": item["unit"],
            "sort_order": item["sort_order"],
            "stock_date": target_date,
            "opening_stock": log.get("opening_stock", 0),
            "purchases": log.get("purchases", 0),
            "closing_stock": log.get("closing_stock", 0),
            "notes": log.get("notes", ""),
            "log_id": log.get("id"),
            "submitted_by": log.get("submitted_by"),
        })
    return {"date": target_date, "items": merged}


@router.post("/daily")
async def upsert_kitchen_daily_stock(
    stock_date: str,
    items: List[DailyStockUpsert],
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Save kitchen stock for a given date (admin/manager/chef + permitted staff)."""
    _require_role(current_user, ALLOWED_WRITE_ROLES, "kitchen stock", KITCHEN_INV_PERMISSION)
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    rows = []
    for it in items:
        rows.append({
            "item_id": it.item_id,
            "stock_date": stock_date,
            "branch_id": branch_id,
            "opening_stock": it.opening_stock,
            "purchases": it.purchases,
            "closing_stock": it.closing_stock,
            "notes": it.notes,
            "submitted_by": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    result = supabase.table("kitchen_daily_stock").upsert(
        rows, on_conflict="item_id,stock_date,branch_id"
    ).execute()
    return {"saved": len(result.data or []), "date": stock_date}


@router.get("/daily/dates")
async def get_kitchen_stock_dates(
    branch_id: Optional[str] = None,
    limit: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Return list of dates that have kitchen stock records."""
    _require_role(current_user, ALLOWED_READ_ROLES, "kitchen stock", KITCHEN_INV_PERMISSION)
    supabase = get_supabase_admin()
    q = supabase.table("kitchen_daily_stock").select("stock_date").order("stock_date", desc=True).limit(limit)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    res = q.execute()
    seen = set()
    dates = []
    for r in (res.data or []):
        d = r["stock_date"]
        if d not in seen:
            seen.add(d)
            dates.append(d)
    return dates


# ─── Office Stock Items (catalogue) ──────────────────────────────────────────

class OfficeItemCreate(BaseModel):
    name: str
    unit: str = "pieces"
    category: str = "General"
    min_stock: float = 0
    sort_order: int = 0


class OfficeItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    min_stock: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/office/items")
async def get_office_items(
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_OFFICE_READ, "office inventory")
    supabase = get_supabase_admin()
    result = supabase.table("office_stock_items").select("*").eq("is_active", True).order("sort_order").execute()
    return result.data or []


@router.post("/office/items")
async def create_office_item(
    body: OfficeItemCreate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_OFFICE_WRITE, "office inventory")
    supabase = get_supabase_admin()
    result = supabase.table("office_stock_items").insert(body.dict()).execute()
    return result.data[0] if result.data else {}


@router.put("/office/items/{item_id}")
async def update_office_item(
    item_id: str,
    body: OfficeItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_OFFICE_WRITE, "office inventory")
    supabase = get_supabase_admin()
    payload = {k: v for k, v in body.dict().items() if v is not None}
    result = supabase.table("office_stock_items").update(payload).eq("id", item_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/office/items/{item_id}")
async def delete_office_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_OFFICE_WRITE, "office inventory")
    supabase = get_supabase_admin()
    supabase.table("office_stock_items").update({"is_active": False}).eq("id", item_id).execute()
    return {"ok": True}


# ─── Office Stock Takes ───────────────────────────────────────────────────────

class OfficeStockUpsert(BaseModel):
    item_id: str
    opening_stock: float = 0
    received: float = 0
    used: float = 0
    closing_stock: float = 0
    notes: Optional[str] = None


@router.get("/office/daily")
async def get_office_daily_stock(
    stock_date: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get office stock for a given date (defaults to today)."""
    _require_role(current_user, ALLOWED_OFFICE_READ, "office stock")
    supabase = get_supabase_admin()
    target_date = stock_date or date.today().isoformat()

    items_res = supabase.table("office_stock_items").select("*").eq("is_active", True).order("sort_order").execute()
    items = items_res.data or []

    q = supabase.table("office_stock_takes").select("*").eq("stock_date", target_date)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    logs_res = q.execute()
    logs_by_item = {r["item_id"]: r for r in (logs_res.data or [])}

    merged = []
    for item in items:
        log = logs_by_item.get(item["id"], {})
        merged.append({
            "item_id": item["id"],
            "name": item["name"],
            "unit": item["unit"],
            "category": item["category"],
            "min_stock": item["min_stock"],
            "stock_date": target_date,
            "opening_stock": log.get("opening_stock", 0),
            "received": log.get("received", 0),
            "used": log.get("used", 0),
            "closing_stock": log.get("closing_stock", 0),
            "notes": log.get("notes", ""),
            "log_id": log.get("id"),
        })
    return {"date": target_date, "items": merged}


@router.post("/office/daily")
async def upsert_office_daily_stock(
    stock_date: str,
    items: List[OfficeStockUpsert],
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Save office stock for a given date (admin/manager only)."""
    _require_role(current_user, ALLOWED_OFFICE_WRITE, "office stock")
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    rows = []
    for it in items:
        rows.append({
            "item_id": it.item_id,
            "stock_date": stock_date,
            "branch_id": branch_id,
            "opening_stock": it.opening_stock,
            "received": it.received,
            "used": it.used,
            "closing_stock": it.closing_stock,
            "notes": it.notes,
            "submitted_by": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    result = supabase.table("office_stock_takes").upsert(
        rows, on_conflict="item_id,stock_date,branch_id"
    ).execute()
    return {"saved": len(result.data or []), "date": stock_date}


@router.get("/office/daily/dates")
async def get_office_stock_dates(
    branch_id: Optional[str] = None,
    limit: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Return list of dates that have office stock records."""
    _require_role(current_user, ALLOWED_OFFICE_READ, "office stock")
    supabase = get_supabase_admin()
    q = supabase.table("office_stock_takes").select("stock_date").order("stock_date", desc=True).limit(limit)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    res = q.execute()
    seen = set()
    dates = []
    for r in (res.data or []):
        d = r["stock_date"]
        if d not in seen:
            seen.add(d)
            dates.append(d)
    return dates
