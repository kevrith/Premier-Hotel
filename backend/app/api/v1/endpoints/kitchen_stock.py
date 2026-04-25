"""Kitchen Stock & Office Stock Endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import date, datetime, timezone, timedelta
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
    category: str = "General"
    current_quantity: float = 0
    min_stock: float = 0
    sort_order: int = 0
    notes: Optional[str] = None


class KitchenItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    current_quantity: Optional[float] = None
    min_stock: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class KitchenItemAdjust(BaseModel):
    delta: float          # positive = add, negative = subtract
    reason: Optional[str] = None


@router.get("/items")
async def get_kitchen_items(
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_READ_ROLES, "kitchen inventory", KITCHEN_INV_PERMISSION)
    supabase = get_supabase_admin()
    q = supabase.table("kitchen_stock_items").select("*").order("sort_order")
    if not include_inactive:
        q = q.eq("is_active", True)
    result = q.execute()
    return result.data or []


@router.post("/items")
async def create_kitchen_item(
    body: KitchenItemCreate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "kitchen inventory")
    supabase = get_supabase_admin()
    result = supabase.table("kitchen_stock_items").insert(body.dict()).execute()
    return result.data[0] if result.data else {}


@router.put("/items/{item_id}")
async def update_kitchen_item(
    item_id: str,
    body: KitchenItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "kitchen inventory")
    supabase = get_supabase_admin()
    payload = {k: v for k, v in body.dict().items() if v is not None}
    result = supabase.table("kitchen_stock_items").update(payload).eq("id", item_id).execute()
    return result.data[0] if result.data else {}


@router.post("/items/{item_id}/adjust")
async def adjust_kitchen_item_quantity(
    item_id: str,
    body: KitchenItemAdjust,
    current_user: dict = Depends(get_current_user)
):
    """Add or subtract from an item's current_quantity."""
    _require_role(current_user, ALLOWED_WRITE_ROLES, "kitchen inventory", KITCHEN_INV_PERMISSION)
    supabase = get_supabase_admin()

    # Fetch current qty
    res = supabase.table("kitchen_stock_items").select("current_quantity").eq("id", item_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    before = float(res.data["current_quantity"] or 0)
    after = before + body.delta
    if after < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot go below zero")

    supabase.table("kitchen_stock_items").update({"current_quantity": after}).eq("id", item_id).execute()

    # Log the adjustment
    supabase.table("kitchen_stock_adjustments").insert({
        "item_id": item_id,
        "adjusted_by": current_user["id"],
        "before_qty": before,
        "after_qty": after,
        "delta": body.delta,
        "reason": body.reason,
    }).execute()

    return {"item_id": item_id, "before": before, "after": after, "delta": body.delta}


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

    # Fetch previous day's closing stocks to auto-fill opening
    prev_date = (date.fromisoformat(target_date) - timedelta(days=1)).isoformat()
    pq = supabase.table("kitchen_daily_stock").select("item_id, closing_stock").eq("stock_date", prev_date)
    if branch_id:
        pq = pq.eq("branch_id", branch_id)
    prev_res = pq.execute()
    prev_closing = {r["item_id"]: float(r["closing_stock"] or 0) for r in (prev_res.data or [])}

    # Merge — opening auto-fills from prev day if no record exists for today
    merged = []
    for item in items:
        log = logs_by_item.get(item["id"], {})
        merged.append({
            "item_id": item["id"],
            "name": item["name"],
            "unit": item["unit"],
            "sort_order": item["sort_order"],
            "stock_date": target_date,
            "opening_stock": log.get("opening_stock", prev_closing.get(item["id"], 0)),
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
    permanent: bool = False,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_OFFICE_WRITE, "office inventory")
    supabase = get_supabase_admin()
    if permanent:
        supabase.table("office_stock_items").delete().eq("id", item_id).execute()
    else:
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


# ─── Kitchen Ingredients (raw materials catalogue) ────────────────────────────

INGREDIENTS_PERMISSION = "can_manage_ingredients"
ALLOWED_INGREDIENTS_READ = {"admin", "manager", "owner", "chef"}
ALLOWED_INGREDIENTS_WRITE = {"admin", "manager", "chef"}


class IngredientCreate(BaseModel):
    name: str
    unit: str = "kg"
    category: str = "General"
    current_stock: float = 0
    min_stock: float = 0
    sort_order: int = 0
    notes: Optional[str] = None


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    current_stock: Optional[float] = None
    min_stock: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class IngredientStockUpsert(BaseModel):
    ingredient_id: str
    opening_stock: float = 0
    purchases: float = 0
    used: float = 0
    waste: float = 0
    closing_stock: float = 0
    notes: Optional[str] = None


@router.get("/ingredients")
async def get_ingredients(
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_INGREDIENTS_READ, "ingredients", INGREDIENTS_PERMISSION)
    supabase = get_supabase_admin()
    q = supabase.table("kitchen_ingredients").select("*").order("sort_order")
    if not include_inactive:
        q = q.eq("is_active", True)
    result = q.execute()
    return result.data or []


@router.post("/ingredients")
async def create_ingredient(
    body: IngredientCreate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "ingredients")
    supabase = get_supabase_admin()
    result = supabase.table("kitchen_ingredients").insert(body.dict()).execute()
    return result.data[0] if result.data else {}


@router.put("/ingredients/{ingredient_id}")
async def update_ingredient(
    ingredient_id: str,
    body: IngredientUpdate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "ingredients")
    supabase = get_supabase_admin()
    payload = {k: v for k, v in body.dict().items() if v is not None}
    result = supabase.table("kitchen_ingredients").update(payload).eq("id", ingredient_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(
    ingredient_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "ingredients")
    supabase = get_supabase_admin()
    supabase.table("kitchen_ingredients").update({"is_active": False}).eq("id", ingredient_id).execute()
    return {"ok": True}


# ─── Ingredient Daily Stock Takes ─────────────────────────────────────────────

@router.get("/ingredients/daily")
async def get_ingredient_daily_stock(
    stock_date: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get ingredient stock take for a given date (defaults to today)."""
    _require_role(current_user, ALLOWED_INGREDIENTS_READ, "ingredients stock", INGREDIENTS_PERMISSION)
    supabase = get_supabase_admin()
    target_date = stock_date or date.today().isoformat()

    ingredients_res = supabase.table("kitchen_ingredients").select("*").eq("is_active", True).order("sort_order").execute()
    ingredients = ingredients_res.data or []

    q = supabase.table("kitchen_ingredient_stock_takes").select("*").eq("stock_date", target_date)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    logs_res = q.execute()
    logs_by_item = {r["ingredient_id"]: r for r in (logs_res.data or [])}

    # Auto-fill opening from previous day's closing
    prev_date = (date.fromisoformat(target_date) - timedelta(days=1)).isoformat()
    pq = supabase.table("kitchen_ingredient_stock_takes").select("ingredient_id, closing_stock").eq("stock_date", prev_date)
    if branch_id:
        pq = pq.eq("branch_id", branch_id)
    prev_res = pq.execute()
    prev_closing = {r["ingredient_id"]: float(r["closing_stock"] or 0) for r in (prev_res.data or [])}

    merged = []
    for ing in ingredients:
        log = logs_by_item.get(ing["id"], {})
        opening = log.get("opening_stock", prev_closing.get(ing["id"], 0))
        purchases = log.get("purchases", 0)
        waste = log.get("waste", 0)
        closing = log.get("closing_stock", 0)
        merged.append({
            "ingredient_id": ing["id"],
            "name": ing["name"],
            "unit": ing["unit"],
            "category": ing["category"],
            "sort_order": ing["sort_order"],
            "stock_date": target_date,
            "opening_stock": opening,
            "purchases": purchases,
            "waste": waste,
            "closing_stock": closing,
            "log_id": log.get("id"),
            "submitted_by": log.get("submitted_by"),
            "notes": log.get("notes", ""),
        })
    return {"date": target_date, "items": merged}


@router.post("/ingredients/daily")
async def upsert_ingredient_daily_stock(
    stock_date: str,
    items: List[IngredientStockUpsert],
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Save ingredient stock take for a given date."""
    _require_role(current_user, ALLOWED_INGREDIENTS_WRITE, "ingredients stock", INGREDIENTS_PERMISSION)
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    rows = []
    for it in items:
        rows.append({
            "ingredient_id": it.ingredient_id,
            "stock_date": stock_date,
            "branch_id": branch_id,
            "opening_stock": it.opening_stock,
            "purchases": it.purchases,
            "used": it.used,
            "waste": it.waste,
            "closing_stock": it.closing_stock,
            "notes": it.notes,
            "submitted_by": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    result = supabase.table("kitchen_ingredient_stock_takes").upsert(
        rows, on_conflict="ingredient_id,stock_date,branch_id"
    ).execute()
    return {"saved": len(result.data or []), "date": stock_date}


@router.get("/ingredients/daily/dates")
async def get_ingredient_stock_dates(
    branch_id: Optional[str] = None,
    limit: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Return list of dates that have ingredient stock take records."""
    _require_role(current_user, ALLOWED_INGREDIENTS_READ, "ingredients stock", INGREDIENTS_PERMISSION)
    supabase = get_supabase_admin()
    q = supabase.table("kitchen_ingredient_stock_takes").select("stock_date").order("stock_date", desc=True).limit(limit)
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


# ─── Utensil / Cutlery Stock ──────────────────────────────────────────────────

UTENSILS_PERMISSION = "can_manage_utensils_stock"
ALLOWED_UTENSILS_READ = {"admin", "manager", "owner", "chef", "waiter"}
ALLOWED_UTENSILS_WRITE = {"admin", "manager", "chef", "waiter"}


class UtensilItemCreate(BaseModel):
    name: str
    category: str = "General"
    sort_order: int = 0
    notes: Optional[str] = None


class UtensilItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class UtensilStockUpsert(BaseModel):
    utensil_id: str
    opening_count: int = 0
    closing_count: int = 0
    broken: int = 0
    notes: Optional[str] = None


@router.get("/utensils")
async def get_utensil_items(
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_UTENSILS_READ, "utensils", UTENSILS_PERMISSION)
    supabase = get_supabase_admin()
    q = supabase.table("utensil_items").select("*").order("sort_order")
    if not include_inactive:
        q = q.eq("is_active", True)
    return q.execute().data or []


@router.post("/utensils")
async def create_utensil_item(
    body: UtensilItemCreate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "utensils")
    supabase = get_supabase_admin()
    result = supabase.table("utensil_items").insert(body.dict()).execute()
    return result.data[0] if result.data else {}


@router.put("/utensils/{utensil_id}")
async def update_utensil_item(
    utensil_id: str,
    body: UtensilItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "utensils")
    supabase = get_supabase_admin()
    payload = {k: v for k, v in body.dict().items() if v is not None}
    result = supabase.table("utensil_items").update(payload).eq("id", utensil_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/utensils/{utensil_id}")
async def delete_utensil_item(
    utensil_id: str,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, {"admin", "manager"}, "utensils")
    supabase = get_supabase_admin()
    supabase.table("utensil_items").update({"is_active": False}).eq("id", utensil_id).execute()
    return {"ok": True}


@router.get("/utensils/daily")
async def get_utensil_daily_stock(
    stock_date: Optional[str] = None,
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get utensil counts for a date, with opening auto-filled from previous day closing."""
    _require_role(current_user, ALLOWED_UTENSILS_READ, "utensils stock", UTENSILS_PERMISSION)
    supabase = get_supabase_admin()
    target_date = stock_date or date.today().isoformat()

    items_res = supabase.table("utensil_items").select("*").eq("is_active", True).order("sort_order").execute()
    items = items_res.data or []

    q = supabase.table("utensil_stock_takes").select("*").eq("stock_date", target_date)
    if branch_id:
        q = q.eq("branch_id", branch_id)
    logs_res = q.execute()
    logs_by_item = {r["utensil_id"]: r for r in (logs_res.data or [])}

    prev_date = (date.fromisoformat(target_date) - timedelta(days=1)).isoformat()
    pq = supabase.table("utensil_stock_takes").select("utensil_id, closing_count").eq("stock_date", prev_date)
    if branch_id:
        pq = pq.eq("branch_id", branch_id)
    prev_res = pq.execute()
    prev_closing = {r["utensil_id"]: int(r["closing_count"] or 0) for r in (prev_res.data or [])}

    merged = []
    for item in items:
        log = logs_by_item.get(item["id"], {})
        opening = log.get("opening_count", prev_closing.get(item["id"], 0))
        closing = log.get("closing_count", 0)
        broken = log.get("broken", 0)
        lost = max(0, opening - closing - broken)
        merged.append({
            "utensil_id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "sort_order": item["sort_order"],
            "stock_date": target_date,
            "opening_count": opening,
            "closing_count": closing,
            "broken": broken,
            "lost": lost,
            "notes": log.get("notes", ""),
            "log_id": log.get("id"),
            "submitted_by": log.get("submitted_by"),
        })
    return {"date": target_date, "items": merged}


@router.post("/utensils/daily")
async def upsert_utensil_daily_stock(
    stock_date: str,
    items: List[UtensilStockUpsert],
    branch_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Save utensil count take — lost is auto-computed from opening - closing - broken."""
    _require_role(current_user, ALLOWED_UTENSILS_WRITE, "utensils stock", UTENSILS_PERMISSION)
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    rows = []
    for it in items:
        lost = max(0, it.opening_count - it.closing_count - it.broken)
        rows.append({
            "utensil_id": it.utensil_id,
            "stock_date": stock_date,
            "branch_id": branch_id,
            "opening_count": it.opening_count,
            "closing_count": it.closing_count,
            "broken": it.broken,
            "lost": lost,
            "notes": it.notes,
            "submitted_by": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    result = supabase.table("utensil_stock_takes").upsert(
        rows, on_conflict="utensil_id,stock_date,branch_id"
    ).execute()
    return {"saved": len(result.data or []), "date": stock_date}


@router.get("/utensils/daily/dates")
async def get_utensil_stock_dates(
    branch_id: Optional[str] = None,
    limit: int = 30,
    current_user: dict = Depends(get_current_user)
):
    _require_role(current_user, ALLOWED_UTENSILS_READ, "utensils stock", UTENSILS_PERMISSION)
    supabase = get_supabase_admin()
    q = supabase.table("utensil_stock_takes").select("stock_date").order("stock_date", desc=True).limit(limit)
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
