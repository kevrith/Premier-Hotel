"""
Owner Dashboard Endpoints — Multi-Branch Enterprise API
Provides consolidated and per-branch performance data for the business owner.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.middleware.auth_secure import require_role
from app.core.supabase import get_supabase_admin, get_supabase
from app.core.cache import cache_get, cache_set, cache_invalidate
from supabase import Client

router = APIRouter()

OWNER_ROLES = ["owner", "admin"]

# Thread pool for parallelising synchronous Supabase calls
_thread_pool = ThreadPoolExecutor(max_workers=12)


async def _par(*fns):
    """Run multiple zero-argument callables in parallel using the thread pool."""
    loop = asyncio.get_event_loop()
    return await asyncio.gather(*[loop.run_in_executor(_thread_pool, fn) for fn in fns])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class BranchCreate(BaseModel):
    name: str
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[str] = None
    opened_at: Optional[str] = None
    notes: Optional[str] = None
    paybill_no: Optional[str] = None
    account_no: Optional[str] = None
    payment_instructions: Optional[str] = None


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[str] = None
    status: Optional[str] = None
    opened_at: Optional[str] = None
    notes: Optional[str] = None
    paybill_no: Optional[str] = None
    account_no: Optional[str] = None
    payment_instructions: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _period(days: int = 30):
    now = datetime.now()
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    start = (now - timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat(), end.isoformat()


_VOID_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}

def _item_revenue(order: dict) -> float:
    """Calculate revenue as price×qty from line items — matches item-summary method."""
    return sum(
        float(i.get("price", 0)) * int(i.get("quantity", 0))
        for i in (order.get("items") or [])
        if isinstance(i, dict)
    )

def _stats_for_branch(supabase: Client, branch_id: Optional[str], start: str, end: str) -> dict:
    """Pull KPIs for a single branch (or all branches if branch_id is None)."""

    # Staff in this branch
    staff_q = supabase.table("users").select("id, role, status").neq("role", "customer")
    if branch_id:
        staff_q = staff_q.eq("branch_id", branch_id)
    staff = staff_q.execute().data or []
    active_staff = sum(1 for s in staff if s.get("status") == "active")

    # Orders — all non-voided (matches item-summary exclusion list)
    orders_q = supabase.table("orders").select("id, items, status, created_at, customer_id") \
        .gte("created_at", start).lte("created_at", end) \
        .not_.in_("status", list(_VOID_STATUSES))
    if branch_id:
        orders_q = orders_q.eq("branch_id", branch_id)
    completed = orders_q.execute().data or []
    fb_revenue = sum(_item_revenue(o) for o in completed)

    # Bookings — filter by branch_id directly
    bookings_q = supabase.table("bookings").select("id, total_amount, paid_amount, status, created_at") \
        .gte("created_at", start).lte("created_at", end)
    if branch_id:
        bookings_q = bookings_q.eq("branch_id", branch_id)
    bookings = bookings_q.execute().data or []
    room_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings)

    # Rooms — filter by branch_id directly
    rooms_q = supabase.table("rooms").select("id, status")
    if branch_id:
        rooms_q = rooms_q.eq("branch_id", branch_id)
    rooms_all = rooms_q.execute().data or []
    total_rooms = len(rooms_all)
    occupied = sum(1 for r in rooms_all if r.get("status") == "occupied")
    occupancy_rate = round(occupied / total_rooms * 100, 1) if total_rooms else 0

    total_revenue = fb_revenue + room_revenue
    unique_customers = len({o.get("customer_id") for o in completed if o.get("customer_id")})

    return {
        "total_revenue": round(total_revenue, 2),
        "fb_revenue": round(fb_revenue, 2),
        "room_revenue": round(room_revenue, 2),
        "total_orders": len(completed),
        "completed_orders": len(completed),
        "total_bookings": len(bookings),
        "unique_customers": unique_customers,
        "occupancy_rate": occupancy_rate,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied,
        "total_staff": len(staff),
        "active_staff": active_staff,
    }


def _empty_stats() -> dict:
    return {k: 0 for k in [
        "total_revenue", "fb_revenue", "room_revenue", "total_orders",
        "completed_orders", "total_bookings", "unique_customers",
        "occupancy_rate", "total_rooms", "occupied_rooms", "total_staff", "active_staff"
    ]}


def _revenue_trend(supabase: Client, branch_id: Optional[str], days: int = 30) -> list:
    """Daily revenue for the last N days."""
    end = datetime.now()
    start = end - timedelta(days=days)
    orders_q = supabase.table("orders").select("items, status, created_at") \
        .gte("created_at", start.isoformat()).lte("created_at", end.isoformat()) \
        .not_.in_("status", list(_VOID_STATUSES))
    if branch_id:
        orders_q = orders_q.eq("branch_id", branch_id)
    orders = orders_q.execute().data or []
    by_day: dict = {}
    for o in orders:
        day = (o.get("created_at") or "")[:10]
        by_day[day] = by_day.get(day, 0) + _item_revenue(o)
    result = []
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        result.append({"date": d, "revenue": round(by_day.get(d, 0), 2)})
    return result


# ─── Branch CRUD ─────────────────────────────────────────────────────────────

@router.get("/branches")
async def list_branches(
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """List all branches with their assigned manager."""
    cached = cache_get("branches")
    if cached:
        return cached

    branches_res, users_res = await _par(
        lambda: supabase.table("branches").select("*").order("created_at").execute(),
        lambda: supabase.table("users").select("id, full_name, email").neq("role", "customer").execute(),
    )
    branches = branches_res.data or []
    all_users = {u["id"]: u for u in (users_res.data or [])}
    for b in branches:
        b["manager"] = all_users.get(b.get("manager_id"))
    result = {"branches": branches}
    cache_set("branches", result, ttl=60)  # 1-minute TTL — branches change rarely
    return result


@router.post("/branches", status_code=201)
async def create_branch(
    body: BranchCreate,
    current_user: dict = Depends(require_role(["owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    result = supabase.table("branches").insert(body.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create branch")
    cache_invalidate("branches")
    return result.data[0]


@router.patch("/branches/{branch_id}")
async def update_branch(
    branch_id: str,
    body: BranchUpdate,
    current_user: dict = Depends(require_role(["owner", "admin"])),
    supabase: Client = Depends(get_supabase_admin)
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    updates["updated_at"] = datetime.now().isoformat()
    result = supabase.table("branches").update(updates).eq("id", branch_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Branch not found")
    cache_invalidate("branches")
    return result.data[0]


@router.delete("/branches/{branch_id}", status_code=204)
async def close_branch(
    branch_id: str,
    current_user: dict = Depends(require_role(["owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Soft-close a branch:
    - Sets branch status to 'closed'
    - Unassigns all staff (sets their branch_id to NULL)
    - Preserves all historical data (orders, bookings, rooms) for reporting and compliance
    """
    branch = supabase.table("branches").select("id, name").eq("id", branch_id).execute().data
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Mark branch as closed
    supabase.table("branches").update({
        "status": "closed",
        "updated_at": datetime.now().isoformat(),
    }).eq("id", branch_id).execute()

    # Unassign all staff — they keep their accounts and history
    supabase.table("users").update({"branch_id": None}).eq("branch_id", branch_id).execute()

    return


