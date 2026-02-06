from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user
from pydantic import BaseModel
import csv
import io
import logging
from fastapi.responses import StreamingResponse

router = APIRouter()
logger = logging.getLogger(__name__)

class OrderStats(BaseModel):
    today_orders: int
    pending_orders: int
    completed_orders: int
    avg_completion_time: int
    total_revenue: float
    completion_rate: float

class BulkCancelRequest(BaseModel):
    order_ids: List[str]

class ExportRequest(BaseModel):
    format: str
    filters: dict

@router.get("/manager", response_model=List[dict])
async def get_manager_orders(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    date: Optional[str] = Query("today"),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Get orders for manager with filters"""
    try:
        # Check role
        user_role = current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", None)
        if user_role not in ['manager', 'admin']:
            raise HTTPException(status_code=403, detail="Manager access required")
        
        # Build query
        query = supabase_admin.table("orders").select("*")
        
        # Date filter
        if date == "today":
            today = datetime.now().date().isoformat()
            query = query.gte("created_at", f"{today}T00:00:00")
        elif date == "yesterday":
            yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()
            query = query.gte("created_at", f"{yesterday}T00:00:00").lt("created_at", f"{datetime.now().date().isoformat()}T00:00:00")
        elif date == "week":
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            query = query.gte("created_at", week_ago)
        elif date == "month":
            month_ago = (datetime.now() - timedelta(days=30)).isoformat()
            query = query.gte("created_at", month_ago)
        
        # Status filter
        if status and status != "all":
            query = query.eq("status", status)
        
        # Type filter
        if type and type != "all":
            query = query.eq("order_type", type)
        
        query = query.order("created_at", desc=True)
        
        result = query.execute()
        orders = result.data or []
        
        # Apply search filter in Python
        if search:
            search_lower = search.lower()
            orders = [
                order for order in orders
                if search_lower in (order.get("order_number", "").lower() or "")
                or search_lower in (order.get("customer_name", "").lower() or "")
                or search_lower in (order.get("customer_phone", "") or "")
            ]
        
        return [
            {
                "id": order["id"],
                "order_number": order.get("order_number", "N/A"),
                "customer_name": order.get("customer_name") or "Guest",
                "customer_phone": order.get("customer_phone") or "N/A",
                "order_type": order.get("order_type", "dine-in"),
                "status": order.get("status", "pending"),
                "priority": order.get("priority", "normal"),
                "total_amount": float(order.get("total_amount") or (order.get("subtotal", 0) + order.get("tax", 0))),
                "items_count": len(order.get("items", [])),
                "created_at": order["created_at"],
                "updated_at": order.get("updated_at", order["created_at"]),
            }
            for order in orders
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_manager_orders: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=OrderStats)
async def get_order_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Get order statistics for manager dashboard with date range support"""
    try:
        # Check role
        user_role = current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", None)
        if user_role not in ['manager', 'admin']:
            raise HTTPException(status_code=403, detail="Manager access required")
        
        # Default to today if no dates provided
        if not start_date:
            start_date = datetime.now().date().isoformat()
        if not end_date:
            end_date = datetime.now().date().isoformat()
        
        # Get orders in date range
        orders_result = supabase_admin.table("orders").select("*").gte(
            "created_at", f"{start_date}T00:00:00"
        ).lte("created_at", f"{end_date}T23:59:59").execute()
        orders = orders_result.data or []
        
        today_count = len(orders)
        pending_count = len([o for o in orders if o.get("status") in ['pending', 'preparing', 'ready', 'in-progress']])
        completed_count = len([o for o in orders if o.get("status") in ['completed', 'delivered']])
        
        # Calculate revenue from completed orders only
        total_revenue = sum(float(o.get("total_amount") or (o.get("subtotal", 0) + o.get("tax", 0))) for o in orders if o.get("status") in ['completed', 'delivered'])
        
        # Completion rate
        completion_rate = round((completed_count / today_count * 100) if today_count > 0 else 0, 1)
        
        return OrderStats(
            today_orders=today_count,
            pending_orders=pending_count,
            completed_orders=completed_count,
            avg_completion_time=25,
            total_revenue=total_revenue,
            completion_rate=completion_rate
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_order_stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-cancel")
async def bulk_cancel_orders(
    request: BulkCancelRequest,
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Cancel multiple orders at once"""
    if current_user["role"] not in ['manager', 'admin']:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    cancelled_count = 0
    for order_id in request.order_ids:
        try:
            # Get order
            order_result = supabase_admin.table("orders").select("status").eq("id", order_id).execute()
            if order_result.data and order_result.data[0].get("status") not in ['completed', 'cancelled']:
                # Cancel order
                supabase_admin.table("orders").update({
                    "status": "cancelled",
                    "updated_at": datetime.now().isoformat()
                }).eq("id", order_id).execute()
                cancelled_count += 1
        except:
            continue
    
    return {"message": f"Successfully cancelled {cancelled_count} orders"}

@router.post("/export")
async def export_orders(
    request: ExportRequest,
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Export orders to CSV or PDF"""
    if current_user["role"] not in ['manager', 'admin']:
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Build query based on filters
    query = supabase_admin.table("orders").select("*")
    
    filters = request.filters
    if filters.get('status') and filters['status'] != 'all':
        query = query.eq("status", filters['status'])
    if filters.get('type') and filters['type'] != 'all':
        query = query.eq("order_type", filters['type'])
    if filters.get('date') == 'today':
        today = datetime.now().date().isoformat()
        query = query.gte("created_at", f"{today}T00:00:00")
    
    result = query.execute()
    orders = result.data
    
    if request.format == 'csv':
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Order #', 'Customer', 'Phone', 'Type', 'Status', 'Amount', 'Date'])
        
        for order in orders:
            writer.writerow([
                order.get("order_number", "N/A"),
                order.get("customer_name", "Guest"),
                order.get("customer_phone", "N/A"),
                order.get("order_type", "N/A"),
                order.get("status", "N/A"),
                f"KSh {order.get('total_amount', 0)}",
                order.get("created_at", "")[:16]
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=orders-{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    
    # PDF export would go here
    raise HTTPException(status_code=400, detail="PDF export not yet implemented")


@router.get("/daily-sales")
async def get_daily_sales(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """Get daily sales breakdown with optional employee filter"""
    try:
        user_role = current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", None)
        if user_role not in ['manager', 'admin']:
            raise HTTPException(status_code=403, detail="Manager access required")
        
        # Default to current month
        if not start_date:
            start_date = datetime.now().replace(day=1).date().isoformat()
        if not end_date:
            end_date = datetime.now().date().isoformat()
        
        # Get orders
        if employee_id:
            # Filter by specific employee
            waiter_orders = supabase_admin.table("orders").select("*").eq("assigned_waiter_id", employee_id).gte("created_at", f"{start_date}T00:00:00").lte("created_at", f"{end_date}T23:59:59").execute()
            chef_orders = supabase_admin.table("orders").select("*").eq("assigned_chef_id", employee_id).gte("created_at", f"{start_date}T00:00:00").lte("created_at", f"{end_date}T23:59:59").execute()
            orders_dict = {o["id"]: o for o in waiter_orders.data}
            orders_dict.update({o["id"]: o for o in chef_orders.data})
            orders = list(orders_dict.values())
        else:
            # Get ALL orders (no employee filter)
            result = supabase_admin.table("orders").select("*").gte(
                "created_at", f"{start_date}T00:00:00"
            ).lte("created_at", f"{end_date}T23:59:59").execute()
            orders = result.data or []
        
        # Group by date
        daily_sales = {}
        for order in orders:
            if order.get("status") in ['completed', 'delivered']:
                date = order["created_at"][:10]
                if date not in daily_sales:
                    daily_sales[date] = {"date": date, "revenue": 0, "orders": 0}
                amount = float(order.get("total_amount") or (order.get("subtotal", 0) + order.get("tax", 0)))
                daily_sales[date]["revenue"] += amount
                daily_sales[date]["orders"] += 1
        
        # Sort by date
        result = sorted(daily_sales.values(), key=lambda x: x["date"])
        
        return {
            "period": {"start": start_date, "end": end_date},
            "employee_id": employee_id,
            "daily_breakdown": result,
            "total_revenue": sum(d["revenue"] for d in result),
            "total_orders": sum(d["orders"] for d in result)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_daily_sales: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
