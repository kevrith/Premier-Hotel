"""
Reports and Analytics Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from app.middleware.auth_secure import get_current_user, require_role
from app.core.supabase import get_supabase, get_supabase_admin
from supabase import Client

_executor = ThreadPoolExecutor(max_workers=6)

async def _par(*fns):
    """Run synchronous callables in parallel, return results in order."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await asyncio.gather(*[loop.run_in_executor(_executor, fn) for fn in fns])


def _start(date_str: str) -> str:
    return date_str if 'T' in date_str else date_str + 'T00:00:00'


def _end(date_str: str) -> str:
    return date_str if 'T' in date_str else date_str + 'T23:59:59'

router = APIRouter()


@router.get("/overview")
async def get_reports_overview(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get overall reports overview with key metrics.
    Uses parallel queries and count-only where possible for speed.
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        def _bookings():
            return supabase.table("bookings").select(
                "status, paid_amount, total_amount, customer_id"
            ).gte("created_at", start_date).lte("created_at", end_date).limit(2000).execute()

        def _orders():
            return supabase.table("orders").select(
                "status, items, total_amount, customer_id, payment_status"
            ).gte("created_at", start_date).lte("created_at", end_date).limit(2000).execute()

        bookings_res, orders_res = await _par(_bookings, _orders)
        bookings_data = bookings_res.data or []
        orders_data   = orders_res.data or []

        VOID_STATUSES_RPT = {"voided", "void", "cancelled", "canceled", "void_requested"}
        booking_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings_data)
        order_revenue   = sum(
            sum(float(i.get("price", 0)) * int(i.get("quantity", 0))
                for i in (o.get("items") or []) if isinstance(i, dict) and not i.get("voided"))
            for o in orders_data
            if o.get("status") not in VOID_STATUSES_RPT
        )
        total_revenue = booking_revenue + order_revenue

        total_bookings     = len(bookings_data)
        confirmed_bookings = sum(1 for b in bookings_data if b.get("status") in ["confirmed", "checked_in", "checked_out"])
        total_orders       = len(orders_data)
        completed_orders   = sum(1 for o in orders_data if o.get("status") in ["delivered", "completed", "served"])

        booking_users = {b["customer_id"] for b in bookings_data if b.get("customer_id")}
        order_users   = {o["customer_id"] for o in orders_data   if o.get("customer_id")}
        active_customers = len(booking_users | order_users)

        paid_orders   = sum(1 for o in orders_data if o.get("payment_status") in ["paid", "completed"])
        paid_bookings = sum(1 for b in bookings_data if b.get("paid_amount") and float(b.get("paid_amount", 0)) > 0)

        return {
            "period":    {"start": start_date, "end": end_date},
            "revenue":   {"total": total_revenue, "currency": "KES", "payments_count": paid_orders + paid_bookings},
            "bookings":  {
                "total": total_bookings,
                "confirmed": confirmed_bookings,
                "cancellation_rate": round((total_bookings - confirmed_bookings) / total_bookings * 100, 2) if total_bookings > 0 else 0,
            },
            "orders":    {
                "total": total_orders,
                "completed": completed_orders,
                "completion_rate": round(completed_orders / total_orders * 100, 2) if total_orders > 0 else 0,
            },
            "customers": {"active": active_customers},
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate reports overview: {str(e)}"
        )


