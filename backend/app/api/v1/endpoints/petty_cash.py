"""
Petty Cash Ledger Endpoints
Daily cash-at-hand and expenses tracking per branch with cumulative running balance.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import date, datetime, timezone
from supabase import Client
from pydantic import BaseModel
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_ROLES = {"admin", "manager", "owner"}
EDIT_ROLES = {"admin", "owner"}


class PettyCashCreate(BaseModel):
    branch_id: str
    entry_date: str          # YYYY-MM-DD
    cash_at_hand: float
    expenses: float
    notes: Optional[str] = None


class PettyCashUpdate(BaseModel):
    cash_at_hand: Optional[float] = None
    expenses: Optional[float] = None
    notes: Optional[str] = None


def _recalculate_cumulative(supabase: Client, branch_id: str, from_date: str):
    """
    Recalculate cumulative_balance for all entries on or after from_date
    for the given branch, in chronological order.
    """
    # Get the entry just before from_date to get the starting cumulative
    prev_res = supabase.table("petty_cash_entries").select(
        "cumulative_balance"
    ).eq("branch_id", branch_id).lt("entry_date", from_date).order(
        "entry_date", desc=True
    ).limit(1).execute()

    running = float(prev_res.data[0]["cumulative_balance"]) if prev_res.data else 0.0

    # Get all entries from from_date onward, in order
    affected = supabase.table("petty_cash_entries").select("*").eq(
        "branch_id", branch_id
    ).gte("entry_date", from_date).order("entry_date").execute()

    now_iso = datetime.now(timezone.utc).isoformat()
    for entry in (affected.data or []):
        daily = float(entry["cash_at_hand"]) - float(entry["expenses"])
        running = round(running + daily, 2)
        supabase.table("petty_cash_entries").update({
            "daily_balance": round(daily, 2),
            "cumulative_balance": running,
            "updated_at": now_iso,
        }).eq("id", entry["id"]).execute()


@router.get("")
async def list_entries(
    branch_id: str = Query(..., description="Branch UUID"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """List petty cash entries for a branch, newest first."""
    if current_user.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = supabase.table("petty_cash_entries").select("*").eq(
        "branch_id", branch_id
    ).order("entry_date", desc=True).limit(limit)

    if start_date:
        query = query.gte("entry_date", start_date)
    if end_date:
        query = query.lte("entry_date", end_date)

    res = query.execute()
    return res.data or []


@router.get("/summary")
async def get_monthly_summary(
    branch_id: str = Query(..., description="Branch UUID"),
    month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Monthly summary for a branch:
    - Total cash at hand, total expenses, net balance for the month
    - Current cumulative (running total up to latest entry)
    Used by the Owner Dashboard widget.
    """
    if current_user.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")

    start = f"{month}-01"
    # End: last day of month (use next month minus 1 day logic via string)
    y, m = int(month.split("-")[0]), int(month.split("-")[1])
    if m == 12:
        end = f"{y + 1}-01-01"
    else:
        end = f"{y}-{m + 1:02d}-01"

    res = supabase.table("petty_cash_entries").select("*").eq(
        "branch_id", branch_id
    ).gte("entry_date", start).lt("entry_date", end).order("entry_date").execute()

    entries = res.data or []

    total_cash = sum(float(e["cash_at_hand"]) for e in entries)
    total_expenses = sum(float(e["expenses"]) for e in entries)
    net_month = round(total_cash - total_expenses, 2)

    # Latest cumulative (most recent entry for this branch overall)
    latest_res = supabase.table("petty_cash_entries").select(
        "cumulative_balance, entry_date"
    ).eq("branch_id", branch_id).order("entry_date", desc=True).limit(1).execute()

    current_cumulative = float(latest_res.data[0]["cumulative_balance"]) if latest_res.data else 0.0
    latest_date = latest_res.data[0]["entry_date"] if latest_res.data else None

    return {
        "branch_id": branch_id,
        "month": month,
        "entry_count": len(entries),
        "total_cash_at_hand": round(total_cash, 2),
        "total_expenses": round(total_expenses, 2),
        "net_month": net_month,
        "current_cumulative": current_cumulative,
        "latest_entry_date": latest_date,
    }


