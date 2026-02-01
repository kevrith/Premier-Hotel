"""
Reports and Analytics Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from app.middleware.auth_secure import get_current_user, require_role
from app.core.supabase import get_supabase, get_supabase_admin
from supabase import Client

router = APIRouter()


@router.get("/overview")
async def get_reports_overview(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get overall reports overview with key metrics
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get total revenue from bookings and orders
        # Bookings revenue
        bookings = supabase.table("bookings").select("id, status, created_at, paid_amount, total_amount, customer_id").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        booking_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings.data)

        # Orders revenue
        orders = supabase.table("orders").select("id, status, created_at, total_amount, customer_id, payment_status").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        # Sum revenue from paid orders
        order_revenue = sum(float(o.get("total_amount") or o.get("total") or 0) for o in orders.data if o.get("payment_status") in ["paid", "completed"])

        total_revenue = booking_revenue + order_revenue

        # Bookings stats
        total_bookings = len(bookings.data)
        confirmed_bookings = len([b for b in bookings.data if b["status"] in ["confirmed", "checked_in", "checked_out"]])

        # Orders stats
        total_orders = len(orders.data)
        completed_orders = len([o for o in orders.data if o["status"] in ["delivered", "completed", "served"]])

        # Get active customers (unique customers with bookings or orders)
        booking_users = set(b.get("customer_id") for b in bookings.data if b.get("customer_id"))
        order_users = set(o.get("customer_id") for o in orders.data if o.get("customer_id"))
        active_customers = len(booking_users.union(order_users))

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "revenue": {
                "total": total_revenue,
                "currency": "KES",
                "payments_count": len([o for o in orders.data if o.get("payment_status") in ["paid", "completed"]]) + len([b for b in bookings.data if b.get("paid_amount") and float(b.get("paid_amount", 0)) > 0])
            },
            "bookings": {
                "total": total_bookings,
                "confirmed": confirmed_bookings,
                "cancellation_rate": round((total_bookings - confirmed_bookings) / total_bookings * 100, 2) if total_bookings > 0 else 0
            },
            "orders": {
                "total": total_orders,
                "completed": completed_orders,
                "completion_rate": round(completed_orders / total_orders * 100, 2) if total_orders > 0 else 0
            },
            "customers": {
                "active": active_customers
            }
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
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get revenue analytics grouped by time period
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get bookings and orders for revenue calculation
        bookings = supabase.table("bookings").select(
            "paid_amount, total_amount, payment_method, created_at"
        ).gte("created_at", start_date).lte("created_at", end_date).order("created_at").execute()

        orders = supabase.table("orders").select(
            "total_amount, total, payment_method, payment_status, created_at"
        ).gte("created_at", start_date).lte("created_at", end_date).order("created_at").execute()

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

        # Process orders
        for order in orders.data:
            # Only count paid orders
            if order.get("payment_status") not in ["paid", "completed"]:
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

            amount = float(order.get("total_amount") or order.get("total") or 0)
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
    supabase: Client = Depends(get_supabase)
):
    """
    Get booking statistics and trends
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get all bookings in period
        bookings = supabase.table("bookings").select("*").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        # Calculate statistics
        total_bookings = len(bookings.data)
        status_counts = {}
        room_type_counts = {}
        total_revenue = 0

        for booking in bookings.data:
            # Count by status
            booking_status = booking.get("status", "unknown")
            status_counts[booking_status] = status_counts.get(booking_status, 0) + 1

            # Count by room type
            room_type = booking.get("room_type", "unknown")
            room_type_counts[room_type] = room_type_counts.get(room_type, 0) + 1

            # Calculate revenue
            if booking.get("total_amount"):
                total_revenue += float(booking["total_amount"])

        # Calculate average stay duration
        durations = []
        for booking in bookings.data:
            if booking.get("check_in") and booking.get("check_out"):
                check_in = datetime.fromisoformat(booking["check_in"].replace('Z', '+00:00'))
                check_out = datetime.fromisoformat(booking["check_out"].replace('Z', '+00:00'))
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
    supabase: Client = Depends(get_supabase)
):
    """
    Get order statistics and trends
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get all orders in period
        orders = supabase.table("orders").select("*").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

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

            # Count by delivery location
            location = order.get("delivery_location", "unknown")
            delivery_location_counts[location] = delivery_location_counts.get(location, 0) + 1

        # Get order items to find popular items
        order_items = supabase.table("order_items").select(
            "menu_item_id, quantity"
        ).in_("order_id", [o["id"] for o in orders.data]).execute()

        # Count items
        item_quantities = {}
        for item in order_items.data:
            menu_item_id = item["menu_item_id"]
            quantity = item["quantity"]
            item_quantities[menu_item_id] = item_quantities.get(menu_item_id, 0) + quantity

        # Get top 5 items
        top_items = sorted(item_quantities.items(), key=lambda x: x[1], reverse=True)[:5]

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
            "top_items": [{"menu_item_id": item_id, "quantity": qty} for item_id, qty in top_items]
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
    supabase: Client = Depends(get_supabase)
):
    """
    Get top customers by spending
    """
    try:
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=90)).isoformat()

        # Get completed payments
        payments = supabase.table("payments").select(
            "user_id, amount"
        ).gte("created_at", start_date).lte("created_at", end_date).eq(
            "status", "completed"
        ).execute()

        # Aggregate by user
        user_spending = {}
        for payment in payments.data:
            user_id = payment["user_id"]
            amount = float(payment["amount"])
            if user_id in user_spending:
                user_spending[user_id]["total"] += amount
                user_spending[user_id]["count"] += 1
            else:
                user_spending[user_id] = {"total": amount, "count": 1}

        # Sort and get top customers
        top_users = sorted(
            user_spending.items(),
            key=lambda x: x[1]["total"],
            reverse=True
        )[:limit]

        # Format result
        result = []
        for user_id, data in top_users:
            result.append({
                "user_id": user_id,
                "total_spent": data["total"],
                "transaction_count": data["count"],
                "average_transaction": round(data["total"] / data["count"], 2)
            })

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "customers": result
        }

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
    supabase: Client = Depends(get_supabase)
):
    """
    Get detailed employee sales performance report.
    Returns sales metrics for each employee including total sales, orders, averages, etc.
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.now().isoformat()
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()

        # Get all staff users (waiter, chef, etc.)
        users_query = supabase.table("users").select("id, full_name, email, role")

        # Apply role filter
        if role:
            users_query = users_query.eq("role", role)
        elif not employee_id:
            # Default to showing only staff roles
            users_query = users_query.in_("role", ["waiter", "chef", "manager", "staff"])

        # Apply employee filter
        if employee_id:
            users_query = users_query.eq("id", employee_id)

        users_result = users_query.execute()
        employees = users_result.data

        # Build employee sales data
        employee_sales_list = []

        for employee in employees:
            emp_id = employee["id"]

            # Get orders created by this employee
            emp_orders_result = supabase.table("orders").select(
                "id, customer_id, total_amount, status, created_at, location"
            ).eq("created_by_staff_id", emp_id).gte("created_at", start_date).lte("created_at", end_date).execute()

            emp_orders = emp_orders_result.data

            # Get order items for this employee's orders
            emp_order_ids = [o["id"] for o in emp_orders]
            emp_order_items = []
            if emp_order_ids:
                emp_order_items_result = supabase.table("order_items").select(
                    "order_id, menu_item_id, quantity, price"
                ).in_("order_id", emp_order_ids).execute()
                emp_order_items = emp_order_items_result.data

            total_sales = sum(float(o.get("total_amount", 0)) for o in emp_orders)
            total_orders = len(emp_orders)
            completed_orders = len([o for o in emp_orders if o.get("status") == "delivered"])

            total_items_sold = sum(oi.get("quantity", 0) for oi in emp_order_items)

            # Calculate averages
            avg_order_value = total_sales / total_orders if total_orders > 0 else 0

            # Get time-based metrics
            today = datetime.now().date()
            this_week_start = today - timedelta(days=today.weekday())
            this_month_start = datetime(today.year, today.month, 1).date()

            orders_today = len([o for o in emp_orders if datetime.fromisoformat(o["created_at"].replace('Z', '+00:00')).date() == today])
            orders_this_week = len([o for o in emp_orders if datetime.fromisoformat(o["created_at"].replace('Z', '+00:00')).date() >= this_week_start])
            orders_this_month = len([o for o in emp_orders if datetime.fromisoformat(o["created_at"].replace('Z', '+00:00')).date() >= this_month_start])

            # Find most popular item
            item_counts = {}
            for oi in emp_order_items:
                item_id = oi.get("menu_item_id")
                if item_id:
                    item_counts[item_id] = item_counts.get(item_id, 0) + oi.get("quantity", 0)

            top_item_id = max(item_counts.items(), key=lambda x: x[1])[0] if item_counts else None
            top_selling_item = "N/A"

            if top_item_id:
                menu_item_result = supabase.table("menu_items").select("name").eq("id", top_item_id).execute()
                if menu_item_result.data:
                    top_selling_item = menu_item_result.data[0].get("name", "N/A")

            # Get first and last sale times
            first_sale_time = "N/A"
            last_sale_time = "N/A"
            if emp_orders:
                sorted_orders = sorted(emp_orders, key=lambda x: x["created_at"])
                first_sale_time = datetime.fromisoformat(sorted_orders[0]["created_at"].replace('Z', '+00:00')).strftime("%I:%M %p")
                last_sale_time = datetime.fromisoformat(sorted_orders[-1]["created_at"].replace('Z', '+00:00')).strftime("%I:%M %p")

            employee_sales_list.append({
                "employee_id": emp_id,
                "employee_name": employee.get("full_name", "Unknown"),
                "email": employee.get("email", ""),
                "role": employee.get("role", "staff"),
                "department": employee.get("department") or department or "Unassigned",
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
                "completion_rate": round((completed_orders / total_orders * 100), 2) if total_orders > 0 else 0
            })

        # Sort by total sales descending
        employee_sales_list.sort(key=lambda x: x["total_sales"], reverse=True)

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "total_employees": len(employee_sales_list),
            "total_sales": sum(e["total_sales"] for e in employee_sales_list),
            "total_orders": sum(e["total_orders"] for e in employee_sales_list),
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
    supabase: Client = Depends(get_supabase)
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

        # Get orders for the day
        orders_result = supabase.table("orders").select(
            "id, status, created_at, total_amount, payment_method, payment_status"
        ).gte("created_at", start_of_day).lte("created_at", end_of_day).execute()

        orders = orders_result.data

        # Calculate total revenue
        booking_revenue = sum(float(b.get("paid_amount") or b.get("total_amount") or 0) for b in bookings)
        order_revenue = sum(float(o.get("total_amount") or 0) for o in orders if o.get("payment_status") in ["paid", "completed"])
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
        
        # Get order items for the day
        if orders:
            order_ids = [o["id"] for o in orders]
            order_items_result = supabase.table("order_items").select(
                "menu_item_id, quantity, price"
            ).in_("order_id", order_ids).execute()

            order_items = order_items_result.data

            # Get menu items to determine categories
            if order_items:
                menu_item_ids = [item["menu_item_id"] for item in order_items]
                menu_items_result = supabase.table("menu_items").select(
                    "id, name, category"
                ).in_("id", menu_item_ids).execute()

                menu_items = menu_items_result.data
                menu_item_map = {item["id"]: item for item in menu_items}

                # Aggregate by category
                for item in order_items:
                    menu_item = menu_item_map.get(item["menu_item_id"])
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
            orders_result = supabase.table("orders").select(
                "*"
            ).eq("created_by_staff_id", employee_id).gte(
                "created_at", start_date
            ).lte("created_at", end_date).execute()

            all_orders = orders_result.data

        # Process data based on role type
        if is_housekeeping:
            # Process housekeeping tasks
            return await process_housekeeping_report(
                supabase, employee, all_tasks, start_date, end_date
            )

        # Continue with sales-based processing for other roles
        # Get all order items for these orders
        if all_orders:
            order_ids = [order["id"] for order in all_orders]
            order_items_result = supabase.table("order_items").select("*").in_("order_id", order_ids).execute()
            order_items_by_order = {}
            for item in order_items_result.data:
                order_id = item["order_id"]
                if order_id not in order_items_by_order:
                    order_items_by_order[order_id] = []
                order_items_by_order[order_id].append(item)

            # Attach order items to their orders
            for order in all_orders:
                order["order_items"] = order_items_by_order.get(order["id"], [])

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
            order_total = float(order.get("total", 0))
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

            # Count items
            if order.get("order_items"):
                for item in order["order_items"]:
                    menu_item_id = item.get("menu_item_id")
                    quantity = item.get("quantity", 1)

                    transaction["items"].append({
                        "name": item.get("menu_item_name", "Unknown"),
                        "quantity": quantity,
                        "price": float(item.get("price", 0))
                    })

                    # Track items sold
                    if menu_item_id:
                        if menu_item_id in items_sold_count:
                            items_sold_count[menu_item_id]["quantity"] += quantity
                        else:
                            items_sold_count[menu_item_id] = {
                                "name": item.get("menu_item_name", "Unknown"),
                                "quantity": quantity,
                                "revenue": 0
                            }
                        items_sold_count[menu_item_id]["revenue"] += float(item.get("price", 0)) * quantity

            transactions.append(transaction)

            # Aggregate stats
            if order_status == "completed":
                completed_orders += 1
                total_sales += order_total

                # Payment method breakdown
                payment_method_breakdown[payment_method] = payment_method_breakdown.get(payment_method, 0) + order_total

                # Hourly sales
                order_datetime = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
                hour = order_datetime.strftime("%I %p")
                hourly_sales[hour] = hourly_sales.get(hour, 0) + order_total

                # Daily sales
                day = order_datetime.strftime("%Y-%m-%d")
                daily_sales[day] = daily_sales.get(day, 0) + order_total

        # Sort transactions by date (newest first)
        transactions.sort(key=lambda x: x["date"], reverse=True)

        # Get top items sold
        top_items = sorted(
            [{"name": v["name"], "quantity": v["quantity"], "revenue": v["revenue"]}
             for v in items_sold_count.values()],
            key=lambda x: x["revenue"],
            reverse=True
        )[:10]

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
            emp_orders = supabase.table("orders").select("total").eq(
                "created_by_staff_id", emp["id"]
            ).eq("status", "completed").gte(
                "created_at", start_date
            ).lte("created_at", end_date).execute()

            emp_total = sum(float(o.get("total", 0)) for o in emp_orders.data)
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