@router.get("/revenue")
async def get_revenue_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    group_by: str = Query("day", description="Group by: day, week, month"),
    current_user: dict = Depends(require_role(["admin", "manager", "staff", "owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get revenue analytics grouped by time period
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        start_date = _start(start_date)
        end_date   = _end(end_date)

        # Fetch all sources in parallel
        def _b(): return supabase.table("bookings").select(
            "paid_amount, total_amount, payment_method, created_at"
        ).gte("created_at", start_date).lte("created_at", end_date).order("created_at").limit(2000).execute()

        def _o(): return supabase.table("orders").select(
            "total_amount, payment_method, payment_status, status, created_at"
        ).gte("created_at", start_date).lte("created_at", end_date).order("created_at").limit(2000).execute()

        bookings_res, orders_res = await _par(_b, _o)
        bookings = bookings_res
        orders   = orders_res

        # Group revenue by date
        revenue_by_date: Dict[str, Dict[str, Any]] = {}

        # Process bookings
        for booking in bookings.data:
            created_at = datetime.fromisoformat(booking["created_at"].replace('Z', '+00:00'))

            if group_by == "day":
                date_key = created_at.strftime("%Y-%m-%d")
            elif group_by == "week":
                date_key = created_at.strftime("%Y-W%W")
            else:  # month
                date_key = created_at.strftime("%Y-%m")

            if date_key not in revenue_by_date:
                revenue_by_date[date_key] = {
                    "date": date_key,
                    "total": 0,
                    "bookings": 0,
                    "orders": 0,
                    "mpesa": 0,
                    "cash": 0,
                    "card": 0,
                    "count": 0
                }

            amount = float(booking.get("paid_amount") or booking.get("total_amount") or 0)
            if amount > 0:
                revenue_by_date[date_key]["total"] += amount
                revenue_by_date[date_key]["bookings"] += amount
                revenue_by_date[date_key]["count"] += 1

                # By payment method
                method = (booking.get("payment_method") or "cash").lower()
                if method in ["mpesa", "m-pesa"]:
                    revenue_by_date[date_key]["mpesa"] += amount
                elif method == "card":
                    revenue_by_date[date_key]["card"] += amount
                else:
                    revenue_by_date[date_key]["cash"] += amount

        # Process orders — count all non-voided/cancelled orders
        # (matches employee-sales endpoint which correctly shows sales data)
        EXCLUDED_ORDER_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}
        for order in orders.data:
            if (order.get("status") or "").lower() in EXCLUDED_ORDER_STATUSES:
                continue

            created_at = datetime.fromisoformat(order["created_at"].replace('Z', '+00:00'))

            if group_by == "day":
                date_key = created_at.strftime("%Y-%m-%d")
            elif group_by == "week":
                date_key = created_at.strftime("%Y-W%W")
            else:  # month
                date_key = created_at.strftime("%Y-%m")

            if date_key not in revenue_by_date:
                revenue_by_date[date_key] = {
                    "date": date_key,
                    "total": 0,
                    "bookings": 0,
                    "orders": 0,
                    "mpesa": 0,
                    "cash": 0,
                    "card": 0,
                    "count": 0
                }

            amount = float(order.get("total_amount") or 0)
            if amount > 0:
                revenue_by_date[date_key]["total"] += amount
                revenue_by_date[date_key]["orders"] += amount
                revenue_by_date[date_key]["count"] += 1

                # By payment method
                method = (order.get("payment_method") or "cash").lower()
                if method in ["mpesa", "m-pesa"]:
                    revenue_by_date[date_key]["mpesa"] += amount
                elif method == "card":
                    revenue_by_date[date_key]["card"] += amount
                else:
                    revenue_by_date[date_key]["cash"] += amount
        
        # Convert to list and sort
        revenue_data = sorted(revenue_by_date.values(), key=lambda x: x["date"])

        # Calculate totals
        total_revenue = sum(item["total"] for item in revenue_data)
        total_transactions = sum(item["count"] for item in revenue_data)
        avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0

        return {
            "period": {
                "start": start_date,
                "end": end_date,
                "group_by": group_by
            },
            "summary": {
                "total_revenue": total_revenue,
                "total_transactions": total_transactions,
                "average_transaction": round(avg_transaction, 2)
            },
            "data": revenue_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate revenue analytics: {str(e)}"
        )


@router.get("/bookings-stats")
async def get_bookings_statistics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get booking statistics and trends
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        start_date = _start(start_date)
        end_date   = _end(end_date)

        # Get all bookings in period
        bookings = supabase.table("bookings").select(
            "id, status, total_amount, room_id, check_in_date, check_out_date, created_at"
        ).gte("created_at", start_date).lte("created_at", end_date).limit(2000).execute()

        # Get rooms to map room_id -> room type
        rooms = supabase.table("rooms").select("id, type").execute()
        room_type_map = {r["id"]: r.get("type", "unknown") for r in rooms.data}

        # Calculate statistics
        total_bookings = len(bookings.data)
        status_counts = {}
        room_type_counts = {}
        total_revenue = 0

        for booking in bookings.data:
            # Count by status
            booking_status = booking.get("status", "unknown")
            status_counts[booking_status] = status_counts.get(booking_status, 0) + 1

            # Count by room type (lookup from rooms table)
            room_type = room_type_map.get(booking.get("room_id"), "unknown")
            room_type_counts[room_type] = room_type_counts.get(room_type, 0) + 1

            # Calculate revenue
            if booking.get("total_amount"):
                total_revenue += float(booking["total_amount"])

        # Calculate average stay duration (columns are check_in_date/check_out_date)
        durations = []
        for booking in bookings.data:
            if booking.get("check_in_date") and booking.get("check_out_date"):
                check_in = datetime.fromisoformat(booking["check_in_date"].replace('Z', '+00:00'))
                check_out = datetime.fromisoformat(booking["check_out_date"].replace('Z', '+00:00'))
                durations.append((check_out - check_in).days)

        avg_duration = sum(durations) / len(durations) if durations else 0

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "summary": {
                "total_bookings": total_bookings,
                "total_revenue": total_revenue,
                "average_booking_value": total_revenue / total_bookings if total_bookings > 0 else 0,
                "average_stay_duration": round(avg_duration, 1)
            },
            "by_status": status_counts,
            "by_room_type": room_type_counts
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate booking statistics: {str(e)}"
        )


@router.get("/orders-stats")
async def get_orders_statistics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get order statistics and trends
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        start_date = _start(start_date)
        end_date   = _end(end_date)

        # Get all orders in period (select only needed fields — avoids fetching heavy JSON blobs)
        orders = supabase.table("orders").select(
            "id, status, total_amount, location, location_type, items, created_at"
        ).gte("created_at", start_date).lte("created_at", end_date).limit(2000).execute()

        # Calculate statistics
        total_orders = len(orders.data)
        status_counts = {}
        total_revenue = 0
        delivery_location_counts = {}

        for order in orders.data:
            # Count by status
            order_status = order.get("status", "unknown")
            status_counts[order_status] = status_counts.get(order_status, 0) + 1

            # Calculate revenue
            if order.get("total_amount"):
                total_revenue += float(order["total_amount"])

            # Count by location
            location = order.get("location") or order.get("location_type", "unknown")
            delivery_location_counts[location] = delivery_location_counts.get(location, 0) + 1

        # Get order items from the JSON items field in each order
        item_quantities: Dict[str, Dict[str, Any]] = {}
        for order in orders.data:
            order_items_list = order.get("items") or []
            if isinstance(order_items_list, list):
                for item in order_items_list:
                    key = item.get("menu_item_id") or item.get("name", "unknown")
                    name = item.get("name") or key
                    qty = item.get("quantity", 0)
                    price = float(item.get("price") or item.get("unit_price") or 0)
                    if key not in item_quantities:
                        item_quantities[key] = {"name": name, "quantity": 0, "revenue": 0.0, "category": item.get("category", "")}
                    item_quantities[key]["quantity"] += qty
                    item_quantities[key]["revenue"] += price * qty

        # Get top 5 items by quantity
        top_items_sorted = sorted(item_quantities.items(), key=lambda x: x[1]["quantity"], reverse=True)[:5]

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "summary": {
                "total_orders": total_orders,
                "total_revenue": total_revenue,
                "average_order_value": total_revenue / total_orders if total_orders > 0 else 0,
                "completion_rate": round(status_counts.get("delivered", 0) / total_orders * 100, 2) if total_orders > 0 else 0
            },
            "by_status": status_counts,
            "by_location": delivery_location_counts,
            "top_items": [
                {"menu_item_id": k, "name": v["name"], "quantity": v["quantity"], "revenue": round(v["revenue"], 2), "category": v["category"]}
                for k, v in top_items_sorted
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate order statistics: {str(e)}"
        )


@router.get("/top-customers")
async def get_top_customers(
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get top customers by spending (aggregated from orders + bookings).
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=90)).isoformat()

        start_date = _start(start_date)
        end_date   = _end(end_date)

        def _orders():
            return supabase.table("orders").select(
                "customer_id, total_amount, status"
            ).gte("created_at", start_date).lte("created_at", end_date).limit(2000).execute()

        def _bookings():
            return supabase.table("bookings").select(
                "customer_id, total_amount, status"
            ).gte("created_at", start_date).lte("created_at", end_date).limit(2000).execute()

        orders_res, bookings_res = await _par(_orders, _bookings)

        EXCLUDED = {"voided", "void", "cancelled", "canceled", "void_requested"}

        user_spending: Dict[str, Dict[str, Any]] = {}

        for order in (orders_res.data or []):
            cid = order.get("customer_id")
            if not cid:
                continue
            if (order.get("status") or "").lower() in EXCLUDED:
                continue
            amount = float(order.get("total_amount") or 0)
            if amount <= 0:
                continue
            if cid not in user_spending:
                user_spending[cid] = {"total": 0.0, "count": 0}
            user_spending[cid]["total"] += amount
            user_spending[cid]["count"] += 1

        for booking in (bookings_res.data or []):
            cid = booking.get("customer_id")
            if not cid:
                continue
            amount = float(booking.get("total_amount") or 0)
            if amount <= 0:
                continue
            if cid not in user_spending:
                user_spending[cid] = {"total": 0.0, "count": 0}
            user_spending[cid]["total"] += amount
            user_spending[cid]["count"] += 1

        top_users = sorted(
            user_spending.items(),
            key=lambda x: x[1]["total"],
            reverse=True
        )[:limit]

        result = [
            {
                "user_id": uid,
                "total_spent": round(data["total"], 2),
                "transaction_count": data["count"],
                "average_transaction": round(data["total"] / data["count"], 2)
            }
            for uid, data in top_users
        ]

        return {"period": {"start": start_date, "end": end_date}, "customers": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get top customers: {str(e)}"
        )


