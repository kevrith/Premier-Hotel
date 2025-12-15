"""
Reports and Analytics Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from app.middleware.auth import get_current_user, require_role
from app.core.supabase import get_supabase
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

        # Get total revenue from payments
        payments = supabase.table("payments").select("amount, status, created_at").gte(
            "created_at", start_date
        ).lte("created_at", end_date).eq("status", "completed").execute()

        total_revenue = sum(float(p["amount"]) for p in payments.data)

        # Get bookings count
        bookings = supabase.table("bookings").select("id, status, created_at").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        total_bookings = len(bookings.data)
        confirmed_bookings = len([b for b in bookings.data if b["status"] == "confirmed"])

        # Get orders count
        orders = supabase.table("orders").select("id, status, created_at").gte(
            "created_at", start_date
        ).lte("created_at", end_date).execute()

        total_orders = len(orders.data)
        completed_orders = len([o for o in orders.data if o["status"] == "delivered"])

        # Get active customers (unique users with bookings or orders)
        booking_users = set(b.get("user_id") for b in bookings.data if b.get("user_id"))
        order_users = set(o.get("user_id") for o in orders.data if o.get("user_id"))
        active_customers = len(booking_users.union(order_users))

        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "revenue": {
                "total": total_revenue,
                "currency": "KES",
                "payments_count": len(payments.data)
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

        # Get completed payments
        payments = supabase.table("payments").select(
            "amount, payment_method, created_at, reference_type"
        ).gte("created_at", start_date).lte("created_at", end_date).eq(
            "status", "completed"
        ).order("created_at").execute()

        # Group payments by date
        revenue_by_date: Dict[str, Dict[str, Any]] = {}

        for payment in payments.data:
            created_at = datetime.fromisoformat(payment["created_at"].replace('Z', '+00:00'))

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

            amount = float(payment["amount"])
            revenue_by_date[date_key]["total"] += amount
            revenue_by_date[date_key]["count"] += 1

            # By reference type
            ref_type = payment["reference_type"]
            if ref_type in revenue_by_date[date_key]:
                revenue_by_date[date_key][ref_type] += amount

            # By payment method
            method = payment["payment_method"]
            if method in revenue_by_date[date_key]:
                revenue_by_date[date_key][method] += amount

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
