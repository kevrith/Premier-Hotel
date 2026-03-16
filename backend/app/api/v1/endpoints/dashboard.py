"""
Dashboard Summary Endpoint
Returns all manager/admin KPIs in a single API call
"""
import logging
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
    Replaces 6 separate hook calls.
    """
    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    month_ago = (date.today() - timedelta(days=30)).isoformat()
    today_start = f"{today}T00:00:00"
    today_end = f"{today}T23:59:59"

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
        # ── Orders stats ──────────────────────────────────────────────
        try:
            orders_res = supabase.table("orders").select("total_amount, status, payment_status, created_at")\
                .gte("created_at", today_start).lte("created_at", today_end).execute()
            orders_today = orders_res.data or []
            result["orders"]["today_count"] = len(orders_today)
            result["orders"]["today_revenue"] = sum(float(o.get("total_amount", 0)) for o in orders_today if o.get("payment_status") != "cancelled")
            result["orders"]["pending"] = sum(1 for o in orders_today if o.get("status") in ["pending", "confirmed"])
            result["orders"]["in_progress"] = sum(1 for o in orders_today if o.get("status") in ["preparing", "in_progress"])
            result["orders"]["completed_today"] = sum(1 for o in orders_today if o.get("status") in ["served", "completed"])
            result["revenue"]["today"] = result["orders"]["today_revenue"]
        except Exception as e:
            logging.warning(f"Orders stats error: {e}")

        # ── Week + Month revenue ──────────────────────────────────────
        try:
            week_res = supabase.table("orders").select("total_amount")\
                .gte("created_at", f"{week_ago}T00:00:00").lte("created_at", today_end).execute()
            result["revenue"]["week"] = sum(float(o.get("total_amount", 0)) for o in (week_res.data or []))

            month_res = supabase.table("orders").select("total_amount")\
                .gte("created_at", f"{month_ago}T00:00:00").lte("created_at", today_end).execute()
            result["revenue"]["month"] = sum(float(o.get("total_amount", 0)) for o in (month_res.data or []))
        except Exception as e:
            logging.warning(f"Revenue stats error: {e}")

        # ── Room revenue from bookings ─────────────────────────────────
        try:
            room_rev_res = supabase.table("bookings").select("total_price")\
                .gte("created_at", f"{month_ago}T00:00:00").lte("created_at", today_end)\
                .in_("status", ["confirmed", "completed"]).execute()
            result["revenue"]["room"] = sum(float(b.get("total_price", 0)) for b in (room_rev_res.data or []))
        except Exception as e:
            logging.warning(f"Room revenue error: {e}")

        # ── Staff stats ───────────────────────────────────────────────
        try:
            staff_res = supabase.table("users").select("id, role, status, created_at")\
                .in_("role", ["waiter", "chef", "cleaner", "manager"]).execute()
            staff = staff_res.data or []
            thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
            result["staff"]["total"] = len(staff)
            result["staff"]["active"] = sum(1 for s in staff if s.get("status") == "active")
            result["staff"]["waiters"] = sum(1 for s in staff if s.get("role") == "waiter")
            result["staff"]["chefs"] = sum(1 for s in staff if s.get("role") == "chef")
            result["staff"]["cleaners"] = sum(1 for s in staff if s.get("role") == "cleaner")
            result["staff"]["recent_hires"] = sum(1 for s in staff if s.get("created_at", "") >= thirty_days_ago)
        except Exception as e:
            logging.warning(f"Staff stats error: {e}")

        # ── Room status ───────────────────────────────────────────────
        try:
            rooms_res = supabase.table("rooms").select("status").execute()
            rooms = rooms_res.data or []
            result["rooms"]["available"] = sum(1 for r in rooms if r.get("status") == "available")
            result["rooms"]["occupied"] = sum(1 for r in rooms if r.get("status") == "occupied")
            result["rooms"]["cleaning"] = sum(1 for r in rooms if r.get("status") in ["cleaning", "dirty"])
            result["rooms"]["maintenance"] = sum(1 for r in rooms if r.get("status") == "maintenance")
            total_rooms = len(rooms)
            if total_rooms > 0:
                result["occupancy_rate"] = round(result["rooms"]["occupied"] / total_rooms * 100, 1)
        except Exception as e:
            logging.warning(f"Room status error: {e}")

        # ── Pending tasks ─────────────────────────────────────────────
        try:
            hk_res = supabase.table("housekeeping_tasks").select("id").eq("status", "pending").execute()
            sr_res = supabase.table("service_requests").select("id").eq("status", "pending").execute()
            result["pending_tasks"]["housekeeping"] = len(hk_res.data or [])
            result["pending_tasks"]["service_requests"] = len(sr_res.data or [])
            result["pending_tasks"]["total"] = result["pending_tasks"]["housekeeping"] + result["pending_tasks"]["service_requests"]
        except Exception as e:
            logging.warning(f"Pending tasks error: {e}")

        # ── Daily check-ins/check-outs ────────────────────────────────
        try:
            ci_res = supabase.table("bookings").select("id").eq("check_in", today).in_("status", ["confirmed", "checked_in"]).execute()
            co_res = supabase.table("bookings").select("id").eq("check_out", today).eq("status", "completed").execute()
            result["daily"]["check_ins"] = len(ci_res.data or [])
            result["daily"]["check_outs"] = len(co_res.data or [])
            result["daily"]["meal_orders"] = result["orders"]["today_count"]
        except Exception as e:
            logging.warning(f"Daily stats error: {e}")

        # ── Customer satisfaction ─────────────────────────────────────
        try:
            rev_res = supabase.table("reviews").select("rating")\
                .gte("created_at", f"{month_ago}T00:00:00").execute()
            reviews = rev_res.data or []
            if reviews:
                result["customer_satisfaction"] = round(sum(r.get("rating", 0) for r in reviews) / len(reviews), 1)
        except Exception as e:
            logging.warning(f"Reviews error: {e}")

    except Exception as e:
        logging.error(f"Dashboard summary error: {e}")

    return result