@router.get("/employee-sales")
async def get_employee_sales_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    employee_id: Optional[str] = Query(None, description="Specific employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[str] = Query(None, description="Filter by role"),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Orders-first employee sales report.
    Only shows employees who actually have orders in the period.
    Chefs are excluded — they cook orders, not create them.
    Customer orders attached to a waiter count for that waiter.
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Ensure time components so timestamp comparisons work correctly
        if 'T' not in start_date:
            start_date = start_date + 'T00:00:00'
        if 'T' not in end_date:
            end_date = end_date + 'T23:59:59'

        # ── Step 1: Fetch all orders in the period ────────────────────
        VOID_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}

        orders_res = supabase.table("orders").select(
            "id, total_amount, status, created_at, items, bill_id, "
            "assigned_waiter_id, created_by_staff_id"
        ).gte("created_at", start_date).lte("created_at", end_date).execute()
        # Exclude voided/cancelled — must match item-summary exclusion list exactly
        all_orders = [o for o in (orders_res.data or []) if o.get("status") not in VOID_STATUSES]

        # ── Step 2: Collect staff IDs who have orders ─────────────────
        staff_order_map: Dict[str, list] = {}
        unattributed_orders = []

        for o in all_orders:
            staff_id = o.get("assigned_waiter_id") or o.get("created_by_staff_id")
            if staff_id:
                staff_order_map.setdefault(staff_id, []).append(o)
            else:
                unattributed_orders.append(o)

        if employee_id:
            staff_order_map = {k: v for k, v in staff_order_map.items() if k == employee_id}

        def _order_revenue(order: dict) -> float:
            """Sum price*qty from non-voided line items — same method item-summary uses."""
            return sum(
                float(i.get("price", 0)) * int(i.get("quantity", 0))
                for i in (order.get("items") or [])
                if isinstance(i, dict) and not i.get("voided") and int(i.get("quantity", 0)) > 0
            )

        if not staff_order_map:
            return {
                "period": {"start": start_date, "end": end_date},
                "total_employees": 0, "total_sales": 0, "total_orders": 0,
                "unattributed_sales": round(sum(_order_revenue(o) for o in unattributed_orders), 2),
                "unattributed_orders": len(unattributed_orders),
                "employees": []
            }

        # ── Step 3: Batch-fetch users, payments, bills (3 queries total) ──
        staff_ids = list(staff_order_map.keys())
        users_res = supabase.table("users").select(
            "id, full_name, email, role, department"
        ).in_("id", staff_ids).execute()
        users_map = {u["id"]: u for u in (users_res.data or [])}

        # Collect ALL bill IDs from ALL orders at once
        all_bill_ids = list({o["bill_id"] for o in all_orders if o.get("bill_id")})

        global_payments_by_bill: Dict[str, list] = {}
        global_bills_map: Dict[str, dict] = {}

        if all_bill_ids:
            pay_res = supabase.table("payments").select(
                "id, bill_id, amount, payment_method, mpesa_code, mpesa_phone, "
                "payment_status, processed_by_waiter_id, created_at"
            ).in_("bill_id", all_bill_ids).execute()
            for p in (pay_res.data or []):
                global_payments_by_bill.setdefault(p["bill_id"], []).append(p)

            bill_res = supabase.table("bills").select(
                "id, bill_number, total_amount"
            ).in_("id", all_bill_ids).execute()
            global_bills_map = {b["id"]: b for b in (bill_res.data or [])}

        # ── Step 3b: Batch-fetch menu item categories for item summary ──────────
        all_menu_item_ids = list({
            str(item.get("menu_item_id") or item.get("id") or "")
            for o in all_orders
            for item in (o.get("items") or [])
            if isinstance(item, dict) and (item.get("menu_item_id") or item.get("id"))
        })
        menu_category_map: Dict[str, str] = {}
        if all_menu_item_ids:
            mi_res = supabase.table("menu_items").select("id, category").in_(
                "id", all_menu_item_ids
            ).execute()
            for mi in (mi_res.data or []):
                menu_category_map[str(mi["id"])] = mi.get("category") or "Other"

        # ── Step 4: Build per-employee stats (pure Python, no more DB calls) ──
        today = datetime.now().date()
        this_week_start = today - timedelta(days=today.weekday())
        this_month_start = datetime(today.year, today.month, 1).date()

        def safe_date(ts):
            try:
                return datetime.fromisoformat(ts.replace('Z', '+00:00')).date()
            except Exception:
                return None

        employee_sales_list = []

        for staff_id, emp_orders in staff_order_map.items():
            user = users_map.get(staff_id)
            emp_role = (user.get("role") if user else None) or "staff"

            if emp_role == "chef":
                continue
            if role and emp_role != role:
                continue

            # Use price*qty from line items — same method as item-summary endpoint
            # so both reports show identical grand totals
            total_sales = round(sum(_order_revenue(o) for o in emp_orders), 2)
            total_orders = len(emp_orders)
            completed_orders = len([o for o in emp_orders if o.get("status") in ["delivered", "completed", "served"]])

            emp_order_items = []
            for order in emp_orders:
                for item in (order.get("items") or []):
                    if not isinstance(item, dict):
                        continue
                    # Skip fully-voided items (item["voided"] = True set by void-item endpoint)
                    if item.get("voided"):
                        continue
                    qty = int(item.get("quantity", 0))
                    if qty <= 0:
                        continue
                    mid = str(item.get("menu_item_id") or item.get("id") or "")
                    emp_order_items.append({
                        "menu_item_id": mid,
                        "quantity": qty,
                        "name": item.get("name", "Unknown"),
                        "price": float(item.get("price", 0)),
                        "category": menu_category_map.get(mid) or item.get("category") or "Other",
                    })

            total_items_sold = sum(oi.get("quantity", 0) for oi in emp_order_items)

            # Build per-department, per-item summary for thermal printing
            dept_agg: Dict[str, Dict[str, dict]] = {}
            for oi in emp_order_items:
                dept = oi.get("category", "Other")
                name = oi.get("name", "Unknown")
                dept_agg.setdefault(dept, {})
                if name not in dept_agg[dept]:
                    dept_agg[dept][name] = {"name": name, "qty": 0, "revenue": 0.0}
                dept_agg[dept][name]["qty"] += oi.get("quantity", 0)
                dept_agg[dept][name]["revenue"] += oi.get("price", 0) * oi.get("quantity", 0)

            items_summary = [
                {
                    "department": dept,
                    "items": sorted(items.values(), key=lambda x: x["name"].lower()),
                    "total_qty": sum(i["qty"] for i in items.values()),
                    "total_revenue": round(sum(i["revenue"] for i in items.values()), 2),
                }
                for dept, items in sorted(dept_agg.items())
            ]
            avg_order_value = total_sales / total_orders if total_orders > 0 else 0

            orders_today = sum(1 for o in emp_orders if safe_date(o.get("created_at", "")) == today)
            orders_this_week = sum(1 for o in emp_orders if (safe_date(o.get("created_at", "")) or today) >= this_week_start)
            orders_this_month = sum(1 for o in emp_orders if (safe_date(o.get("created_at", "")) or today) >= this_month_start)

            item_counts: Dict[str, int] = {}
            item_names: Dict[str, str] = {}
            for oi in emp_order_items:
                key = oi.get("menu_item_id") or oi.get("name", "Unknown")
                item_counts[key] = item_counts.get(key, 0) + oi.get("quantity", 0)
                item_names[key] = oi.get("name", "Unknown")
            top_key = max(item_counts, key=lambda k: item_counts[k]) if item_counts else None
            top_selling_item = item_names.get(top_key, "N/A") if top_key else "N/A"

            sorted_orders = sorted(emp_orders, key=lambda x: x.get("created_at", ""))
            first_sale_time = last_sale_time = "N/A"
            if sorted_orders:
                try:
                    first_sale_time = datetime.fromisoformat(sorted_orders[0]["created_at"].replace('Z', '+00:00')).strftime("%I:%M %p")
                    last_sale_time = datetime.fromisoformat(sorted_orders[-1]["created_at"].replace('Z', '+00:00')).strftime("%I:%M %p")
                except Exception:
                    pass

            # ── Payment breakdown (uses pre-fetched data, no extra queries) ──
            emp_bill_ids = {o["bill_id"] for o in emp_orders if o.get("bill_id")}
            payment_cash = payment_mpesa = payment_card = payment_room_charge = payment_other = 0.0
            mpesa_transactions: list = []
            split_bills: list = []

            for bid in emp_bill_ids:
                bill_payments = global_payments_by_bill.get(bid, [])
                bill_info = global_bills_map.get(bid, {})
                bill_number = bill_info.get("bill_number", "N/A")
                bill_total = float(bill_info.get("total_amount") or 0)
                processors = {p.get("processed_by_waiter_id") for p in bill_payments if p.get("processed_by_waiter_id")}
                if len(processors) > 1:
                    split_bills.append({
                        "bill_number": bill_number,
                        "bill_id": bid,
                        "your_amount": round(sum(float(p.get("amount") or 0) for p in bill_payments), 2),
                        "total_amount": round(bill_total, 2),
                        "split_count": len(processors)
                    })
                for p in bill_payments:
                    if p.get("payment_status") not in ("completed", "paid", None):
                        continue
                    amt = float(p.get("amount") or 0)
                    method = (p.get("payment_method") or "cash").lower()
                    if method == "mpesa":
                        payment_mpesa += amt
                        if p.get("mpesa_code"):
                            mpesa_transactions.append({"mpesa_code": p["mpesa_code"], "amount": round(amt, 2), "phone": p.get("mpesa_phone", ""), "bill_number": bill_number, "date": p.get("created_at", "")})
                    elif method in ("card", "credit_card", "debit_card"):
                        payment_card += amt
                    elif method in ("room_charge", "room charge"):
                        payment_room_charge += amt
                    elif method == "cash":
                        payment_cash += amt
                    else:
                        payment_other += amt

            total_collected = round(payment_cash + payment_mpesa + payment_card + payment_room_charge + payment_other, 2)

            employee_sales_list.append({
                "employee_id": staff_id,
                "employee_name": user.get("full_name", "Unknown") if user else "Unknown",
                "email": user.get("email", "") if user else "",
                "role": emp_role,
                "department": (user.get("department") if user else None) or "Unassigned",
                "total_sales": round(total_sales, 2),
                "total_orders": total_orders,
                "completed_orders": completed_orders,
                "avg_order_value": round(avg_order_value, 2),
                "total_items_sold": total_items_sold,
                "orders_today": orders_today,
                "orders_this_week": orders_this_week,
                "orders_this_month": orders_this_month,
                "top_selling_item": top_selling_item,
                "first_sale_time": first_sale_time,
                "last_sale_time": last_sale_time,
                "completion_rate": round(completed_orders / total_orders * 100, 2) if total_orders > 0 else 0,
                "payment_summary": {
                    "cash": round(payment_cash, 2),
                    "mpesa": round(payment_mpesa, 2),
                    "card": round(payment_card, 2),
                    "room_charge": round(payment_room_charge, 2),
                    "other": round(payment_other, 2),
                    "total_collected": total_collected
                },
                "mpesa_transactions": sorted(mpesa_transactions, key=lambda x: x["date"], reverse=True),
                "split_bills": split_bills,
                "items_summary": items_summary,
            })

        employee_sales_list.sort(key=lambda x: x["total_sales"], reverse=True)
        unattributed_sales = round(sum(_order_revenue(o) for o in unattributed_orders), 2)

        return {
            "period": {"start": start_date, "end": end_date},
            "total_employees": len(employee_sales_list),
            "total_sales": round(sum(e["total_sales"] for e in employee_sales_list), 2),
            "total_orders": sum(e["total_orders"] for e in employee_sales_list),
            "unattributed_sales": round(unattributed_sales, 2),
            "unattributed_orders": len(unattributed_orders),
            "employees": employee_sales_list
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate employee sales report: {str(e)}"
        )


