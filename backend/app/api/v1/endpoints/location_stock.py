"""
Multi-Location Stock Management Endpoints
Manages per-location stock for bars, kitchen, and central store.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import date, datetime, timezone
from supabase import Client
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

logger = logging.getLogger(__name__)

# Two separate routers in the same file.
# locations_router  → mounted at /locations
# stock_router      → mounted at /location-stock
locations_router = APIRouter()
stock_router = APIRouter()


# ── Pydantic models ──────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    type: str = "bar"          # 'bar' | 'kitchen' | 'store'
    description: Optional[str] = None
    is_active: bool = True


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class StockTransferRequest(BaseModel):
    from_location_id: Optional[str] = None   # None = receiving from outside (initial load)
    to_location_id: str
    menu_item_id: str
    item_name: Optional[str] = None
    quantity: float
    unit: str = "piece"
    notes: Optional[str] = None


class StockAdjustRequest(BaseModel):
    quantity: float
    item_name: Optional[str] = None
    category: Optional[str] = None
    unit: str = "piece"
    reorder_level: float = 0
    cost_price: float = 0
    notes: Optional[str] = None


class AssignStaffRequest(BaseModel):
    user_id: str
    location_id: Optional[str] = None   # None = unassign


class BatchTransferItem(BaseModel):
    menu_item_id: str
    item_name: Optional[str] = None
    quantity: float
    unit: str = "piece"
    notes: Optional[str] = None


class BatchTransferRequest(BaseModel):
    from_location_id: str
    to_location_id: str
    items: List[BatchTransferItem]
    notes: Optional[str] = None


# ── Helper ───────────────────────────────────────────────────────────────────

def _require_manager(current_user: dict) -> None:
    role = current_user.get("role", "")
    if role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin or manager role required")


async def _next_transfer_number(supabase: Client, today: str) -> str:
    """Generate TRF-YYYYMMDD-NNNN transfer number."""
    prefix = f"TRF-{today.replace('-', '')}-"
    res = supabase.table("stock_transfers").select("transfer_number").like(
        "transfer_number", f"{prefix}%"
    ).order("transfer_number", desc=True).limit(1).execute()
    if res.data:
        try:
            seq = int(res.data[0]["transfer_number"].split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


# ── /locations CRUD ──────────────────────────────────────────────────────────

@locations_router.get("")
async def list_locations(
    include_inactive: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all locations. By default only active ones."""
    query = supabase.table("locations").select("*").order("name")
    if not include_inactive:
        query = query.eq("is_active", True)
    res = query.execute()
    return res.data or []


