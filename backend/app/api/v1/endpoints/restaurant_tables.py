"""
Restaurant Tables Management Endpoints
Full CRUD for table configuration, waiter assignment, and status updates.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user, require_role

router = APIRouter()


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class TableCreate(BaseModel):
    name: str
    section: Optional[str] = None
    capacity: int = 4
    notes: Optional[str] = None


class TableUpdate(BaseModel):
    name: Optional[str] = None
    section: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AssignWaiterRequest(BaseModel):
    waiter_id: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _enrich_tables(tables: list, supabase: Client) -> list:
    """Attach assigned_waiter {id, full_name} to each table record."""
    if not tables:
        return tables

    waiter_ids = list({t["assigned_waiter_id"] for t in tables if t.get("assigned_waiter_id")})
    waiter_map: dict = {}

    if waiter_ids:
        try:
            result = supabase.table("users").select("id, full_name").in_("id", waiter_ids).execute()
            if result.data:
                waiter_map = {u["id"]: u for u in result.data}
        except Exception:
            pass

    enriched = []
    for table in tables:
        t = dict(table)
        wid = t.get("assigned_waiter_id")
        t["assigned_waiter"] = waiter_map.get(wid) if wid else None
        enriched.append(t)

    return enriched


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
async def list_tables(
    section: Optional[str] = Query(default=None),
    waiter_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List all restaurant tables with optional section and waiter filters."""
    query = supabase.table("restaurant_tables").select("*").order("name")

    if section:
        query = query.eq("section", section)
    if waiter_id:
        query = query.eq("assigned_waiter_id", waiter_id)

    result = query.execute()
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch tables")

    return _enrich_tables(result.data, supabase)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_table(
    data: TableCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a new restaurant table. Admin/manager only."""
    payload = {
        "name": data.name,
        "section": data.section,
        "capacity": data.capacity,
        "notes": data.notes,
        "status": "available",
    }

    result = supabase.table("restaurant_tables").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create table")

    return _enrich_tables(result.data, supabase)[0]


@router.put("/{table_id}")
async def update_table(
    table_id: str,
    data: TableUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update table details (name, section, capacity, status, notes). Admin/manager only."""
    # Validate status if provided
    valid_statuses = {"available", "occupied", "reserved", "inactive"}
    if data.status and data.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("restaurant_tables")
        .update(payload)
        .eq("id", table_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Table not found")

    return _enrich_tables(result.data, supabase)[0]


@router.patch("/{table_id}/assign")
async def assign_waiter(
    table_id: str,
    data: AssignWaiterRequest,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin),
):
    """Assign or unassign a waiter to/from a table. Admin/manager only."""
    payload = {
        "assigned_waiter_id": data.waiter_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("restaurant_tables")
        .update(payload)
        .eq("id", table_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Table not found")

    return _enrich_tables(result.data, supabase)[0]


@router.patch("/{table_id}/status")
async def update_table_status(
    table_id: str,
    data: UpdateStatusRequest,
    current_user: dict = Depends(require_role(["admin", "manager", "waiter", "staff"])),
    supabase: Client = Depends(get_supabase_admin),
):
    """Update table status. Waiter/staff/admin/manager can use this."""
    valid_statuses = {"available", "occupied", "reserved", "inactive"}
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    payload = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("restaurant_tables")
        .update(payload)
        .eq("id", table_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Table not found")

    return _enrich_tables(result.data, supabase)[0]


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(
    table_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete a restaurant table. Admin/manager only."""
    result = (
        supabase.table("restaurant_tables")
        .delete()
        .eq("id", table_id)
        .execute()
    )

    if result.data is None:
        raise HTTPException(status_code=404, detail="Table not found")