async def process_housekeeping_report(
    supabase: Client,
    employee: dict,
    all_tasks: list,
    start_date: str,
    end_date: str
) -> dict:
    """
    Process housekeeping employee report based on tasks/rooms cleaned.
    """
    employee_id = employee["id"]
    employee_role = employee.get("role", "cleaner")

    # Calculate task-based metrics
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for task in all_tasks if task.get("status") == "completed")
    in_progress_tasks = sum(1 for task in all_tasks if task.get("status") == "in_progress")
    pending_tasks = sum(1 for task in all_tasks if task.get("status") == "pending")

    # Count rooms cleaned
    rooms_cleaned = set()
    task_details = []
    daily_tasks = {}
    priority_breakdown = {}

    for task in all_tasks:
        room_id = task.get("room_id")
        if room_id:
            rooms_cleaned.add(room_id)

        # Task detail
        task_details.append({
            "id": task.get("id"),
            "room_number": task.get("room_number", "N/A"),
            "task_type": task.get("task_type", "cleaning"),
            "status": task.get("status", "pending"),
            "priority": task.get("priority", "normal"),
            "created_at": task.get("created_at"),
            "completed_at": task.get("completed_at"),
            "notes": task.get("notes", "")
        })

        # Daily breakdown
        if task.get("created_at"):
            task_datetime = datetime.fromisoformat(task["created_at"].replace('Z', '+00:00'))
            day = task_datetime.strftime("%Y-%m-%d")
            if day not in daily_tasks:
                daily_tasks[day] = {"completed": 0, "total": 0}
            daily_tasks[day]["total"] += 1
            if task.get("status") == "completed":
                daily_tasks[day]["completed"] += 1

        # Priority breakdown
        priority = task.get("priority", "normal")
        priority_breakdown[priority] = priority_breakdown.get(priority, 0) + 1

    # Sort tasks by date (newest first)
    task_details.sort(key=lambda x: x["created_at"] or "", reverse=True)

    # Calculate completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    # Get all employees with the same role for ranking
    all_employees_result = supabase.table("users").select("id, full_name, role").eq(
        "role", employee_role
    ).execute()

    # Calculate rank among peers (same role)
    peer_performance = []
    for emp in all_employees_result.data:
        emp_tasks = supabase.table("housekeeping_tasks").select("*").eq(
            "assigned_to", emp["id"]
        ).eq("status", "completed").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        emp_completed = len(emp_tasks.data)
        peer_performance.append({
            "id": emp["id"],
            "name": emp.get("full_name"),
            "completed_tasks": emp_completed,
            "role": emp.get("role")
        })

    peer_performance.sort(key=lambda x: x["completed_tasks"], reverse=True)
    rank = next((i + 1 for i, p in enumerate(peer_performance) if p["id"] == employee_id), None)

    # Team average
    team_avg = sum(p["completed_tasks"] for p in peer_performance) / len(peer_performance) if peer_performance else 0

    # Daily trend data
    daily_trend = [
        {
            "date": date,
            "completed": data["completed"],
            "total": data["total"],
            "completion_rate": round((data["completed"] / data["total"] * 100), 2) if data["total"] > 0 else 0
        }
        for date, data in sorted(daily_tasks.items())
    ]

    return {
        "employee": {
            "id": employee["id"],
            "name": employee.get("full_name", "Unknown"),
            "email": employee.get("email", ""),
            "role": employee.get("role", "cleaner"),
            "department": employee.get("department", "Housekeeping"),
            "phone": employee.get("phone", ""),
            "status": employee.get("status", "active")
        },
        "period": {
            "start": start_date,
            "end": end_date
        },
        "summary": {
            "metric_type": "tasks",  # Indicates this is task-based, not sales-based
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "pending_tasks": pending_tasks,
            "rooms_cleaned": len(rooms_cleaned),
            "completion_rate": round(completion_rate, 2),
            "rank": rank,
            "total_peers": len(peer_performance),
            "team_average": round(team_avg, 2),
            "performance_vs_average": round(((completed_tasks - team_avg) / team_avg * 100), 2) if team_avg > 0 else 0
        },
        "tasks": task_details[:100],  # Limit to 100 most recent
        "priority_breakdown": [
            {"priority": priority, "count": count}
            for priority, count in priority_breakdown.items()
        ],
        "trends": {
            "daily": daily_trend
        }
    }


