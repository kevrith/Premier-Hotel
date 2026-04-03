"""
Dashboard Summary Endpoint
Returns all manager/admin KPIs in a single API call
"""
import logging
import asyncio
from fastapi import APIRouter, Depends
from datetime import datetime, date, timedelta, timezone
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user

router = APIRouter()


@router.get("/manager/summary")
async def get_manager_dashboard_summary(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Single endpoint returning all KPIs for the manager dashboard.
    All DB queries run in parallel via asyncio.to_thread().
    """
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    month_ago = (date.today() - timedelta(days=30)).isoformat()
    thirty_days_ago = month_ago
    today_start = f"{today}T00:00:00"
    today_end = f"{today}T23:59:59"

    # ── Define all queries as callables ──────────────────────────────────
    VOID_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}

    def _line_revenue(orders: list) -> float:
        """price × qty from line items, excluding voided items and cancelled orders."""
        total = 0.0
        for o in orders:
            if o.get("status") in VOID_STATUSES:
                continue
            for i in (o.get("items") or []):
                if isinstance(i, dict) and not i.get("voided"):
                    total += float(i.get("price", 0)) * int(i.get("quantity", 0))
        return total

    def q_orders_today():
        return supabase.table("orders").select("items, status, payment_status") \
            .gte("created_at", today_start).lte("created_at", today_end).execute()

    def q_orders_week():
        return supabase.table("orders").select("items, status") \
            .gte("created_at", f"{week_ago}T00:00:00").lte("created_at", today_end).execute()

    def q_orders_month():
        return supabase.table("orders").select("items, status") \
            .gte("created_at", f"{month_ago}T00:00:00").lte("created_at", today_end).execute()

    def q_room_revenue():
        return supabase.table("bookings").select("total_price") \
            .gte("created_at", f"{month_ago}T00:00:00").lte("created_at", today_end) \
            .in_("status", ["confirmed", "completed"]).execute()

    def q_staff():
        return supabase.table("users").select("id, role, status, created_at") \
            .in_("role", ["waiter", "chef", "cleaner", "manager"]).execute()

    def q_rooms():
        return supabase.table("rooms").select("status").execute()

    def q_housekeeping():
        return supabase.table("housekeeping_tasks").select("id").eq("status", "pending").execute()

    def q_service_requests():
        return supabase.table("service_requests").select("id").eq("status", "pending").execute()

    def q_check_ins():
        return supabase.table("bookings").select("id") \
            .eq("check_in", today).in_("status", ["confirmed", "checked_in"]).execute()

    def q_check_outs():
        return supabase.table("bookings").select("id") \
            .eq("check_out", today).eq("status", "completed").execute()

    def q_reviews():
        return supabase.table("reviews").select("rating") \
            .gte("created_at", f"{month_ago}T00:00:00").execute()

    # ── Run all queries in parallel ───────────────────────────────────────
    results = await asyncio.gather(
        asyncio.to_thread(q_orders_today),
        asyncio.to_thread(q_orders_week),
        asyncio.to_thread(q_orders_month),
        asyncio.to_thread(q_room_revenue),
        asyncio.to_thread(q_staff),
        asyncio.to_thread(q_rooms),
        asyncio.to_thread(q_housekeeping),
        asyncio.to_thread(q_service_requests),
        asyncio.to_thread(q_check_ins),
        asyncio.to_thread(q_check_outs),
        asyncio.to_thread(q_reviews),
        return_exceptions=True,
    )

    (
        r_orders_today, r_orders_week, r_orders_month, r_room_rev,
        r_staff, r_rooms, r_hk, r_sr, r_ci, r_co, r_reviews
    ) = results

    # ── Aggregate ─────────────────────────────────────────────────────────
    result = {
        "revenue": {"today": 0, "week": 0, "month": 0, "room": 0},
        "orders": {"today_count": 0, "today_revenue": 0, "pending": 0, "in_progress": 0, "completed_today": 0},
        "staff": {"total": 0, "active": 0, "waiters": 0, "chefs": 0, "cleaners": 0, "recent_hires": 0},
        "rooms": {"occupied": 0, "available": 0, "cleaning": 0, "maintenance": 0},
        "pending_tasks": {"housekeeping": 0, "service_requests": 0, "total": 0},
        "occupancy_rate": 0,
        "customer_satisfaction": 0,
        "daily": {"check_ins": 0, "check_outs": 0, "meal_orders": 0},
    }

    try:
        orders_today = (r_orders_today.data or []) if not isinstance(r_orders_today, Exception) else []
        result["orders"]["today_count"] = len(orders_today)
        result["orders"]["today_revenue"] = _line_revenue(orders_today)
        result["orders"]["pending"] = sum(1 for o in orders_today if o.get("status") in ["pending", "confirmed"])
        result["orders"]["in_progress"] = sum(1 for o in orders_today if o.get("status") in ["preparing", "in_progress"])
        result["orders"]["completed_today"] = sum(1 for o in orders_today if o.get("status") in ["served", "completed"])
        result["revenue"]["today"] = result["orders"]["today_revenue"]
    except Exception as e:
        logging.warning(f"Orders stats error: {e}")

    try:
        if not isinstance(r_orders_week, Exception):
            result["revenue"]["week"] = _line_revenue(r_orders_week.data or [])
        if not isinstance(r_orders_month, Exception):
            result["revenue"]["month"] = _line_revenue(r_orders_month.data or [])
    except Exception as e:
        logging.warning(f"Revenue stats error: {e}")

    try:
        if not isinstance(r_room_rev, Exception):
            result["revenue"]["room"] = sum(float(b.get("total_price", 0)) for b in (r_room_rev.data or []))
    except Exception as e:
        logging.warning(f"Room revenue error: {e}")

    try:
        staff = (r_staff.data or []) if not isinstance(r_staff, Exception) else []
        result["staff"]["total"] = len(staff)
        result["staff"]["active"] = sum(1 for s in staff if s.get("status") == "active")
        result["staff"]["waiters"] = sum(1 for s in staff if s.get("role") == "waiter")
        result["staff"]["chefs"] = sum(1 for s in staff if s.get("role") == "chef")
        result["staff"]["cleaners"] = sum(1 for s in staff if s.get("role") == "cleaner")
        result["staff"]["recent_hires"] = sum(1 for s in staff if s.get("created_at", "") >= thirty_days_ago)
    except Exception as e:
        logging.warning(f"Staff stats error: {e}")

    try:
        rooms = (r_rooms.data or []) if not isinstance(r_rooms, Exception) else []
        result["rooms"]["available"] = sum(1 for r in rooms if r.get("status") == "available")
        result["rooms"]["occupied"] = sum(1 for r in rooms if r.get("status") == "occupied")
        result["rooms"]["cleaning"] = sum(1 for r in rooms if r.get("status") in ["cleaning", "dirty"])
        result["rooms"]["maintenance"] = sum(1 for r in rooms if r.get("status") == "maintenance")
        total_rooms = len(rooms)
        if total_rooms > 0:
            result["occupancy_rate"] = round(result["rooms"]["occupied"] / total_rooms * 100, 1)
    except Exception as e:
        logging.warning(f"Room status error: {e}")

    try:
        result["pending_tasks"]["housekeeping"] = len((r_hk.data or []) if not isinstance(r_hk, Exception) else [])
        result["pending_tasks"]["service_requests"] = len((r_sr.data or []) if not isinstance(r_sr, Exception) else [])
        result["pending_tasks"]["total"] = result["pending_tasks"]["housekeeping"] + result["pending_tasks"]["service_requests"]
    except Exception as e:
        logging.warning(f"Pending tasks error: {e}")

    try:
        result["daily"]["check_ins"] = len((r_ci.data or []) if not isinstance(r_ci, Exception) else [])
        result["daily"]["check_outs"] = len((r_co.data or []) if not isinstance(r_co, Exception) else [])
        result["daily"]["meal_orders"] = result["orders"]["today_count"]
    except Exception as e:
        logging.warning(f"Daily stats error: {e}")

    try:
        reviews = (r_reviews.data or []) if not isinstance(r_reviews, Exception) else []
        if reviews:
            result["customer_satisfaction"] = round(sum(r.get("rating", 0) for r in reviews) / len(reviews), 1)
    except Exception as e:
        logging.warning(f"Reviews error: {e}")

    return result