@locations_router.post("")
async def create_location(
    body: LocationCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a new location (admin/manager only)."""
    _require_manager(current_user)
    if body.type not in ("bar", "kitchen", "store"):
        raise HTTPException(status_code=422, detail="type must be 'bar', 'kitchen', or 'store'")
    res = supabase.table("locations").insert({
        "name": body.name,
        "type": body.type,
        "description": body.description,
        "is_active": body.is_active,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create location")
    return res.data[0]


@locations_router.patch("/{location_id}")
async def update_location(
    location_id: str,
    body: LocationUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update a location (admin/manager only)."""
    _require_manager(current_user)
    payload = {k: v for k, v in body.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=422, detail="No fields to update")
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = supabase.table("locations").update(payload).eq("id", location_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Location not found")
    return res.data[0]


# ── /location-stock operations ───────────────────────────────────────────────

@stock_router.get("/my-location")
async def get_my_location(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Return the location the current user is assigned to (if any)."""
    user_id = current_user.get("id")
    res = supabase.table("users").select("assigned_location_id").eq("id", user_id).execute()
    if not res.data or not res.data[0].get("assigned_location_id"):
        return {"assigned_location": None}
    loc_id = res.data[0]["assigned_location_id"]
    loc_res = supabase.table("locations").select("*").eq("id", loc_id).execute()
    if not loc_res.data:
        return {"assigned_location": None}
    return {"assigned_location": loc_res.data[0]}


@stock_router.post("/assign-staff")
async def assign_staff_to_location(
    body: AssignStaffRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Assign a staff member to a location (admin/manager only)."""
    _require_manager(current_user)
    update_payload: dict = {"assigned_location_id": body.location_id}
    res = supabase.table("users").update(update_payload).eq("id", body.user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "user_id": body.user_id, "location_id": body.location_id}


@stock_router.get("/summary")
async def get_stock_summary(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Total stock value across all locations, grouped by location."""
    locs_res = supabase.table("locations").select("id, name, type").eq("is_active", True).execute()
    locations = locs_res.data or []

    summary = []
    for loc in locations:
        stock_res = supabase.table("location_stock").select(
            "quantity, cost_price, item_name, category"
        ).eq("location_id", loc["id"]).execute()
        items = stock_res.data or []
        total_value = sum(
            float(i.get("quantity") or 0) * float(i.get("cost_price") or 0)
            for i in items
        )
        summary.append({
            "location_id": loc["id"],
            "location_name": loc["name"],
            "location_type": loc["type"],
            "item_count": len(items),
            "total_stock_value": round(total_value, 2),
        })
    return summary


@stock_router.get("/transfers")
async def get_transfer_history(
    location_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get stock transfer history with optional filters."""
    query = supabase.table("stock_transfers").select("*").order("created_at", desc=True).limit(limit)
    if location_id:
        # transfers involving this location (from or to)
        query = supabase.table("stock_transfers").select("*").or_(
            f"from_location_id.eq.{location_id},to_location_id.eq.{location_id}"
        ).order("created_at", desc=True).limit(limit)
    if start_date:
        query = query.gte("transfer_date", start_date)
    if end_date:
        query = query.lte("transfer_date", end_date)
    res = query.execute()
    transfers = res.data or []

    # Enrich with location names
    loc_res = supabase.table("locations").select("id, name").execute()
    loc_map = {l["id"]: l["name"] for l in (loc_res.data or [])}

    for t in transfers:
        t["from_location_name"] = loc_map.get(t.get("from_location_id"), "—")
        t["to_location_name"] = loc_map.get(t.get("to_location_id"), "—")

    return transfers


@stock_router.post("/transfer")
async def transfer_stock(
    body: StockTransferRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Transfer stock between locations (admin/manager only).
    Decrements from_location (if provided) and increments to_location.
    """
    _require_manager(current_user)

    if body.quantity <= 0:
        raise HTTPException(status_code=422, detail="Quantity must be positive")

    today = date.today().isoformat()
    transfer_number = await _next_transfer_number(supabase, today)

    # Resolve item metadata if not provided
    item_name = body.item_name
    if not item_name:
        mi_res = supabase.table("menu_items").select("name").eq("id", body.menu_item_id).execute()
        if mi_res.data:
            item_name = mi_res.data[0].get("name", "Unknown Item")

    # 1. Decrement source location stock (if a source is specified)
    if body.from_location_id:
        src_res = supabase.table("location_stock").select("id, quantity").eq(
            "location_id", body.from_location_id
        ).eq("menu_item_id", body.menu_item_id).execute()

        if not src_res.data:
            raise HTTPException(
                status_code=404,
                detail="Item not found in source location stock"
            )
        src_qty = float(src_res.data[0].get("quantity") or 0)
        if src_qty < body.quantity:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient stock at source location. Available: {src_qty}, requested: {body.quantity}"
            )
        new_src_qty = round(src_qty - body.quantity, 3)
        supabase.table("location_stock").update({
            "quantity": new_src_qty,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", src_res.data[0]["id"]).execute()

    # 2. Increment destination location stock (upsert)
    dst_res = supabase.table("location_stock").select("id, quantity").eq(
        "location_id", body.to_location_id
    ).eq("menu_item_id", body.menu_item_id).execute()

    now_iso = datetime.now(timezone.utc).isoformat()
    if dst_res.data:
        dst_qty = float(dst_res.data[0].get("quantity") or 0)
        new_dst_qty = round(dst_qty + body.quantity, 3)
        supabase.table("location_stock").update({
            "quantity": new_dst_qty,
            "item_name": item_name,
            "unit": body.unit,
            "updated_at": now_iso,
        }).eq("id", dst_res.data[0]["id"]).execute()
    else:
        supabase.table("location_stock").insert({
            "location_id": body.to_location_id,
            "menu_item_id": body.menu_item_id,
            "item_name": item_name,
            "unit": body.unit,
            "quantity": round(body.quantity, 3),
            "updated_at": now_iso,
        }).execute()

    # 3. Record the transfer
    transfer_rec = {
        "transfer_number": transfer_number,
        "from_location_id": body.from_location_id,
        "to_location_id": body.to_location_id,
        "menu_item_id": body.menu_item_id,
        "item_name": item_name,
        "quantity": body.quantity,
        "unit": body.unit,
        "notes": body.notes,
        "transferred_by": current_user.get("id"),
        "transfer_date": today,
    }
    trn_res = supabase.table("stock_transfers").insert(transfer_rec).execute()

    return {
        "success": True,
        "transfer_number": transfer_number,
        "transfer": trn_res.data[0] if trn_res.data else transfer_rec,
    }


@stock_router.post("/transfer-batch")
async def transfer_stock_batch(
    body: BatchTransferRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Transfer multiple items from one location to another in a single operation.
    Each item gets its own transfer record; a shared batch prefix is used.
    Source stock must have sufficient quantity for each item.
    """
    _require_manager(current_user)

    if not body.items:
        raise HTTPException(status_code=422, detail="At least one item is required")

    if body.from_location_id == body.to_location_id:
        raise HTTPException(status_code=422, detail="Source and destination must be different")

    # Validate locations exist
    locs_res = supabase.table("locations").select("id, name").in_(
        "id", [body.from_location_id, body.to_location_id]
    ).execute()
    loc_map = {l["id"]: l["name"] for l in (locs_res.data or [])}
    if body.from_location_id not in loc_map:
        raise HTTPException(status_code=404, detail="Source location not found")
    if body.to_location_id not in loc_map:
        raise HTTPException(status_code=404, detail="Destination location not found")

    today = date.today().isoformat()
    transfer_number = await _next_transfer_number(supabase, today)
    now_iso = datetime.now(timezone.utc).isoformat()
    transferred_by = current_user.get("id")

    # Batch-load item names from menu_items
    item_ids = [it.menu_item_id for it in body.items]
    mi_res = supabase.table("menu_items").select("id, name").in_("id", item_ids).execute()
    mi_name_map = {m["id"]: m["name"] for m in (mi_res.data or [])}

    # Batch-load source stocks
    src_res = supabase.table("location_stock").select("id, menu_item_id, quantity").eq(
        "location_id", body.from_location_id
    ).in_("menu_item_id", item_ids).execute()
    src_map = {s["menu_item_id"]: s for s in (src_res.data or [])}

    # Validate quantities upfront so we don't partially apply
    for it in body.items:
        if it.quantity <= 0:
            raise HTTPException(status_code=422, detail=f"Quantity must be positive for item {it.menu_item_id}")
        src = src_map.get(it.menu_item_id)
        if not src:
            name = mi_name_map.get(it.menu_item_id, it.menu_item_id)
            raise HTTPException(status_code=422, detail=f"'{name}' not found in source location")
        available = float(src.get("quantity") or 0)
        if available < it.quantity:
            name = mi_name_map.get(it.menu_item_id, it.menu_item_id)
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient stock for '{name}'. Available: {available}, requested: {it.quantity}"
            )

    # Batch-load destination stocks
    dst_res = supabase.table("location_stock").select("id, menu_item_id, quantity").eq(
        "location_id", body.to_location_id
    ).in_("menu_item_id", item_ids).execute()
    dst_map = {s["menu_item_id"]: s for s in (dst_res.data or [])}

    transfer_records = []

    for it in body.items:
        item_name = it.item_name or mi_name_map.get(it.menu_item_id, "Unknown Item")

        # Decrement source
        src = src_map[it.menu_item_id]
        new_src_qty = round(float(src["quantity"]) - it.quantity, 3)
        supabase.table("location_stock").update({
            "quantity": new_src_qty,
            "updated_at": now_iso,
        }).eq("id", src["id"]).execute()

        # Increment destination
        dst = dst_map.get(it.menu_item_id)
        if dst:
            new_dst_qty = round(float(dst.get("quantity") or 0) + it.quantity, 3)
            supabase.table("location_stock").update({
                "quantity": new_dst_qty,
                "item_name": item_name,
                "unit": it.unit,
                "updated_at": now_iso,
            }).eq("id", dst["id"]).execute()
        else:
            supabase.table("location_stock").insert({
                "location_id": body.to_location_id,
                "menu_item_id": it.menu_item_id,
                "item_name": item_name,
                "unit": it.unit,
                "quantity": round(it.quantity, 3),
                "updated_at": now_iso,
            }).execute()

        # Log transfer record
        transfer_rec = {
            "transfer_number": transfer_number,
            "from_location_id": body.from_location_id,
            "to_location_id": body.to_location_id,
            "menu_item_id": it.menu_item_id,
            "item_name": item_name,
            "quantity": it.quantity,
            "unit": it.unit,
            "notes": it.notes or body.notes,
            "transferred_by": transferred_by,
            "transfer_date": today,
        }
        supabase.table("stock_transfers").insert(transfer_rec).execute()
        transfer_records.append(transfer_rec)

    return {
        "success": True,
        "transfer_number": transfer_number,
        "from_location": loc_map[body.from_location_id],
        "to_location": loc_map[body.to_location_id],
        "items_transferred": len(transfer_records),
        "transfers": transfer_records,
    }


@stock_router.post("/transfer/{transfer_number}/reverse")
async def reverse_transfer(
    transfer_number: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Reverse all stock movements for a given transfer_number.
    Moves stock back from the destination to the source and deletes the transfer records.
    Admin/manager only.
    """
    _require_manager(current_user)

    # Load all records for this transfer number
    trn_res = supabase.table("stock_transfers").select("*").eq(
        "transfer_number", transfer_number
    ).execute()

    records = trn_res.data or []
    if not records:
        raise HTTPException(status_code=404, detail=f"Transfer {transfer_number} not found")

    # Check it hasn't already been reversed
    if any(r.get("reversed") for r in records):
        raise HTTPException(status_code=409, detail="This transfer has already been reversed")

    now_iso = datetime.now(timezone.utc).isoformat()

    for rec in records:
        from_loc = rec.get("from_location_id")
        to_loc   = rec.get("to_location_id")
        item_id  = rec.get("menu_item_id")
        qty      = float(rec.get("quantity") or 0)

        # Give stock back to source (from_location)
        if from_loc:
            src_res = supabase.table("location_stock").select("id, quantity").eq(
                "location_id", from_loc
            ).eq("menu_item_id", item_id).execute()
            if src_res.data:
                new_qty = round(float(src_res.data[0]["quantity"]) + qty, 3)
                supabase.table("location_stock").update({
                    "quantity": new_qty, "updated_at": now_iso,
                }).eq("id", src_res.data[0]["id"]).execute()
            else:
                # Item row was deleted — recreate it
                supabase.table("location_stock").insert({
                    "location_id": from_loc,
                    "menu_item_id": item_id,
                    "item_name": rec.get("item_name", ""),
                    "unit": rec.get("unit", "piece"),
                    "quantity": qty,
                    "updated_at": now_iso,
                }).execute()

        # Deduct from destination (to_location)
        dst_res = supabase.table("location_stock").select("id, quantity").eq(
            "location_id", to_loc
        ).eq("menu_item_id", item_id).execute()
        if dst_res.data:
            new_qty = round(max(0, float(dst_res.data[0]["quantity"]) - qty), 3)
            supabase.table("location_stock").update({
                "quantity": new_qty, "updated_at": now_iso,
            }).eq("id", dst_res.data[0]["id"]).execute()

    # Mark the original transfer records as reversed (don't delete — keep audit trail)
    supabase.table("stock_transfers").update({
        "reversed": True,
        "reversed_by": current_user.get("id"),
        "reversed_at": now_iso,
        "notes": (records[0].get("notes") or "") + f" [REVERSED by {current_user.get('full_name', 'staff')}]",
    }).eq("transfer_number", transfer_number).execute()

    return {
        "success": True,
        "transfer_number": transfer_number,
        "items_reversed": len(records),
        "message": f"Transfer {transfer_number} reversed — stock returned to source location",
    }


@stock_router.get("/{location_id}")
async def get_location_stock(
    location_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Get all stock items for a given location, sorted by category then name."""
    # Verify location exists
    loc_res = supabase.table("locations").select("*").eq("id", location_id).execute()
    if not loc_res.data:
        raise HTTPException(status_code=404, detail="Location not found")

    stock_res = supabase.table("location_stock").select("*").eq(
        "location_id", location_id
    ).order("category").order("item_name").execute()

    items = stock_res.data or []

    # Annotate with stock status
    for item in items:
        qty = float(item.get("quantity") or 0)
        reorder = float(item.get("reorder_level") or 0)
        if qty <= 0:
            item["stock_status"] = "out_of_stock"
        elif reorder > 0 and qty <= reorder:
            item["stock_status"] = "low_stock"
        else:
            item["stock_status"] = "in_stock"

    return {
        "location": loc_res.data[0],
        "items": items,
        "summary": {
            "total_items": len(items),
            "total_value": round(
                sum(float(i.get("quantity") or 0) * float(i.get("cost_price") or 0) for i in items), 2
            ),
            "low_stock_count": sum(1 for i in items if i["stock_status"] == "low_stock"),
            "out_of_stock_count": sum(1 for i in items if i["stock_status"] == "out_of_stock"),
        },
    }


@stock_router.post("/adjust/{location_id}/{menu_item_id}")
async def adjust_location_stock(
    location_id: str,
    menu_item_id: str,
    body: StockAdjustRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Set (upsert) the stock quantity for a specific item at a location.
    Accessible to admin, manager, waiter, and chef.
    """
    role = current_user.get("role", "")
    if role not in ("admin", "manager", "waiter", "chef"):
        raise HTTPException(status_code=403, detail="Not authorized to adjust stock")

    now_iso = datetime.now(timezone.utc).isoformat()

    # Resolve item name/category from menu_items if not provided
    item_name = body.item_name
    category = body.category
    if not item_name or not category:
        mi_res = supabase.table("menu_items").select("name, category, unit, cost_price, reorder_level").eq(
            "id", menu_item_id
        ).execute()
        if mi_res.data:
            item_name = item_name or mi_res.data[0].get("name", "Unknown Item")
            category = category or mi_res.data[0].get("category", "Uncategorized")

    # Upsert
    existing = supabase.table("location_stock").select("id").eq(
        "location_id", location_id
    ).eq("menu_item_id", menu_item_id).execute()

    payload = {
        "location_id": location_id,
        "menu_item_id": menu_item_id,
        "item_name": item_name,
        "category": category,
        "unit": body.unit,
        "quantity": round(body.quantity, 3),
        "reorder_level": body.reorder_level,
        "cost_price": body.cost_price,
        "updated_at": now_iso,
    }

    if existing.data:
        res = supabase.table("location_stock").update(payload).eq(
            "id", existing.data[0]["id"]
        ).execute()
    else:
        res = supabase.table("location_stock").insert(payload).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to adjust stock")

    return {
        "success": True,
        "location_id": location_id,
        "menu_item_id": menu_item_id,
        "quantity": body.quantity,
        "record": res.data[0],
    }