@router.get("/daily-sales/{date}")
async def get_daily_sales_report(
    date: str,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get detailed daily sales report for a specific date.
    Returns comprehensive sales metrics including revenue, orders, payment methods, time breakdown, and menu categories.
    """
    try:
        # Validate date format
        try:
            report_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Please use YYYY-MM-DD format."
            )

        # Calculate start and end of the day
        start_of_day = datetime.combine(report_date, datetime.min.time()).isoformat()
        end_of_day = datetime.combine(report_date, datetime.max.time()).isoformat()

        # Get bookings for the day
        bookings_result = supabase.table("bookings").select(
            "id, status, created_at, paid_amount, total_amount, payment_method"
        ).gte("created_at", start_of_day).lte("created_at", end_of_day).execute()

        bookings = bookings_result.data

        # Get orders for the day (include items JSON field for category breakdown)
        orders_result = supabase.table("orders").select(
            "id, status, created_at, total_amount, payment_method, payment_status, items"
        ).gte("created_at", start_of_day).lte("created_at", end_of_day).execute()

        orders = orders_result.data

        # Calculate total revenue
        booking_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings)
        order_revenue = sum(float(o.get("total_amount") or 0) for o in orders if o.get("payment_status") in ["paid", "completed"] or o.get("status") in ["completed", "delivered", "served"])
        total_revenue = booking_revenue + order_revenue

        # Calculate total orders
        total_orders = len(bookings) + len(orders)

        # Calculate average order value
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

        # Payment methods breakdown
        payment_methods = {}
        
        # Process bookings payments
        for booking in bookings:
            amount = float(booking.get("paid_amount") or booking.get("total_amount") or 0)
            if amount > 0:
                method = (booking.get("payment_method") or "cash").lower()
                payment_methods[method] = payment_methods.get(method, 0) + amount

        # Process orders payments
        for order in orders:
            if order.get("payment_status") in ["paid", "completed"]:
                amount = float(order.get("total_amount") or 0)
                if amount > 0:
                    method = (order.get("payment_method") or "cash").lower()
                    payment_methods[method] = payment_methods.get(method, 0) + amount

        # Time breakdown (hourly)
        time_breakdown = []
        for hour in range(24):
            hour_start = datetime.combine(report_date, datetime.min.time().replace(hour=hour)).isoformat()
            hour_end = datetime.combine(report_date, datetime.min.time().replace(hour=hour, minute=59, second=59)).isoformat()

            # Count bookings in this hour
            hour_bookings = [b for b in bookings if hour_start <= b["created_at"] <= hour_end]
            hour_orders = [o for o in orders if hour_start <= o["created_at"] <= hour_end and o.get("payment_status") in ["paid", "completed"]]

            hour_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in hour_bookings)
            hour_revenue += sum(float(o.get("total_amount") or 0) for o in hour_orders)

            time_breakdown.append({
                "hour": f"{hour:02d}:00",
                "revenue": round(hour_revenue, 2),
                "orders": len(hour_bookings) + len(hour_orders)
            })

        # Menu categories breakdown (from orders)
        menu_categories = {}
        
        # Get order items from the JSON items field in each order
        if orders:
            import json as json_lib
            all_order_items = []
            for order in orders:
                items_list = order.get("items") or []
                if isinstance(items_list, str):
                    try:
                        items_list = json_lib.loads(items_list)
                    except (json_lib.JSONDecodeError, TypeError):
                        items_list = []
                if isinstance(items_list, list):
                    all_order_items.extend(items_list)

            # Get menu items to determine categories
            if all_order_items:
                menu_item_ids = [item.get("menu_item_id") for item in all_order_items if item.get("menu_item_id")]
                menu_item_map = {}
                if menu_item_ids:
                    menu_items_result = supabase.table("menu_items").select(
                        "id, name, category"
                    ).in_("id", list(set(menu_item_ids))).execute()
                    menu_item_map = {item["id"]: item for item in menu_items_result.data}

                # Aggregate by category
                for item in all_order_items:
                    menu_item = menu_item_map.get(item.get("menu_item_id"))
                    category = "Uncategorized"
                    if menu_item:
                        category = menu_item.get("category", "Uncategorized")

                    if category not in menu_categories:
                        menu_categories[category] = {
                            "category": category,
                            "revenue": 0,
                            "items_sold": 0
                        }

                    menu_categories[category]["revenue"] += float(item.get("price", 0)) * item.get("quantity", 0)
                    menu_categories[category]["items_sold"] += item.get("quantity", 0)

        # Convert menu_categories to list
        menu_categories_list = list(menu_categories.values())

        return {
            "date": date,
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "avg_order_value": round(avg_order_value, 2),
            "payment_methods": payment_methods,
            "time_breakdown": time_breakdown,
            "menu_categories": menu_categories_list
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate daily sales report: {str(e)}"
        )


@router.get("/category-breakdown")
async def get_category_breakdown(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """Get sales breakdown by menu category"""
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        orders = supabase.table("orders").select("id, created_at, items, status").gte(
            "created_at", start_date
        ).lte("created_at", end_date).in_("status", ["completed", "delivered", "served"]).execute()

        if not orders.data:
            return []

        # Extract items from JSON field
        all_items = []
        for order in orders.data:
            items_list = order.get("items") or []
            if isinstance(items_list, list):
                all_items.extend(items_list)

        if not all_items:
            return []

        menu_item_ids = list(set(item.get("menu_item_id") for item in all_items if item.get("menu_item_id")))
        menu_map = {}
        if menu_item_ids:
            menu_items = supabase.table("menu_items").select(
                "id, category"
            ).in_("id", menu_item_ids).execute()
            menu_map = {item["id"]: item["category"] for item in menu_items.data}

        category_data = {}
        for item in all_items:
            category = menu_map.get(item.get("menu_item_id"), "Other")
            value = float(item.get("price", 0)) * item.get("quantity", 0)
            category_data[category] = category_data.get(category, 0) + value

        return [{"name": k, "value": round(v, 2)} for k, v in category_data.items()]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get category breakdown: {str(e)}"
        )


@router.get("/employee/{employee_id}/details")
async def get_employee_details(
    employee_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_role(["admin", "manager", "owner"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Get detailed performance report for a specific employee.
    Includes transaction history, items sold, trends, and metrics.
    """
    try:
        # Default date range: last 30 days
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Ensure time components are present so lte/gte comparisons work
        # against timestamp columns (e.g. "2026-03-25" < "2026-03-25T10:00:00Z")
        if 'T' not in start_date:
            start_date = start_date + 'T00:00:00'
        if 'T' not in end_date:
            end_date = end_date + 'T23:59:59'

        # Get employee information
        employee_result = supabase.table("users").select("*").eq("id", employee_id).execute()

        if not employee_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee not found"
            )

        employee = employee_result.data[0]
        employee_role = employee.get("role", "staff")

        # Determine if this is a housekeeping role (different metrics)
        is_housekeeping = employee_role in ["cleaner", "housekeeping", "housekeeper"]

        # For housekeeping roles, use tasks/rooms instead of sales
        if is_housekeeping:
            # Get housekeeping tasks for this employee
            tasks_result = supabase.table("housekeeping_tasks").select(
                "*"
            ).eq("assigned_to", employee_id).gte(
                "created_at", start_date
            ).lte("created_at", end_date).execute()

            all_tasks = tasks_result.data
        else:
            # Get all orders for this employee (sales-based roles)
            # Check all three assignment fields
            created_result = supabase.table("orders").select("*").eq(
                "created_by_staff_id", employee_id
            ).gte("created_at", start_date).lte("created_at", end_date).execute()

            waiter_result = supabase.table("orders").select("*").eq(
                "assigned_waiter_id", employee_id
            ).gte("created_at", start_date).lte("created_at", end_date).execute()

            chef_result = supabase.table("orders").select("*").eq(
                "assigned_chef_id", employee_id
            ).gte("created_at", start_date).lte("created_at", end_date).execute()

            # Combine and deduplicate, then exclude voided/cancelled orders
            VOID_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}
            orders_dict = {o["id"]: o for o in created_result.data}
            orders_dict.update({o["id"]: o for o in waiter_result.data})
            orders_dict.update({o["id"]: o for o in chef_result.data})
            all_orders = [o for o in orders_dict.values() if o.get("status") not in VOID_STATUSES]

        # Process data based on role type
        if is_housekeeping:
            # Process housekeeping tasks
            return await process_housekeeping_report(
                supabase, employee, all_tasks, start_date, end_date
            )

        # Continue with sales-based processing for other roles
        # Extract order items from the JSON items field in each order
        if all_orders:
            for order in all_orders:
                order["order_items"] = order.get("items") or []

        # Build transaction history
        transactions = []
        total_sales = 0
        total_orders = len(all_orders)
        completed_orders = 0
        payment_method_breakdown = {}
        items_sold_count = {}
        hourly_sales = {}
        daily_sales = {}

        for order in all_orders:
            order_total = float(order.get("total_amount", 0))
            order_date = order["created_at"]
            payment_method = order.get("payment_method", "Unknown")
            order_status = order.get("status", "pending")

            # Transaction record
            transaction = {
                "order_id": order["id"],
                "date": order_date,
                "total": order_total,
                "status": order_status,
                "payment_method": payment_method,
                "delivery_location": order.get("delivery_location", "N/A"),
                "items": []
            }

            # Count items from JSON items array
            if order.get("order_items"):
                for item in order["order_items"]:
                    # Skip voided items
                    if item.get("voided"):
                        continue
                    item_name = item.get("name", "Unknown")
                    menu_item_id = item.get("menu_item_id") or item_name
                    quantity = int(item.get("quantity", 0))
                    if quantity <= 0:
                        continue

                    transaction["items"].append({
                        "name": item_name,
                        "quantity": quantity,
                        "price": float(item.get("price", 0))
                    })

                    # Track items sold
                    if menu_item_id:
                        if menu_item_id in items_sold_count:
                            items_sold_count[menu_item_id]["quantity"] += quantity
                        else:
                            items_sold_count[menu_item_id] = {
                                "name": item_name,
                                "quantity": quantity,
                                "revenue": 0
                            }
                        items_sold_count[menu_item_id]["revenue"] += float(item.get("price", 0)) * quantity

            transactions.append(transaction)

            # Aggregate stats — use line-item sum to exclude voided items
            order_revenue = sum(
                float(i.get("price", 0)) * int(i.get("quantity", 0))
                for i in (order.get("order_items") or [])
                if isinstance(i, dict) and not i.get("voided") and int(i.get("quantity", 0)) > 0
            )
            EXCLUDED_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}
            if order_status in ["completed", "delivered", "served"]:
                completed_orders += 1

            total_sales += order_revenue

            # Payment method breakdown
            payment_method_breakdown[payment_method] = payment_method_breakdown.get(payment_method, 0) + order_revenue

            # Hourly sales
            order_datetime = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
            hour = order_datetime.strftime("%I %p")
            hourly_sales[hour] = hourly_sales.get(hour, 0) + order_revenue

            # Daily sales
            day = order_datetime.strftime("%Y-%m-%d")
            daily_sales[day] = daily_sales.get(day, 0) + order_revenue

        # Sort transactions by date (newest first)
        transactions.sort(key=lambda x: x["date"], reverse=True)

        # Get top items sold
        top_items = sorted(
            [{"name": v["name"], "quantity": v["quantity"], "revenue": v["revenue"]}
             for v in items_sold_count.values()],
            key=lambda x: x["revenue"],
            reverse=True
        )[:10]

        # Build items_by_category — fetch categories from menu_items table
        all_item_ids_emp = list(set(
            k for k in items_sold_count.keys()
            if not k.startswith("Unknown") and len(k) > 8  # UUIDs are longer
        ))
        menu_cat_map: Dict[str, str] = {}
        if all_item_ids_emp:
            try:
                mc_result = supabase.table("menu_items").select("id, category").in_(
                    "id", all_item_ids_emp
                ).execute()
                for mi in (mc_result.data or []):
                    menu_cat_map[str(mi["id"])] = mi.get("category") or "Other"
            except Exception:
                pass

        cat_buckets: Dict[str, Any] = {}
        for item_key, data in items_sold_count.items():
            cat = menu_cat_map.get(str(item_key)) or "Other"
            cat_buckets.setdefault(cat, [])
            cat_buckets[cat].append({
                "name": data["name"],
                "qty": data["quantity"],
                "revenue": round(data["revenue"], 2)
            })

        items_by_category = sorted(
            [
                {
                    "category": cat,
                    "items": sorted(items, key=lambda x: x["name"].lower()),
                    "total_qty": sum(i["qty"] for i in items),
                    "total_revenue": round(sum(i["revenue"] for i in items), 2)
                }
                for cat, items in cat_buckets.items()
            ],
            key=lambda x: x["category"].lower()
        )

        # Calculate performance metrics
        avg_order_value = total_sales / completed_orders if completed_orders > 0 else 0
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0

        # Daily trend data
        daily_trend = [
            {"date": date, "revenue": revenue}
            for date, revenue in sorted(daily_sales.items())
        ]

        # Hourly pattern
        hourly_pattern = [
            {"hour": hour, "revenue": revenue}
            for hour, revenue in sorted(hourly_sales.items())
        ]

        # Performance comparison (if multiple employees exist)
        # Get the employee's role to compare with peers in the same role
        employee_role = employee.get("role", "staff")

        # Get all employees with the same role (peers)
        all_employees_result = supabase.table("users").select("id, full_name, role").eq(
            "role", employee_role
        ).execute()

        # Calculate rank among peers (same role only)
        peer_sales = []
        for emp in all_employees_result.data:
            # Query all assignment fields
            created_ord = supabase.table("orders").select("id, total_amount").eq(
                "created_by_staff_id", emp["id"]
            ).in_("status", ["completed", "delivered", "served"]).gte(
                "created_at", start_date).lte("created_at", end_date).execute()
            waiter_ord = supabase.table("orders").select("id, total_amount").eq(
                "assigned_waiter_id", emp["id"]
            ).in_("status", ["completed", "delivered", "served"]).gte(
                "created_at", start_date).lte("created_at", end_date).execute()
            chef_ord = supabase.table("orders").select("id, total_amount").eq(
                "assigned_chef_id", emp["id"]
            ).in_("status", ["completed", "delivered", "served"]).gte(
                "created_at", start_date).lte("created_at", end_date).execute()

            # Deduplicate
            peer_orders_dict = {o["id"]: o for o in created_ord.data}
            peer_orders_dict.update({o["id"]: o for o in waiter_ord.data})
            peer_orders_dict.update({o["id"]: o for o in chef_ord.data})

            emp_total = sum(float(o.get("total_amount", 0)) for o in peer_orders_dict.values())
            peer_sales.append({"id": emp["id"], "name": emp.get("full_name"), "sales": emp_total, "role": emp.get("role")})

        peer_sales.sort(key=lambda x: x["sales"], reverse=True)
        rank = next((i + 1 for i, p in enumerate(peer_sales) if p["id"] == employee_id), None)

        # Team average (for same role)
        team_avg = sum(p["sales"] for p in peer_sales) / len(peer_sales) if peer_sales else 0

        return {
            "employee": {
                "id": employee["id"],
                "name": employee.get("full_name", "Unknown"),
                "email": employee.get("email", ""),
                "role": employee.get("role", "staff"),
                "department": employee.get("department", "Unassigned"),
                "phone": employee.get("phone", ""),
                "status": employee.get("status", "active")
            },
            "period": {
                "start": start_date,
                "end": end_date
            },
            "summary": {
                "total_sales": round(total_sales, 2),
                "total_orders": total_orders,
                "completed_orders": completed_orders,
                "avg_order_value": round(avg_order_value, 2),
                "completion_rate": round(completion_rate, 2),
                "rank": rank,
                "total_peers": len(peer_sales),
                "team_average": round(team_avg, 2),
                "performance_vs_average": round(((total_sales - team_avg) / team_avg * 100), 2) if team_avg > 0 else 0
            },
            "transactions": transactions[:100],  # Limit to 100 most recent
            "top_items": top_items,
            "items_by_category": items_by_category,
            "payment_methods": [
                {"method": method, "total": round(total, 2), "percentage": round((total / total_sales * 100), 2) if total_sales > 0 else 0}
                for method, total in payment_method_breakdown.items()
            ],
            "trends": {
                "daily": daily_trend,
                "hourly": hourly_pattern
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate employee details: {str(e)}"
        )


@router.get("/item-summary")
async def get_item_summary_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Item Summary Sales Report.
    Returns items sold grouped by category/department with quantity and revenue.
    Excludes cancelled orders. Similar to QuickBooks POS Item Summary report.
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=1)).isoformat()

        start_date = _start(start_date)
        end_date = _end(end_date)

        # Get all orders in date range then exclude voided/cancelled in Python
        # (matches employee-sales exclusion list so figures stay consistent)
        VOID_STATUSES = {"voided", "void", "cancelled", "canceled", "void_requested"}
        orders_result = supabase.table("orders").select(
            "id, items, total_amount, status, created_at, created_by_staff_id, assigned_waiter_id"
        ).gte("created_at", start_date).lte("created_at", end_date).execute()
        orders = [o for o in (orders_result.data or []) if o.get("status") not in VOID_STATUSES]

        # Collect menu_item_ids to fetch categories
        all_item_ids = set()
        all_staff_ids = set()
        for order in orders:
            items = order.get("items") or []
            if isinstance(items, list):
                for item in items:
                    mid = item.get("menu_item_id") or item.get("id")
                    if mid:
                        all_item_ids.add(str(mid))
            staff_id = order.get("assigned_waiter_id") or order.get("created_by_staff_id")
            if staff_id:
                all_staff_ids.add(str(staff_id))

        # Fetch menu items with categories
        menu_map = {}
        if all_item_ids:
            menu_result = supabase.table("menu_items").select(
                "id, name, category"
            ).in_("id", list(all_item_ids)).execute()
            for mi in (menu_result.data or []):
                menu_map[str(mi["id"])] = {
                    "name": mi.get("name", "Unknown"),
                    "category": mi.get("category") or "Other"
                }

        # Fetch staff names
        staff_map = {}
        if all_staff_ids:
            staff_result = supabase.table("users").select("id, full_name").in_("id", list(all_staff_ids)).execute()
            for s in (staff_result.data or []):
                staff_map[str(s["id"])] = s.get("full_name") or "Unknown"

        # Aggregate: category -> item_name -> {qty, revenue, waiters: {name: {qty, revenue}}}
        category_data: Dict[str, Dict[str, Any]] = {}
        for order in orders:
            items = order.get("items") or []
            if not isinstance(items, list):
                continue
            staff_id = str(order.get("assigned_waiter_id") or order.get("created_by_staff_id") or "")
            waiter_name = staff_map.get(staff_id, "Unknown") if staff_id else "Unknown"
            for item in items:
                if item.get("voided"):
                    continue
                mid = str(item.get("menu_item_id") or item.get("id") or "")
                item_name = item.get("name", "Unknown")
                qty = int(item.get("quantity", 0))
                if qty <= 0:
                    continue
                price = float(item.get("price", 0))
                revenue = price * qty

                if mid and mid in menu_map:
                    category = menu_map[mid].get("category") or "Other"
                    item_name = menu_map[mid].get("name", item_name)
                else:
                    category = item.get("category") or "Other"

                if category not in category_data:
                    category_data[category] = {}
                if item_name not in category_data[category]:
                    category_data[category][item_name] = {"qty": 0, "revenue": 0.0, "waiters": {}}
                category_data[category][item_name]["qty"] += qty
                category_data[category][item_name]["revenue"] += revenue
                # Per-waiter breakdown
                w = category_data[category][item_name]["waiters"]
                if waiter_name not in w:
                    w[waiter_name] = {"qty": 0, "revenue": 0.0}
                w[waiter_name]["qty"] += qty
                w[waiter_name]["revenue"] += revenue

        # Format response
        result = []
        grand_qty = 0
        grand_revenue = 0.0
        for category, items_dict in sorted(category_data.items()):
            cat_items = sorted(
                [{
                    "name": k,
                    "qty": v["qty"],
                    "revenue": round(v["revenue"], 2),
                    "waiters": sorted(
                        [{"name": wn, "qty": wd["qty"], "revenue": round(wd["revenue"], 2)}
                         for wn, wd in v["waiters"].items()],
                        key=lambda x: x["name"].lower()
                    )
                 } for k, v in items_dict.items()],
                key=lambda x: x["name"].lower()
            )
            cat_qty = sum(i["qty"] for i in cat_items)
            cat_revenue = sum(i["revenue"] for i in cat_items)
            result.append({
                "category": category,
                "items": cat_items,
                "total_qty": cat_qty,
                "total_revenue": round(cat_revenue, 2)
            })
            grand_qty += cat_qty
            grand_revenue += cat_revenue

        result.sort(key=lambda x: x["total_revenue"], reverse=True)

        return {
            "period": {"start": start_date, "end": end_date},
            "categories": result,
            "grand_total_qty": grand_qty,
            "grand_total_revenue": round(grand_revenue, 2)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate item summary: {str(e)}"
        )