@router.post("/branches/{branch_id}/purge", status_code=204)
async def purge_branch(
    branch_id: str,
    confirm_name: str = Query(..., description="Must match the branch name exactly"),
    current_user: dict = Depends(require_role(["owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    IRREVERSIBLE hard-delete of a branch and ALL its data.
    Caller must pass ?confirm_name=<exact branch name> as a safety gate.
    Deletes: orders, bookings, rooms, staff accounts, budgets, alert configs.
    Keep all financial records in your accounting system before calling this.
    """
    branch_row = supabase.table("branches").select("id, name").eq("id", branch_id).execute().data
    if not branch_row:
        raise HTTPException(status_code=404, detail="Branch not found")

    if confirm_name.strip() != branch_row[0]["name"].strip():
        raise HTTPException(
            status_code=400,
            detail=f"Name mismatch. Expected: \"{branch_row[0]['name']}\""
        )

    # ── 1. Collect IDs ────────────────────────────────────────────────────
    order_ids = [r["id"] for r in
        supabase.table("orders").select("id").eq("branch_id", branch_id).execute().data or []]
    staff_ids = [r["id"] for r in
        supabase.table("users").select("id").eq("branch_id", branch_id).execute().data or []]

    # ── 2. Order dependents ───────────────────────────────────────────────
    if order_ids:
        supabase.table("void_log").delete().in_("order_id", order_ids).execute()
        supabase.table("bills").delete().in_("order_id", order_ids).execute()

    # ── 3. Core branch data ───────────────────────────────────────────────
    supabase.table("orders").delete().eq("branch_id", branch_id).execute()
    supabase.table("bookings").delete().eq("branch_id", branch_id).execute()
    supabase.table("rooms").delete().eq("branch_id", branch_id).execute()

    # ── 4. Staff accounts (notifications + loyalty cascade) ───────────────
    if staff_ids:
        supabase.table("users").delete().in_("id", staff_ids).execute()

    # ── 5. Branch record (branch_budgets + alert_thresholds cascade) ──────
    supabase.table("branches").delete().eq("id", branch_id).execute()

    return


# ─── Owner Overview ───────────────────────────────────────────────────────────

@router.get("/overview")
async def owner_overview(
    days: int = Query(30, ge=1, le=3650),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Consolidated overview across ALL branches for the owner dashboard.
    Accepts either `days` (last N days) or `start_date`/`end_date` (custom range).
    """
    if start_date and end_date:
        start = start_date if "T" in start_date else start_date + "T00:00:00"
        end   = end_date   if "T" in end_date   else end_date   + "T23:59:59"
        from datetime import datetime as _dt
        try:
            days = (_dt.fromisoformat(end_date) - _dt.fromisoformat(start_date)).days + 1
        except Exception:
            days = 0
    else:
        start, end = _period(days)

    # Serve from cache (2-minute TTL — overview is hit on every dashboard load)
    cached = cache_get("owner_overview", days=days, start=start, end=end)
    if cached:
        return cached

    # ── Parallel batch: 5 queries instead of N×4+1 ──────────────────────────
    (branches, all_staff, all_orders, all_bookings, all_rooms) = await _par(
        lambda: supabase.table("branches").select("*").eq("status", "active").execute().data or [],
        lambda: supabase.table("users").select("id, role, status, branch_id").neq("role", "customer").execute().data or [],
        lambda: supabase.table("orders").select("id, items, status, created_at, customer_id, branch_id").gte("created_at", start).lte("created_at", end).not_.in_("status", list(_VOID_STATUSES)).execute().data or [],
        lambda: supabase.table("bookings").select("id, paid_amount, total_amount, status, created_at, branch_id").gte("created_at", start).lte("created_at", end).execute().data or [],
        lambda: supabase.table("rooms").select("id, status, branch_id").execute().data or [],
    )

    # ── Build lookup indexes in Python (O(n), not O(n²)) ─────────────────────
    staff_by_branch: dict = {}
    for s in all_staff:
        staff_by_branch.setdefault(s.get("branch_id"), []).append(s)

    # all_orders already filtered to exclude void statuses (done in the query)
    all_completed = all_orders  # kept for variable-name compatibility below

    # Group orders, bookings, and rooms by their own branch_id (no proxy needed)
    all_orders_by_branch: dict = {}
    completed_by_branch: dict = {}
    bookings_by_branch: dict = {}
    rooms_by_branch: dict = {}

    for o in all_orders:
        all_orders_by_branch.setdefault(o.get("branch_id"), []).append(o)
    for o in all_orders:
        completed_by_branch.setdefault(o.get("branch_id"), []).append(o)
    for b in all_bookings:
        bookings_by_branch.setdefault(b.get("branch_id"), []).append(b)
    for r in all_rooms:
        rooms_by_branch.setdefault(r.get("branch_id"), []).append(r)

    # ── Per-branch stats (zero additional DB calls) ────────────────────────
    branch_stats = []
    for branch in branches:
        bid = branch["id"]
        b_staff    = staff_by_branch.get(bid, [])
        b_all      = all_orders_by_branch.get(bid, [])
        b_done     = completed_by_branch.get(bid, [])
        b_bookings = bookings_by_branch.get(bid, [])
        b_rooms    = rooms_by_branch.get(bid, [])

        fb_rev   = sum(_item_revenue(o) for o in b_done)
        room_rev = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in b_bookings)

        total_rooms_n   = len(b_rooms)
        occupied_rooms_n = sum(1 for r in b_rooms if r.get("status") == "occupied")
        occupancy        = round(occupied_rooms_n / total_rooms_n * 100, 1) if total_rooms_n else 0

        branch_stats.append({
            "id": bid,
            "name": branch["name"],
            "location": branch.get("location"),
            "status": branch.get("status"),
            "stats": {
                "total_revenue":    round(fb_rev + room_rev, 2),
                "fb_revenue":       round(fb_rev, 2),
                "room_revenue":     round(room_rev, 2),
                "total_orders":     len(b_all),
                "completed_orders": len(b_done),
                "total_bookings":   len(b_bookings),
                "unique_customers": len({o.get("customer_id") for o in b_all if o.get("customer_id")}),
                "occupancy_rate":   occupancy,
                "total_rooms":      total_rooms_n,
                "occupied_rooms":   occupied_rooms_n,
                "total_staff":      len(b_staff),
                "active_staff":     sum(1 for s in b_staff if s.get("status") == "active"),
            },
        })

    # ── Consolidated totals from pre-fetched data ─────────────────────────
    total_fb       = sum(_item_revenue(o) for o in all_orders)
    total_room_rev = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in all_bookings)
    total_rooms_all   = len(all_rooms)
    occupied_all      = sum(1 for r in all_rooms if r.get("status") == "occupied")
    avg_occupancy_all = round(occupied_all / total_rooms_all * 100, 1) if total_rooms_all else 0
    consolidated = {
        "total_revenue":      round(total_fb + total_room_rev, 2),
        "fb_revenue":         round(total_fb, 2),
        "room_revenue":       round(total_room_rev, 2),
        "total_orders":       len(all_orders),
        "completed_orders":   len(all_completed),
        "total_bookings":     len(all_bookings),
        "unique_customers":   len({o.get("customer_id") for o in all_orders if o.get("customer_id")}),
        "total_staff":        len(all_staff),
        "active_staff":       sum(1 for s in all_staff if s.get("status") == "active"),
        "avg_occupancy_rate": avg_occupancy_all,
    }

    # Best / worst performing branch by revenue
    if branch_stats:
        ranked = sorted(branch_stats, key=lambda b: b["stats"]["total_revenue"], reverse=True)
        top_branch = ranked[0]["name"]
        needs_attention = ranked[-1]["name"] if len(ranked) > 1 else None
    else:
        top_branch = needs_attention = None

    result = {
        "period_days": days,
        "period_start": start,
        "period_end": end,
        "branches": branch_stats,
        "consolidated": consolidated,
        "top_branch": top_branch,
        "needs_attention": needs_attention,
    }
    cache_set("owner_overview", result, ttl=120, days=days, start=start, end=end)
    return result


@router.get("/branches/{branch_id}/stats")
async def branch_stats(
    branch_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Detailed stats + revenue trend for a single branch."""
    branch = supabase.table("branches").select("*").eq("id", branch_id).execute().data
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    start, end = _period(days)
    stats = _stats_for_branch(supabase, branch_id, start, end)
    trend = _revenue_trend(supabase, branch_id, days)
    return {
        "branch": branch[0],
        "period_days": days,
        "stats": stats,
        "revenue_trend": trend,
    }


@router.get("/consolidated-financials")
async def consolidated_financials(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Consolidated P&L across all branches."""
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")

    # Serve from cache (5-minute TTL)
    cached = cache_get("consolidated_financials", start_date=start_date, end_date=end_date)
    if cached:
        return cached

    start_q = start_date + "T00:00:00"
    end_q = end_date + "T23:59:59"

    # Run all 3 queries in parallel
    orders_res, bookings_res, expenses_res = await _par(
        lambda: supabase.table("orders").select("total_amount, status")
            .gte("created_at", start_q).lte("created_at", end_q).execute(),
        lambda: supabase.table("bookings").select("paid_amount, total_amount")
            .gte("created_at", start_q).lte("created_at", end_q).execute(),
        lambda: supabase.table("expenses").select("amount")
            .gte("expense_date", start_q).lte("expense_date", end_q).execute(),
    )

    orders = orders_res.data or []
    fb_revenue = sum(float(o.get("total_amount") or 0) for o in orders
                     if o.get("status") in ("completed", "delivered", "served"))

    bookings = bookings_res.data or []
    room_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings)

    expenses = expenses_res.data or []
    total_expenses = sum(float(e.get("amount") or 0) for e in expenses)

    total_revenue = fb_revenue + room_revenue
    gross_profit = total_revenue - total_expenses
    margin = round(gross_profit / total_revenue * 100, 1) if total_revenue else 0

    result = {
        "period": {"start": start_date, "end": end_date},
        "revenue": {
            "fb": round(fb_revenue, 2),
            "rooms": round(room_revenue, 2),
            "total": round(total_revenue, 2),
        },
        "expenses": round(total_expenses, 2),
        "gross_profit": round(gross_profit, 2),
        "profit_margin": margin,
    }
    cache_set("consolidated_financials", result, ttl=300, start_date=start_date, end_date=end_date)
    return result


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _lr_forecast(history: list, forecast_days: int) -> list:
    """Simple linear regression over daily revenue to project future days."""
    n = len(history)
    if n < 2:
        avg = sum(d["revenue"] for d in history) / max(n, 1)
        last = datetime.strptime(history[-1]["date"], "%Y-%m-%d") if history else datetime.now()
        return [{"date": (last + timedelta(days=i)).strftime("%Y-%m-%d"), "revenue": round(avg, 2), "forecast": True}
                for i in range(1, forecast_days + 1)]
    x = list(range(n))
    y = [d["revenue"] for d in history]
    sx, sy = sum(x), sum(y)
    sxy = sum(xi * yi for xi, yi in zip(x, y))
    sx2 = sum(xi ** 2 for xi in x)
    denom = n * sx2 - sx ** 2
    slope = (n * sxy - sx * sy) / denom if denom else 0
    intercept = (sy - slope * sx) / n
    last_date = datetime.strptime(history[-1]["date"], "%Y-%m-%d")
    return [{"date": (last_date + timedelta(days=i)).strftime("%Y-%m-%d"),
             "revenue": round(max(0, intercept + slope * (n + i - 1)), 2), "forecast": True}
            for i in range(1, forecast_days + 1)]


def _audit(supabase: Client, user: dict, action: str, resource: str, resource_id: str = None, details: dict = None):
    try:
        supabase.table("audit_log").insert({
            "user_id": user.get("id"), "user_email": user.get("email"),
            "user_role": user.get("role"), "action": action,
            "resource": resource, "resource_id": resource_id,
            "details": details or {},
        }).execute()
    except Exception:
        pass


# ─── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics/seasonal")
async def seasonal_trend(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """12-month monthly revenue breakdown for seasonal analysis."""
    end = datetime.now()
    start = end.replace(year=end.year - 1, day=1)
    orders, bookings = await _par(
        lambda: supabase.table("orders").select("total_amount, status, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .in_("status", ["completed", "delivered", "served"]).execute().data or [],
        lambda: supabase.table("bookings").select("paid_amount, total_amount, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat()).execute().data or [],
    )

    by_month: dict = {}
    for o in orders:
        m = (o.get("created_at") or "")[:7]
        by_month.setdefault(m, {"fb": 0, "rooms": 0})
        by_month[m]["fb"] += float(o.get("total_amount") or 0)
    for b in bookings:
        m = (b.get("created_at") or "")[:7]
        by_month.setdefault(m, {"fb": 0, "rooms": 0})
        by_month[m]["rooms"] += float(b.get("paid_amount") or b.get("total_amount") or 0)

    result = []
    for i in range(13):
        d = (start.replace(day=1) + timedelta(days=32 * i)).replace(day=1)
        key = d.strftime("%Y-%m")
        v = by_month.get(key, {"fb": 0, "rooms": 0})
        result.append({"month": key, "label": d.strftime("%b %Y"),
                        "fb": round(v["fb"], 2), "rooms": round(v["rooms"], 2),
                        "total": round(v["fb"] + v["rooms"], 2)})
    return {"months": result[:12]}


@router.get("/analytics/yoy")
async def yoy_comparison(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """This month vs same month last year, per branch."""
    now = datetime.now()
    this_start = now.replace(day=1, hour=0, minute=0, second=0).isoformat()
    this_end = now.replace(hour=23, minute=59, second=59).isoformat()
    last_start = now.replace(year=now.year - 1, day=1, hour=0, minute=0, second=0).isoformat()
    last_year_month_end = (now.replace(year=now.year - 1, day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    last_end = last_year_month_end.replace(hour=23, minute=59, second=59).isoformat()

    def _rev(s, e):
        o = supabase.table("orders").select("total_amount, status") \
            .gte("created_at", s).lte("created_at", e) \
            .in_("status", ["completed", "delivered", "served"]).execute().data or []
        b = supabase.table("bookings").select("paid_amount, total_amount") \
            .gte("created_at", s).lte("created_at", e).execute().data or []
        return (sum(float(x.get("total_amount") or 0) for x in o),
                sum(float(x.get("paid_amount") or x.get("total_amount") or 0) for x in b))

    (cur_fb, cur_rooms), (prev_fb, prev_rooms) = await _par(
        lambda: _rev(this_start, this_end),
        lambda: _rev(last_start, last_end),
    )
    cur_total = cur_fb + cur_rooms
    prev_total = prev_fb + prev_rooms
    change = round((cur_total - prev_total) / prev_total * 100, 1) if prev_total else 0

    return {
        "current_month": now.strftime("%B %Y"),
        "prior_month": now.replace(year=now.year - 1).strftime("%B %Y"),
        "current": {"fb": round(cur_fb, 2), "rooms": round(cur_rooms, 2), "total": round(cur_total, 2)},
        "prior": {"fb": round(prev_fb, 2), "rooms": round(prev_rooms, 2), "total": round(prev_total, 2)},
        "change_pct": change,
    }


@router.get("/analytics/forecast")
async def revenue_forecast(
    horizon: int = Query(30, ge=7, le=90),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Linear regression forecast for next N days based on last 90 days."""
    end = datetime.now().replace(hour=23, minute=59, second=59)
    start = (end - timedelta(days=90)).replace(hour=0, minute=0, second=0)
    orders, bookings = await _par(
        lambda: supabase.table("orders").select("total_amount, status, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .in_("status", ["completed", "delivered", "served"]).execute().data or [],
        lambda: supabase.table("bookings").select("paid_amount, total_amount, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat()).execute().data or [],
    )

    by_day: dict = {}
    for o in orders:
        d = (o.get("created_at") or "")[:10]
        by_day[d] = by_day.get(d, 0) + float(o.get("total_amount") or 0)
    for b in bookings:
        d = (b.get("created_at") or "")[:10]
        by_day[d] = by_day.get(d, 0) + float(b.get("paid_amount") or b.get("total_amount") or 0)

    history = []
    for i in range(90):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        history.append({"date": day, "revenue": round(by_day.get(day, 0), 2), "forecast": False})

    forecast = _lr_forecast(history, horizon)
    avg_historical = sum(h["revenue"] for h in history) / max(len(history), 1)
    projected_total = sum(f["revenue"] for f in forecast)
    return {
        "history": history,
        "forecast": forecast,
        "horizon_days": horizon,
        "avg_daily_historical": round(avg_historical, 2),
        "projected_total": round(projected_total, 2),
    }


@router.get("/analytics/clv")
async def customer_lifetime_value(
    limit: int = Query(20, ge=5, le=100),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Top customers by total lifetime spend across all channels (last 2 years)."""
    cutoff = (datetime.now() - timedelta(days=730)).isoformat()
    orders, bookings = await _par(
        lambda: supabase.table("orders").select("customer_id, total_amount, status, created_at")
            .gte("created_at", cutoff).in_("status", ["completed", "delivered", "served"]).execute().data or [],
        lambda: supabase.table("bookings").select("customer_id, paid_amount, total_amount, created_at")
            .gte("created_at", cutoff).execute().data or [],
    )

    spend: dict = {}
    visits: dict = {}
    last_visit: dict = {}

    for o in orders:
        cid = o.get("customer_id")
        if not cid: continue
        v = float(o.get("total_amount") or 0)
        spend[cid] = spend.get(cid, 0) + v
        visits[cid] = visits.get(cid, 0) + 1
        d = (o.get("created_at") or "")[:10]
        if d > last_visit.get(cid, ""):
            last_visit[cid] = d

    for b in bookings:
        cid = b.get("customer_id")
        if not cid: continue
        v = float(b.get("paid_amount") or b.get("total_amount") or 0)
        spend[cid] = spend.get(cid, 0) + v
        last_visit[cid] = max(last_visit.get(cid, ""), (b.get("created_at") or "")[:10])

    top_ids = sorted(spend, key=lambda k: spend[k], reverse=True)[:limit]
    if not top_ids:
        return {"customers": []}

    users = supabase.table("users").select("id, full_name, email, phone") \
        .in_("id", top_ids).execute().data or []
    user_map = {u["id"]: u for u in users}

    customers = []
    for cid in top_ids:
        u = user_map.get(cid, {})
        customers.append({
            "id": cid,
            "name": u.get("full_name", "Guest"),
            "email": u.get("email", ""),
            "phone": u.get("phone", ""),
            "total_spend": round(spend[cid], 2),
            "total_visits": visits.get(cid, 0),
            "last_visit": last_visit.get(cid, ""),
            "avg_spend": round(spend[cid] / max(visits.get(cid, 1), 1), 2),
        })
    return {"customers": customers}


# ─── Operations ───────────────────────────────────────────────────────────────

@router.get("/operations/rooms")
async def rooms_status_board(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Live room status across all branches."""
    rooms = supabase.table("rooms").select("id, room_number, type, status, floor, base_price").execute().data or []
    branches = supabase.table("branches").select("id, name, location").execute().data or []

    summary = {b["id"]: {"id": b["id"], "name": b["name"], "location": b.get("location"),
                          "rooms": [], "stats": {"total": 0, "occupied": 0, "vacant": 0, "dirty": 0, "maintenance": 0}}
               for b in branches}
    unassigned = {"id": None, "name": "Unassigned", "location": None, "rooms": [],
                  "stats": {"total": 0, "occupied": 0, "vacant": 0, "dirty": 0, "maintenance": 0}}

    status_map = {"occupied": "occupied", "available": "vacant", "dirty": "dirty",
                  "under_maintenance": "maintenance", "cleaning": "dirty",
                  "reserved": "occupied", "out_of_order": "maintenance"}

    for r in rooms:
        st = status_map.get(r.get("status", "available"), "vacant")
        entry = {"id": r["id"], "room_number": r.get("room_number", "?"),
                 "type": r.get("type", "Room"), "status": r.get("status", "available"),
                 "status_group": st, "floor": r.get("floor"), "base_price": r.get("base_price")}
        # All rooms go to first branch if no branch_id on rooms table
        if branches:
            bid = branches[0]["id"]
            if bid in summary:
                summary[bid]["rooms"].append(entry)
                summary[bid]["stats"]["total"] += 1
                summary[bid]["stats"][st] = summary[bid]["stats"].get(st, 0) + 1
        else:
            unassigned["rooms"].append(entry)
            unassigned["stats"]["total"] += 1
            unassigned["stats"][st] = unassigned["stats"].get(st, 0) + 1

    result = [v for v in summary.values() if v["stats"]["total"] > 0]
    if unassigned["stats"]["total"] > 0:
        result.append(unassigned)

    total_rooms = sum(b["stats"]["total"] for b in result)
    occupied = sum(b["stats"]["occupied"] for b in result)
    return {
        "branches": result,
        "summary": {
            "total_rooms": total_rooms,
            "occupied": occupied,
            "vacant": sum(b["stats"]["vacant"] for b in result),
            "dirty": sum(b["stats"]["dirty"] for b in result),
            "maintenance": sum(b["stats"]["maintenance"] for b in result),
            "occupancy_rate": round(occupied / total_rooms * 100, 1) if total_rooms else 0,
        }
    }


@router.get("/operations/inventory-alerts")
async def inventory_alerts(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Cross-branch low stock and out-of-stock alerts (from menu_items stock tracking)."""
    try:
        items = supabase.table("menu_items").select(
            "id, name, category, stock_quantity, reorder_level, unit, cost_price, track_inventory, stock_department"
        ).or_("track_inventory.eq.true,stock_quantity.gt.0").execute().data or []

        low = [i for i in items if float(i.get("stock_quantity") or 0) <= float(i.get("reorder_level") or 0)]
        critical = [i for i in low if float(i.get("stock_quantity") or 0) == 0]
        alerts = []
        for i in low:
            qty = float(i.get("stock_quantity") or 0)
            min_qty = float(i.get("reorder_level") or 0)
            level = "critical" if qty == 0 else "low"
            alerts.append({
                "id": i["id"], "name": i.get("name", ""), "category": i.get("category", ""),
                "quantity": qty, "min_quantity": min_qty, "unit": i.get("unit", ""),
                "unit_cost": float(i.get("cost_price") or 0), "level": level,
                "department": i.get("stock_department") or "general",
                "shortfall": round(max(0, min_qty - qty), 2),
                "reorder_cost": round(max(0, min_qty - qty) * float(i.get("cost_price") or 0), 2),
            })
        alerts.sort(key=lambda a: (0 if a["level"] == "critical" else 1, a["name"]))
        return {"alerts": alerts, "total": len(alerts), "critical": len(critical),
                "low": len(low) - len(critical), "total_reorder_cost": round(sum(a["reorder_cost"] for a in alerts), 2)}
    except Exception as e:
        return {"alerts": [], "total": 0, "critical": 0, "low": 0, "total_reorder_cost": 0}


@router.get("/operations/housekeeping")
async def housekeeping_status(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Rooms pending housekeeping across all branches."""
    try:
        dirty_rooms = supabase.table("rooms").select("id, room_number, type, status") \
            .in_("status", ["dirty", "cleaning"]).execute().data or []
    except Exception:
        dirty_rooms = []

    tasks = []
    try:
        tasks = supabase.table("housekeeping_tasks").select(
            "id, task_type, status, priority, room_id, assigned_to, scheduled_time, created_at"
        ).in_("status", ["pending", "assigned", "in_progress"]) \
            .order("priority").limit(100).execute().data or []

        staff_ids = list({t.get("assigned_to") for t in tasks if t.get("assigned_to")})
        staff_map = {}
        if staff_ids:
            staff = supabase.table("users").select("id, full_name").in_("id", staff_ids).execute().data or []
            staff_map = {s["id"]: s["full_name"] for s in staff}
        tasks = [{**t, "assigned_to_name": staff_map.get(t.get("assigned_to"), "Unassigned")} for t in tasks]
    except Exception:
        pass

    urgent = [t for t in tasks if t.get("priority") in ("urgent", "high")]
    return {
        "pending_tasks": len(tasks),
        "urgent_tasks": len(urgent),
        "dirty_rooms": len(dirty_rooms),
        "tasks": tasks,
        "dirty_room_list": dirty_rooms,
    }


@router.get("/operations/service-requests")
async def pending_service_requests(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Unresolved service requests across all branches."""
    try:
        requests = supabase.table("service_requests").select(
            "id, request_number, title, category, status, priority, created_at, guest_id"
        ).in_("status", ["pending", "assigned", "in_progress"]).order("created_at", desc=False).limit(200).execute().data or []
    except Exception:
        requests = []

    by_priority: dict = {}
    for r in requests:
        p = r.get("priority", "normal")
        by_priority.setdefault(p, []).append(r)

    return {
        "total": len(requests),
        "urgent": len(by_priority.get("urgent", [])),
        "high": len(by_priority.get("high", [])),
        "normal": len(by_priority.get("normal", [])),
        "requests": requests,
    }


# ─── Budget vs Actual ─────────────────────────────────────────────────────────

class BudgetSet(BaseModel):
    branch_id: str
    month: str
    revenue_target: Optional[float] = 0
    expense_budget: Optional[float] = 0
    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    revenue_target: Optional[float] = None
    expense_budget: Optional[float] = None
    notes: Optional[str] = None


@router.get("/reports/budget")
async def get_budgets(
    year: Optional[int] = Query(None),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Budget targets with actual performance for the year."""
    if not year:
        year = datetime.now().year
    year_start = f"{year}-01-01T00:00:00"
    year_end = f"{year}-12-31T23:59:59"

    budgets, branches, orders, bookings, expenses_data = await _par(
        lambda: supabase.table("branch_budgets").select("*")
            .gte("month", f"{year}-01-01").lte("month", f"{year}-12-31").execute().data or [],
        lambda: supabase.table("branches").select("id, name").execute().data or [],
        lambda: supabase.table("orders").select("total_amount, status, created_at")
            .gte("created_at", year_start).lte("created_at", year_end)
            .in_("status", ["completed", "delivered", "served"]).execute().data or [],
        lambda: supabase.table("bookings").select("paid_amount, total_amount, created_at")
            .gte("created_at", year_start).lte("created_at", year_end).execute().data or [],
        lambda: supabase.table("expenses").select("amount, expense_date")
            .gte("expense_date", year_start).lte("expense_date", year_end).execute().data or [],
    )

    actual_rev: dict = {}
    for o in orders:
        m = (o.get("created_at") or "")[:7]
        actual_rev[m] = actual_rev.get(m, 0) + float(o.get("total_amount") or 0)
    for b in bookings:
        m = (b.get("created_at") or "")[:7]
        actual_rev[m] = actual_rev.get(m, 0) + float(b.get("paid_amount") or b.get("total_amount") or 0)
    actual_exp: dict = {}
    for e in expenses_data:
        m = (e.get("expense_date") or "")[:7]
        actual_exp[m] = actual_exp.get(m, 0) + float(e.get("amount") or 0)

    budget_map = {(b["branch_id"], b["month"][:7]): b for b in budgets}
    branch_map = {b["id"]: b["name"] for b in branches}

    months = [f"{year}-{m:02d}" for m in range(1, 13)]
    result = []
    for month in months:
        total_target = sum(v["revenue_target"] for k, v in budget_map.items() if k[1] == month)
        actual = actual_rev.get(month, 0)
        exp_actual = actual_exp.get(month, 0)
        exp_budget = sum(v["expense_budget"] for k, v in budget_map.items() if k[1] == month)
        result.append({
            "month": month,
            "revenue_target": round(total_target, 2),
            "actual_revenue": round(actual, 2),
            "revenue_variance": round(actual - total_target, 2),
            "revenue_attainment": round(actual / total_target * 100, 1) if total_target else 0,
            "expense_budget": round(exp_budget, 2),
            "actual_expenses": round(exp_actual, 2),
            "expense_variance": round(exp_budget - exp_actual, 2),
        })

    per_branch = []
    for branch in branches:
        b_budgets = [(k, v) for k, v in budget_map.items() if k[0] == branch["id"]]
        per_branch.append({
            "branch_id": branch["id"], "branch_name": branch["name"],
            "budgets": [{"month": k[1], **v} for k, v in b_budgets],
        })

    return {"year": year, "monthly": result, "per_branch": per_branch, "branches": branches}


@router.post("/reports/budget", status_code=201)
async def set_budget(
    body: BudgetSet,
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    month_str = body.month[:7] + "-01"
    result = supabase.table("branch_budgets").upsert({
        "branch_id": body.branch_id, "month": month_str,
        "revenue_target": body.revenue_target, "expense_budget": body.expense_budget,
        "notes": body.notes, "updated_at": datetime.now().isoformat(),
    }, on_conflict="branch_id,month").execute()
    _audit(supabase, current_user, "upsert", "branch_budget", body.branch_id,
           {"month": month_str, "revenue_target": body.revenue_target})
    return result.data[0] if result.data else {}


# ─── Expense Breakdown ────────────────────────────────────────────────────────

@router.get("/reports/expenses")
async def expense_breakdown(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Expenses broken down by category/type."""
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    sq, eq = start_date + "T00:00:00", end_date + "T23:59:59"

    expenses = supabase.table("expenses").select("amount, expense_type, title, expense_date, status").gte("expense_date", sq).lte("expense_date", eq).execute().data or []

    by_type: dict = {}
    for e in expenses:
        t = e.get("expense_type") or "other"
        by_type.setdefault(t, {"total": 0, "count": 0, "items": []})
        amt = float(e.get("amount") or 0)
        by_type[t]["total"] += amt
        by_type[t]["count"] += 1
        by_type[t]["items"].append({"title": e.get("title", ""), "amount": amt, "date": (e.get("expense_date") or "")[:10]})

    total = sum(v["total"] for v in by_type.values())
    categories = [{"type": t, "label": t.replace("_", " ").title(), "total": round(v["total"], 2),
                   "count": v["count"], "pct": round(v["total"] / total * 100, 1) if total else 0}
                  for t, v in by_type.items()]
    categories.sort(key=lambda c: c["total"], reverse=True)
    return {"period": {"start": start_date, "end": end_date}, "total": round(total, 2), "categories": categories}


# ─── Cash Flow ────────────────────────────────────────────────────────────────

@router.get("/reports/cashflow")
async def cash_flow(
    days: int = Query(30, ge=7, le=365),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Daily cash inflows vs outflows."""
    end = datetime.now().replace(hour=23, minute=59, second=59)
    start = (end - timedelta(days=days)).replace(hour=0, minute=0, second=0)

    orders, bookings, expenses_data = await _par(
        lambda: supabase.table("orders").select("total_amount, status, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .in_("status", ["completed", "delivered", "served"]).execute().data or [],
        lambda: supabase.table("bookings").select("paid_amount, total_amount, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat()).execute().data or [],
        lambda: supabase.table("expenses").select("amount, expense_date")
            .gte("expense_date", start.isoformat()).lte("expense_date", end.isoformat()).execute().data or [],
    )

    inflow: dict = {}
    outflow: dict = {}
    for o in orders:
        d = (o.get("created_at") or "")[:10]
        inflow[d] = inflow.get(d, 0) + float(o.get("total_amount") or 0)
    for b in bookings:
        d = (b.get("created_at") or "")[:10]
        inflow[d] = inflow.get(d, 0) + float(b.get("paid_amount") or b.get("total_amount") or 0)
    for e in expenses_data:
        d = (e.get("expense_date") or "")[:10]
        outflow[d] = outflow.get(d, 0) + float(e.get("amount") or 0)

    timeline = []
    running = 0.0
    for i in range(days):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        inf = round(inflow.get(day, 0), 2)
        out = round(outflow.get(day, 0), 2)
        net = round(inf - out, 2)
        running = round(running + net, 2)
        timeline.append({"date": day, "inflow": inf, "outflow": out, "net": net, "running_balance": running})

    return {
        "days": days,
        "total_inflow": round(sum(inflow.values()), 2),
        "total_outflow": round(sum(outflow.values()), 2),
        "net_cash_flow": round(sum(inflow.values()) - sum(outflow.values()), 2),
        "timeline": timeline,
    }


# ─── AR Aging ─────────────────────────────────────────────────────────────────

@router.get("/reports/ar-aging")
async def ar_aging(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Accounts receivable aging — unpaid/partially paid bills."""
    bills = supabase.table("bills").select("id, bill_number, total_amount, payment_status, customer_name, created_at").in_("payment_status", ["unpaid", "partially_paid"]).execute().data or []
    now = datetime.now()
    buckets = {"0_30": [], "31_60": [], "61_90": [], "over_90": []}
    for b in bills:
        try:
            created = datetime.fromisoformat((b.get("created_at") or now.isoformat())[:19])
            age = (now - created).days
        except Exception:
            age = 0
        bucket = "0_30" if age <= 30 else "31_60" if age <= 60 else "61_90" if age <= 90 else "over_90"
        buckets[bucket].append({**b, "age_days": age, "amount": float(b.get("total_amount") or 0)})
    summary = {k: {"count": len(v), "total": round(sum(x["amount"] for x in v), 2)} for k, v in buckets.items()}
    return {"summary": summary, "total_outstanding": round(sum(s["total"] for s in summary.values()), 2), "buckets": buckets}


# ─── VAT Summary ─────────────────────────────────────────────────────────────

@router.get("/reports/vat")
async def vat_summary(
    year: Optional[int] = Query(None),
    vat_rate: float = Query(16.0),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Monthly VAT collected across all branches."""
    if not year:
        year = datetime.now().year
    orders, bookings = await _par(
        lambda: supabase.table("orders").select("total_amount, status, created_at")
            .gte("created_at", f"{year}-01-01T00:00:00").lte("created_at", f"{year}-12-31T23:59:59")
            .in_("status", ["completed", "delivered", "served"]).execute().data or [],
        lambda: supabase.table("bookings").select("paid_amount, total_amount, created_at")
            .gte("created_at", f"{year}-01-01T00:00:00").lte("created_at", f"{year}-12-31T23:59:59").execute().data or [],
    )

    by_month: dict = {}
    for o in orders:
        m = (o.get("created_at") or "")[:7]
        by_month[m] = by_month.get(m, 0) + float(o.get("total_amount") or 0)
    for b in bookings:
        m = (b.get("created_at") or "")[:7]
        by_month[m] = by_month.get(m, 0) + float(b.get("paid_amount") or b.get("total_amount") or 0)

    rate = vat_rate / 100
    months = []
    for m in range(1, 13):
        key = f"{year}-{m:02d}"
        gross = by_month.get(key, 0)
        vat = round(gross * rate / (1 + rate), 2)
        net = round(gross - vat, 2)
        months.append({"month": key, "gross_revenue": round(gross, 2), "vat_collected": vat, "net_revenue": net})

    total_vat = round(sum(m["vat_collected"] for m in months), 2)
    return {"year": year, "vat_rate": vat_rate, "months": months, "total_vat_collected": total_vat,
            "total_gross": round(sum(m["gross_revenue"] for m in months), 2)}


# ─── People ───────────────────────────────────────────────────────────────────

@router.get("/people/performance")
async def staff_performance(
    days: int = Query(30, ge=7, le=365),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Staff performance metrics by role across all branches."""
    end = datetime.now().replace(hour=23, minute=59, second=59)
    start = (end - timedelta(days=days)).replace(hour=0, minute=0, second=0)

    orders, tasks_done, staff, branches = await _par(
        lambda: supabase.table("orders").select("total_amount, status, assigned_waiter_id, created_by_staff_id, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .not_.in_("status", ["cancelled", "canceled", "void", "voided", "void_requested"]).execute().data or [],
        lambda: supabase.table("housekeeping_tasks").select("assigned_to, task_type, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .eq("status", "completed").execute().data or [],
        lambda: supabase.table("users").select("id, full_name, role, branch_id, status").neq("role", "customer").execute().data or [],
        lambda: supabase.table("branches").select("id, name").execute().data or [],
    )
    branch_map = {b["id"]: b["name"] for b in branches}

    waiter_stats: dict = {}
    for o in orders:
        # Prefer assigned_waiter_id; fall back to created_by_staff_id for orders
        # placed directly by the waiter without explicit assignment
        wid = o.get("assigned_waiter_id") or o.get("created_by_staff_id")
        if not wid: continue
        waiter_stats.setdefault(wid, {"orders": 0, "revenue": 0})
        waiter_stats[wid]["orders"] += 1
        waiter_stats[wid]["revenue"] += float(o.get("total_amount") or 0)

    cleaner_stats: dict = {}
    for t in tasks_done:
        aid = t.get("assigned_to")
        if not aid: continue
        cleaner_stats[aid] = cleaner_stats.get(aid, 0) + 1

    performance = []
    for s in staff:
        sid = s["id"]
        role = s.get("role", "")
        branch_name = branch_map.get(s.get("branch_id", ""), "—")
        if role == "waiter":
            ws = waiter_stats.get(sid, {"orders": 0, "revenue": 0})
            performance.append({"id": sid, "name": s.get("full_name", ""), "role": role,
                                 "branch": branch_name, "metric_label": "Orders",
                                 "metric_value": ws["orders"], "revenue": round(ws["revenue"], 2),
                                 "avg_per_order": round(ws["revenue"] / max(ws["orders"], 1), 2)})
        elif role in ("cleaner", "housekeeping"):
            performance.append({"id": sid, "name": s.get("full_name", ""), "role": role,
                                 "branch": branch_name, "metric_label": "Tasks Done",
                                 "metric_value": cleaner_stats.get(sid, 0), "revenue": 0, "avg_per_order": 0})

    performance.sort(key=lambda p: p["metric_value"], reverse=True)
    return {"performance": performance, "period_days": days}


@router.get("/people/directory")
async def staff_directory(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """All staff across all branches with contact info."""
    staff = supabase.table("users").select("id, full_name, email, phone, role, branch_id, status, created_at").neq("role", "customer").order("role").execute().data or []
    branches = supabase.table("branches").select("id, name, location").execute().data or []
    branch_map = {b["id"]: b for b in branches}

    for s in staff:
        s["branch"] = branch_map.get(s.get("branch_id", ""), {}).get("name", "—")
        s["branch_location"] = branch_map.get(s.get("branch_id", ""), {}).get("location", "")

    by_role: dict = {}
    for s in staff:
        r = s.get("role", "other")
        by_role.setdefault(r, []).append(s)

    return {"staff": staff, "by_role": by_role, "total": len(staff),
            "by_branch": {b["name"]: [s for s in staff if s.get("branch_id") == b["id"]] for b in branches}}


@router.patch("/people/{staff_id}/branch")
async def assign_staff_branch(
    staff_id: str,
    body: dict,
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Assign or unassign a staff member to a branch."""
    branch_id = body.get("branch_id")  # None/null = unassign
    update = {"branch_id": branch_id}
    result = supabase.table("users").update(update).eq("id", staff_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"success": True, "staff_id": staff_id, "branch_id": branch_id}


@router.get("/people/payroll")
async def payroll_overview(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Headcount and payroll estimation by role and branch."""
    ROLE_RATES = {"manager": 80000, "admin": 75000, "chef": 55000, "waiter": 35000,
                  "cleaner": 28000, "housekeeping": 30000}
    staff = supabase.table("users").select("id, role, branch_id, status").neq("role", "customer").eq("status", "active").execute().data or []
    branches = supabase.table("branches").select("id, name").execute().data or []
    branch_map = {b["id"]: b["name"] for b in branches}

    by_branch: dict = {}
    for s in staff:
        bid = s.get("branch_id", "unassigned")
        bname = branch_map.get(bid, "Unassigned")
        by_branch.setdefault(bid, {"branch_id": bid, "branch_name": bname, "headcount": 0, "estimated_payroll": 0, "by_role": {}})
        role = s.get("role", "other")
        by_branch[bid]["headcount"] += 1
        rate = ROLE_RATES.get(role, 30000)
        by_branch[bid]["estimated_payroll"] += rate
        by_branch[bid]["by_role"].setdefault(role, {"count": 0, "estimated_cost": 0})
        by_branch[bid]["by_role"][role]["count"] += 1
        by_branch[bid]["by_role"][role]["estimated_cost"] += rate

    total_payroll = sum(b["estimated_payroll"] for b in by_branch.values())
    return {"branches": list(by_branch.values()), "total_headcount": len(staff),
            "total_estimated_payroll": total_payroll,
            "note": "Estimates based on standard Kenyan market rates in KES"}


# ─── Customers ────────────────────────────────────────────────────────────────

@router.get("/customers/reviews")
async def reviews_summary(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Review and rating summary."""
    reviews = supabase.table("reviews").select(
        "overall_rating, cleanliness_rating, staff_rating, value_rating, comment, created_at, status"
    ).eq("status", "approved").order("created_at", desc=True).limit(500).execute().data or []

    if not reviews:
        return {"total": 0, "avg_rating": 0, "distribution": {}, "recent": []}

    total = len(reviews)
    avg = round(sum(float(r.get("overall_rating") or 0) for r in reviews) / total, 2)
    avg_cleanliness = round(sum(float(r.get("cleanliness_rating") or 0) for r in reviews) / total, 2)
    avg_staff = round(sum(float(r.get("staff_rating") or 0) for r in reviews) / total, 2)
    avg_value = round(sum(float(r.get("value_rating") or 0) for r in reviews) / total, 2)

    dist = {str(i): sum(1 for r in reviews if int(r.get("overall_rating") or 0) == i) for i in range(1, 6)}
    recent = sorted(reviews, key=lambda r: r.get("created_at") or "", reverse=True)[:10]

    return {"total": total, "avg_rating": avg, "avg_cleanliness": avg_cleanliness,
            "avg_staff": avg_staff, "avg_value": avg_value,
            "distribution": dist, "recent": recent}


@router.get("/customers/repeat-rate")
async def repeat_customer_rate(
    days: int = Query(90, ge=30, le=365),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Repeat customer analysis and loyalty breakdown."""
    end = datetime.now().replace(hour=23, minute=59, second=59)
    start = (end - timedelta(days=days)).replace(hour=0, minute=0, second=0)

    orders, bookings = await _par(
        lambda: supabase.table("orders").select("customer_id, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .not_.is_("customer_id", "null").execute().data or [],
        lambda: supabase.table("bookings").select("customer_id, created_at")
            .gte("created_at", start.isoformat()).lte("created_at", end.isoformat())
            .not_.is_("customer_id", "null").execute().data or [],
    )

    visits: dict = {}
    for o in orders:
        cid = o.get("customer_id")
        if cid: visits[cid] = visits.get(cid, 0) + 1
    for b in bookings:
        cid = b.get("customer_id")
        if cid: visits[cid] = visits.get(cid, 0) + 1

    total = len(visits)
    repeats = sum(1 for v in visits.values() if v > 1)
    loyal = sum(1 for v in visits.values() if v >= 5)
    repeat_rate = round(repeats / total * 100, 1) if total else 0

    freq_dist = {"1": 0, "2-3": 0, "4-6": 0, "7+": 0}
    for v in visits.values():
        if v == 1: freq_dist["1"] += 1
        elif v <= 3: freq_dist["2-3"] += 1
        elif v <= 6: freq_dist["4-6"] += 1
        else: freq_dist["7+"] += 1

    return {"period_days": days, "total_customers": total, "repeat_customers": repeats,
            "loyal_customers": loyal, "repeat_rate_pct": repeat_rate,
            "frequency_distribution": freq_dist}


# ─── Alerts ───────────────────────────────────────────────────────────────────

class AlertThreshold(BaseModel):
    branch_id: Optional[str] = None
    name: str
    metric: str
    operator: str
    threshold_value: float
    is_active: bool = True


@router.get("/alerts/thresholds")
async def get_alert_thresholds(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    thresholds = supabase.table("owner_alert_thresholds").select("*").execute().data or []
    branches = supabase.table("branches").select("id, name").execute().data or []
    branch_map = {b["id"]: b["name"] for b in branches}
    for t in thresholds:
        t["branch_name"] = branch_map.get(t.get("branch_id", ""), "All Branches")
    return {"thresholds": thresholds}


@router.post("/alerts/thresholds", status_code=201)
async def create_alert_threshold(
    body: AlertThreshold,
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    result = supabase.table("owner_alert_thresholds").insert(body.model_dump(exclude_none=True)).execute()
    _audit(supabase, current_user, "create", "alert_threshold", None, body.model_dump())
    return result.data[0] if result.data else {}


@router.patch("/alerts/thresholds/{threshold_id}")
async def update_alert_threshold(
    threshold_id: str,
    body: AlertThreshold,
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now().isoformat()
    result = supabase.table("owner_alert_thresholds").update(updates).eq("id", threshold_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/alerts/thresholds/{threshold_id}", status_code=204)
async def delete_alert_threshold(
    threshold_id: str,
    current_user: dict = Depends(require_role(["owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    supabase.table("owner_alert_thresholds").delete().eq("id", threshold_id).execute()
    return


@router.get("/alerts/active")
async def get_active_alerts(
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    """Evaluate all active thresholds and return triggered alerts."""
    thresholds = supabase.table("owner_alert_thresholds").select("*").eq("is_active", True).execute().data or []
    if not thresholds:
        return {"alerts": [], "total": 0}

    # Get current metrics — all 4 fetched in parallel
    start, end = _period(1)

    def _room_counts():
        r = supabase.table("rooms").select("id, status").execute().data or []
        total = len(r)
        occ = sum(1 for x in r if x.get("status") == "occupied")
        return total, occ

    def _today_revenue():
        rows = supabase.table("orders").select("total_amount, status") \
            .gte("created_at", start).lte("created_at", end) \
            .in_("status", ["completed", "delivered", "served"]).execute().data or []
        return sum(float(o.get("total_amount") or 0) for o in rows)

    def _pending_requests():
        r = supabase.table("service_requests").select("id", count="exact") \
            .in_("status", ["pending", "assigned"]).execute()
        return r.count or 0

    def _low_stock_count():
        inv = get_supabase()
        rows = inv.table("inventory_items").select("id, quantity, min_quantity").eq("is_active", True).execute().data or []
        return sum(1 for i in rows if float(i.get("quantity") or 0) <= float(i.get("min_quantity") or 0))

    (total_rooms, occupied), today_revenue, pending_count, low_stock = await _par(
        _room_counts, _today_revenue, _pending_requests, _low_stock_count,
    )
    occupancy = round(occupied / total_rooms * 100, 1) if total_rooms else 0

    metric_values = {
        "occupancy_rate": occupancy,
        "daily_revenue": today_revenue,
        "pending_requests": pending_count,
        "low_stock_items": low_stock,
    }

    triggered = []
    for t in thresholds:
        metric = t.get("metric")
        current_val = metric_values.get(metric)
        if current_val is None:
            continue
        threshold_val = float(t.get("threshold_value") or 0)
        op = t.get("operator")
        fired = (op == "below" and current_val < threshold_val) or \
                (op == "above" and current_val > threshold_val)
        if fired:
            triggered.append({
                "id": t["id"], "name": t.get("name", ""),
                "metric": metric, "operator": op,
                "threshold": threshold_val, "current_value": current_val,
                "severity": "critical" if (op == "below" and current_val < threshold_val * 0.5) or
                                          (op == "above" and current_val > threshold_val * 1.5) else "warning",
            })

    return {"alerts": triggered, "total": len(triggered), "metric_snapshot": metric_values}


@router.get("/alerts/audit-log")
async def get_audit_log(
    limit: int = Query(50, ge=10, le=200),
    current_user: dict = Depends(require_role(OWNER_ROLES)),
    supabase: Client = Depends(get_supabase_admin)
):
    logs = supabase.table("audit_log").select("*").order("created_at", desc=True).limit(limit).execute().data or []
    return {"logs": logs, "total": len(logs)}


# ─── Stock Balance (Owner read-only view) ─────────────────────────────────────

@router.get("/stock/balances")
async def owner_stock_balances(
    category: Optional[str] = None,
    current_user: dict = Depends(require_role(OWNER_ROLES)),
):
    """Current stock balance for all tracked menu items."""
    inv = get_supabase()
    query = inv.table("menu_items").select(
        "id, name, category, stock_quantity, reorder_level, unit, cost_price, is_available"
    ).or_("track_inventory.eq.true,stock_quantity.gt.0")
    if category:
        query = query.eq("category", category)
    items = query.order("category").order("name").execute().data or []

    for item in items:
        qty = float(item.get("stock_quantity") or 0)
        reorder = float(item.get("reorder_level") or 0)
        item["value"] = round(qty * float(item.get("cost_price") or 0), 2)
        item["stock_status"] = "out_of_stock" if qty <= 0 else ("low_stock" if qty <= reorder else "in_stock")

    total_value = sum(i["value"] for i in items)
    low = sum(1 for i in items if i["stock_status"] == "low_stock")
    out = sum(1 for i in items if i["stock_status"] == "out_of_stock")
    return {
        "items": items,
        "summary": {
            "total_tracked": len(items),
            "low_stock": low,
            "out_of_stock": out,
            "in_stock": len(items) - low - out,
            "total_value": round(total_value, 2),
        }
    }


@router.get("/stock/movements")
async def owner_stock_movements(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    item_id: Optional[str] = None,
    current_user: dict = Depends(require_role(["owner", "admin", "manager"])),
):
    """Receipts and adjustments merged — lets owner trace stock on any date range."""
    from datetime import date as _date, timedelta as _td
    if not start_date:
        start_date = (_date.today() - _td(days=30)).isoformat()
    if not end_date:
        end_date = _date.today().isoformat()

    inv = get_supabase_admin()

    def _receipts():
        try:
            q = inv.table("stock_receipts").select(
                "id, receipt_number, item_name, quantity, unit, unit_cost, total_cost, supplier, invoice_number, received_by, received_at, notes"
            ).gte("received_at", f"{start_date}T00:00:00").lte("received_at", f"{end_date}T23:59:59")
            if item_id:
                q = q.eq("menu_item_id", item_id)
            return q.order("received_at", desc=True).limit(500).execute().data or []
        except Exception:
            return []

    def _adjustments():
        try:
            q = inv.table("stock_adjustments").select(
                "id, menu_item_id, item_name, adjustment_type, quantity_before, quantity_after, reason, adjusted_by, created_at"
            ).gte("created_at", f"{start_date}T00:00:00").lte("created_at", f"{end_date}T23:59:59")
            if item_id:
                q = q.eq("menu_item_id", item_id)
            return q.order("created_at", desc=True).limit(1000).execute().data or []
        except Exception:
            return []

    def _users(all_ids):
        try:
            if not all_ids:
                return []
            return inv.table("users").select("id, full_name").in_("id", all_ids).execute().data or []
        except Exception:
            return []

    receipts, adjustments = await _par(_receipts, _adjustments)

    # Split adjustments into sales vs manual adjustments
    sales = [a for a in adjustments if a.get("adjustment_type") == "sale"]
    manual_adjustments = [a for a in adjustments if a.get("adjustment_type") != "sale"]

    # Enrich with user names
    receiver_ids = list({r.get("received_by") for r in receipts if r.get("received_by")})
    adj_by_ids = list({a.get("adjusted_by") for a in adjustments if a.get("adjusted_by")})
    all_ids = list(set(receiver_ids + adj_by_ids))
    users = await _par(lambda: _users(all_ids))
    user_map = {u["id"]: u.get("full_name", "Unknown") for u in (users[0] if users else [])}

    for r in receipts:
        r["type"] = "receipt"
        r["date"] = r.get("received_at", "")[:10]
        r["performed_by"] = user_map.get(r.get("received_by"), "—")
        r["change"] = f"+{r['quantity']} {r.get('unit','')}"

    for a in adjustments:
        a["type"] = "sale" if a.get("adjustment_type") == "sale" else "adjustment"
        a["date"] = (a.get("created_at") or "")[:10]
        a["performed_by"] = user_map.get(a.get("adjusted_by"), "—")
        diff = float(a.get("quantity_after") or 0) - float(a.get("quantity_before") or 0)
        a["change"] = f"{'+' if diff >= 0 else ''}{diff:.1f}"
        a["quantity_sold"] = float(a.get("quantity_before") or 0) - float(a.get("quantity_after") or 0) if a["type"] == "sale" else None

    all_movements = sorted(receipts + adjustments, key=lambda x: x.get("date", ""), reverse=True)
    total_received = sum(float(r.get("total_cost") or 0) for r in receipts)
    total_sold = sum(a.get("quantity_sold") or 0 for a in sales)
    return {
        "movements": all_movements,
        "total_movements": len(all_movements),
        "total_receipts": len(receipts),
        "total_adjustments": len(manual_adjustments),
        "total_sales": len(sales),
        "total_received_cost": round(total_received, 2),
        "total_units_sold": round(total_sold, 2),
        "date_range": {"start": start_date, "end": end_date},
    }