@router.get("/all-branches-summary")
async def get_all_branches_summary(
    month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Monthly summary across ALL branches — for the Owner Dashboard overview widget.
    Returns per-branch summaries plus an overall total.
    """
    if current_user.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")

    y, m = int(month.split("-")[0]), int(month.split("-")[1])
    start = f"{month}-01"
    end = f"{y + 1}-01-01" if m == 12 else f"{y}-{m + 1:02d}-01"

    branches_res = supabase.table("branches").select("id, name").execute()
    branches = branches_res.data or []

    result = []
    for branch in branches:
        bid = branch["id"]

        entries_res = supabase.table("petty_cash_entries").select(
            "cash_at_hand, expenses"
        ).eq("branch_id", bid).gte("entry_date", start).lt("entry_date", end).execute()
        entries = entries_res.data or []

        total_cash = sum(float(e["cash_at_hand"]) for e in entries)
        total_exp = sum(float(e["expenses"]) for e in entries)

        latest_res = supabase.table("petty_cash_entries").select(
            "cumulative_balance, entry_date"
        ).eq("branch_id", bid).order("entry_date", desc=True).limit(1).execute()

        cumulative = float(latest_res.data[0]["cumulative_balance"]) if latest_res.data else 0.0
        latest_date = latest_res.data[0]["entry_date"] if latest_res.data else None

        result.append({
            "branch_id": bid,
            "branch_name": branch["name"],
            "entry_count": len(entries),
            "total_cash_at_hand": round(total_cash, 2),
            "total_expenses": round(total_exp, 2),
            "net_month": round(total_cash - total_exp, 2),
            "current_cumulative": cumulative,
            "latest_entry_date": latest_date,
        })

    overall_cumulative = sum(b["current_cumulative"] for b in result)
    overall_net = sum(b["net_month"] for b in result)

    return {
        "month": month,
        "branches": result,
        "overall_cumulative": round(overall_cumulative, 2),
        "overall_net_month": round(overall_net, 2),
    }


@router.post("")
async def create_entry(
    body: PettyCashCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Create a new petty cash entry. Manager/Admin/Owner only."""
    if current_user.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check no duplicate entry for this branch+date
    existing = supabase.table("petty_cash_entries").select("id").eq(
        "branch_id", body.branch_id
    ).eq("entry_date", body.entry_date).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="An entry for this date already exists. Edit the existing entry instead.")

    daily_balance = round(body.cash_at_hand - body.expenses, 2)

    # Get previous cumulative
    prev = supabase.table("petty_cash_entries").select("cumulative_balance").eq(
        "branch_id", body.branch_id
    ).lt("entry_date", body.entry_date).order("entry_date", desc=True).limit(1).execute()
    prev_cumulative = float(prev.data[0]["cumulative_balance"]) if prev.data else 0.0
    cumulative_balance = round(prev_cumulative + daily_balance, 2)

    now_iso = datetime.now(timezone.utc).isoformat()
    res = supabase.table("petty_cash_entries").insert({
        "branch_id": body.branch_id,
        "entry_date": body.entry_date,
        "cash_at_hand": body.cash_at_hand,
        "expenses": body.expenses,
        "daily_balance": daily_balance,
        "cumulative_balance": cumulative_balance,
        "notes": body.notes,
        "created_by": current_user.get("id"),
        "updated_by": current_user.get("id"),
        "created_at": now_iso,
        "updated_at": now_iso,
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create entry")

    # Recalculate any entries that come after this date (in case inserted out of order)
    _recalculate_cumulative(supabase, body.branch_id, body.entry_date)

    # Re-fetch the saved record (recalculate may have updated it)
    updated = supabase.table("petty_cash_entries").select("*").eq(
        "id", res.data[0]["id"]
    ).execute()
    return updated.data[0] if updated.data else res.data[0]


@router.patch("/{entry_id}")
async def update_entry(
    entry_id: str,
    body: PettyCashUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Edit an existing entry. Admin/Owner only."""
    if current_user.get("role") not in EDIT_ROLES:
        raise HTTPException(status_code=403, detail="Only admin or owner can edit entries")

    existing_res = supabase.table("petty_cash_entries").select("*").eq("id", entry_id).execute()
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Entry not found")

    entry = existing_res.data[0]
    payload = {}
    if body.cash_at_hand is not None:
        payload["cash_at_hand"] = body.cash_at_hand
    if body.expenses is not None:
        payload["expenses"] = body.expenses
    if body.notes is not None:
        payload["notes"] = body.notes

    if not payload:
        return entry

    payload["updated_by"] = current_user.get("id")
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("petty_cash_entries").update(payload).eq("id", entry_id).execute()

    # Recalculate from this date onward
    _recalculate_cumulative(supabase, entry["branch_id"], entry["entry_date"])

    updated = supabase.table("petty_cash_entries").select("*").eq("id", entry_id).execute()
    return updated.data[0] if updated.data else entry


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Delete an entry. Admin/Owner only."""
    if current_user.get("role") not in EDIT_ROLES:
        raise HTTPException(status_code=403, detail="Only admin or owner can delete entries")

    existing_res = supabase.table("petty_cash_entries").select("branch_id, entry_date").eq("id", entry_id).execute()
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Entry not found")

    branch_id = existing_res.data[0]["branch_id"]
    entry_date = existing_res.data[0]["entry_date"]

    supabase.table("petty_cash_entries").delete().eq("id", entry_id).execute()

    # Recalculate subsequent entries
    _recalculate_cumulative(supabase, branch_id, entry_date)

    return {"success": True}