@router.get("/void-report")
async def get_void_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Voided / Cancelled Orders Report.
    Shows all voids grouped by who voided them and which waiter owned the order.
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        start_date = _start(start_date)
        end_date = _end(end_date)

        # Get order_modifications of type 'void'
        mods_result = supabase.table("order_modifications").select(
            "id, order_id, modification_type, reason, amount, requested_by, approved_by, status, created_at"
        ).eq("modification_type", "void").gte("created_at", start_date).lte(
            "created_at", end_date
        ).execute()
        mods = mods_result.data or []

        # Get void_log entries (from the void-item endpoint)
        void_log_result = supabase.table("void_log").select(
            "id, order_id, bill_id, item_name, item_index, void_reason, voided_amount, voided_by, voided_at"
        ).gte("voided_at", start_date).lte("voided_at", end_date).execute()
        void_log_entries = void_log_result.data or []

        # Get cancelled orders (directly cancelled, not via modification)
        cancelled_result = supabase.table("orders").select(
            "id, order_number, items, total_amount, assigned_waiter_id, "
            "created_by_staff_id, status, updated_at, notes"
        ).eq("status", "cancelled").gte("updated_at", start_date).lte(
            "updated_at", end_date
        ).execute()
        cancelled_orders = cancelled_result.data or []

        # Collect staff IDs and order IDs
        staff_ids = set()
        mod_order_ids = [m["order_id"] for m in mods if m.get("order_id")]
        for mod in mods:
            for fld in ["requested_by", "approved_by"]:
                if mod.get(fld):
                    staff_ids.add(mod[fld])
        for vl in void_log_entries:
            if vl.get("voided_by"):
                staff_ids.add(vl["voided_by"])
        for o in cancelled_orders:
            for fld in ["assigned_waiter_id", "created_by_staff_id"]:
                if o.get(fld):
                    staff_ids.add(o[fld])

        # Fetch orders for mods and void_log entries
        void_log_order_ids = [vl["order_id"] for vl in void_log_entries if vl.get("order_id")]
        all_order_ids = list(set(mod_order_ids + void_log_order_ids))
        orders_map: Dict[str, Any] = {}
        if all_order_ids:
            ord_result = supabase.table("orders").select(
                "id, order_number, items, total_amount, assigned_waiter_id, created_by_staff_id"
            ).in_("id", all_order_ids).execute()
            for o in (ord_result.data or []):
                orders_map[o["id"]] = o
                for fld in ["assigned_waiter_id", "created_by_staff_id"]:
                    if o.get(fld):
                        staff_ids.add(o[fld])

        # Fetch staff names
        staff_map: Dict[str, Any] = {}
        if staff_ids:
            s_result = supabase.table("users").select("id, full_name, role").in_(
                "id", list(staff_ids)
            ).execute()
            for s in (s_result.data or []):
                staff_map[s["id"]] = {"name": s.get("full_name", "Unknown"), "role": s.get("role", "")}

        def staff_name(uid):
            return staff_map.get(uid, {}).get("name", "Unknown") if uid else "Unknown"

        def items_summary(items_list):
            if not isinstance(items_list, list) or not items_list:
                return "Full Order"
            return ", ".join(
                f"{i.get('quantity', 1)}x {i.get('name', 'Item')}" for i in items_list
            )

        void_records = []

        # From modifications
        for mod in mods:
            order = orders_map.get(mod.get("order_id"), {})
            waiter_id = order.get("assigned_waiter_id") or order.get("created_by_staff_id")
            items_list = order.get("items") or []
            void_records.append({
                "id": mod["id"],
                "date": mod["created_at"],
                "order_number": order.get("order_number", "N/A"),
                "items": items_list if isinstance(items_list, list) else [],
                "items_summary": items_summary(items_list),
                "amount": round(float(mod.get("amount") or order.get("total_amount") or 0), 2),
                "voided_by": staff_name(mod.get("requested_by")),
                "voided_by_role": staff_map.get(mod.get("requested_by"), {}).get("role", ""),
                "original_waiter": staff_name(waiter_id),
                "reason": mod.get("reason") or "No reason given",
                "status": mod.get("status", "approved"),
                "type": "void_request"
            })

        # From void_log (individual items voided via void-item endpoint)
        for vl in void_log_entries:
            order = orders_map.get(vl.get("order_id"), {})
            waiter_id = order.get("assigned_waiter_id") or order.get("created_by_staff_id")
            void_records.append({
                "id": vl["id"],
                "date": vl.get("voided_at"),
                "order_number": order.get("order_number", "N/A"),
                "items": [{"name": vl.get("item_name", "Unknown"), "quantity": 1}],
                "items_summary": vl.get("item_name", "Unknown item"),
                "amount": round(float(vl.get("voided_amount") or 0), 2),
                "voided_by": staff_name(vl.get("voided_by")),
                "voided_by_role": staff_map.get(vl.get("voided_by"), {}).get("role", ""),
                "original_waiter": staff_name(waiter_id),
                "reason": vl.get("void_reason") or "No reason given",
                "status": "approved",
                "type": "void_item"
            })

        # Directly cancelled orders
        mod_order_id_set = set(mod_order_ids)
        for order in cancelled_orders:
            if order["id"] in mod_order_id_set:
                continue
            waiter_id = order.get("assigned_waiter_id") or order.get("created_by_staff_id")
            items_list = order.get("items") or []
            void_records.append({
                "id": order["id"],
                "date": order.get("updated_at"),
                "order_number": order.get("order_number", "N/A"),
                "items": items_list if isinstance(items_list, list) else [],
                "items_summary": items_summary(items_list),
                "amount": round(float(order.get("total_amount") or 0), 2),
                "voided_by": "Manager/System",
                "voided_by_role": "manager",
                "original_waiter": staff_name(waiter_id),
                "reason": order.get("notes") or "Order cancelled",
                "status": "approved",
                "type": "cancellation"
            })

        void_records.sort(key=lambda x: x.get("date") or "", reverse=True)

        # Group by voider (with sub-records)
        by_voider_map: Dict[str, Any] = {}
        by_waiter_map: Dict[str, Any] = {}
        for r in void_records:
            v = r["voided_by"]
            if v not in by_voider_map:
                by_voider_map[v] = {"voided_by": v, "role": r.get("voided_by_role", ""), "count": 0, "total_amount": 0.0, "records": []}
            by_voider_map[v]["count"] += 1
            by_voider_map[v]["total_amount"] += r["amount"]
            by_voider_map[v]["records"].append(r)

            w = r["original_waiter"]
            if w not in by_waiter_map:
                by_waiter_map[w] = {"waiter": w, "count": 0, "total_amount": 0.0, "records": []}
            by_waiter_map[w]["count"] += 1
            by_waiter_map[w]["total_amount"] += r["amount"]
            by_waiter_map[w]["records"].append(r)

        by_voider = sorted(by_voider_map.values(), key=lambda x: x["total_amount"], reverse=True)
        for g in by_voider:
            g["total_amount"] = round(g["total_amount"], 2)

        by_waiter = sorted(by_waiter_map.values(), key=lambda x: x["total_amount"], reverse=True)
        for g in by_waiter:
            g["total_amount"] = round(g["total_amount"], 2)

        return {
            "period": {"start": start_date, "end": end_date},
            "summary": {
                "total_voids": len(void_records),
                "total_voided_amount": round(sum(r["amount"] for r in void_records), 2)
            },
            "by_voider": by_voider,
            "by_waiter": by_waiter,
            "records": void_records
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate void report: {str(e)}"
        )
