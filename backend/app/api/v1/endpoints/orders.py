"""
Order Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import Optional, List
from app.core.supabase import get_supabase
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderStatusUpdate
from app.middleware.auth import get_current_user, require_staff, require_chef
from datetime import datetime, timedelta
from decimal import Decimal
import random
import string
import asyncio
import asyncpg
from app.core.database import get_db_pool
from app.services.quickbooks_sync import QuickBooksSyncService
from app.services.websocket_manager import manager as ws_manager, EventType, send_order_event

router = APIRouter()


def generate_order_number() -> str:
    """Generate a unique order number"""
    prefix = "ORD"
    random_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}{random_part}"


@router.get("/", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    location_type: Optional[str] = None,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """
    Get all orders (Staff only)

    - Returns all orders with optional filters
    """
    try:
        query = supabase.table("orders").select("*")

        # Apply filters
        if status:
            query = query.eq("status", status)
        if location_type:
            query = query.eq("location_type", location_type)

        # Apply pagination
        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)

        response = query.execute()
        return [OrderResponse(**order) for order in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get current user's orders

    - Returns orders for the authenticated user
    """
    try:
        response = (
            supabase.table("orders")
            .select("*")
            .eq("customer_id", current_user["id"])
            .range(skip, skip + limit - 1)
            .order("created_at", desc=True)
            .execute()
        )

        return [OrderResponse(**order) for order in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/kitchen", response_model=List[OrderResponse])
async def get_kitchen_orders(
    current_user: dict = Depends(require_chef),
    supabase: Client = Depends(get_supabase),
):
    """
    Get kitchen orders (Chef/Manager/Admin only)

    - Returns active orders that need to be prepared
    - Includes orders with status: pending, confirmed, preparing
    """
    try:
        response = (
            supabase.table("orders")
            .select("*")
            .in_("status", ["pending", "confirmed", "preparing"])
            .order("priority", desc=True)
            .order("created_at", desc=False)
            .execute()
        )

        return [OrderResponse(**order) for order in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get order by ID

    - Returns order details
    - Users can only see their own orders, staff can see all
    """
    try:
        response = supabase.table("orders").select("*").eq("id", order_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        order = response.data[0]

        # Check access permissions
        if order["customer_id"] != current_user["id"] and current_user["role"] not in [
            "chef",
            "waiter",
            "manager",
            "admin",
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order",
            )

        return OrderResponse(**order)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Create a new order

    - Creates an order for the authenticated user
    - Calculates pricing automatically
    """
    try:
        # Validate items exist and are available
        item_ids = [item.menu_item_id for item in order_data.items]
        menu_items_response = (
            supabase.table("menu_items").select("*").in_("id", item_ids).execute()
        )

        if len(menu_items_response.data) != len(item_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some menu items not found",
            )

        # Check all items are available
        unavailable_items = [
            item["name"] for item in menu_items_response.data if not item.get("is_available", item.get("available", True))
        ]
        if unavailable_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Items not available: {', '.join(unavailable_items)}",
            )

        # Calculate pricing
        subtotal = Decimal(0)
        order_items = []

        for order_item in order_data.items:
            menu_item = next(
                (item for item in menu_items_response.data if item["id"] == order_item.menu_item_id),
                None,
            )

            if not menu_item:
                continue

            item_price = Decimal(str(menu_item["base_price"]))
            item_total = item_price * order_item.quantity
            subtotal += item_total

            order_items.append({
                "menu_item_id": order_item.menu_item_id,
                "name": order_item.name or menu_item["name"],  # Use provided name or fetch from menu
                "quantity": order_item.quantity,
                "price": float(order_item.price) if order_item.price else float(item_price),  # Use provided price or fetch from menu
                "customizations": order_item.customizations,
                "special_instructions": order_item.special_instructions,
                "total": float(item_total),
            })

        # Calculate tax and total
        tax = subtotal * Decimal("0.16")  # 16% tax
        total_amount = subtotal + tax

        # Calculate estimated ready time based on preparation times
        max_prep_time = max(
            (item.get("preparation_time", 20) for item in menu_items_response.data), default=20
        )
        estimated_ready_time = datetime.utcnow() + timedelta(minutes=max_prep_time)

        # Generate order number
        order_number = generate_order_number()

        # Create order
        order_dict = {
            "order_number": order_number,
            "customer_id": current_user["id"],
            "location": order_data.location,
            "location_type": order_data.location_type,
            "status": "pending",
            "items": order_items,
            "subtotal": float(subtotal),
            "tax": float(tax),
            "total_amount": float(total_amount),
            "special_instructions": order_data.special_instructions,
            "priority": "medium",
            "estimated_ready_time": estimated_ready_time.isoformat(),  # Important for customer experience
            # Customer information (for walk-in and room service orders)
            "customer_name": order_data.customer_name,
            "customer_phone": order_data.customer_phone,
            "order_type": order_data.order_type,
            # Payment tracking (payment happens later at bill settlement)
            "payment_status": "unpaid",  # All orders start as unpaid
            # Staff attribution
            "created_by_staff_id": current_user["id"],  # Track which staff member created the order
            # Extract room/table numbers for easier querying
            "room_number": order_data.location if order_data.location_type == "room" else None,
            "table_number": order_data.location if order_data.location_type == "table" else None,
        }

        response = supabase.table("orders").insert(order_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order",
            )

        created_order = response.data[0]

        # Send real-time notification to customer
        await send_order_event(
            current_user["id"],
            EventType.ORDER_CREATED,
            {
                "order_id": created_order["id"],
                "order_number": created_order["order_number"],
                "status": created_order["status"],
                "total_amount": created_order["total_amount"],
                "estimated_ready_time": created_order.get("estimated_ready_time"),
                "message": f"Order {created_order['order_number']} placed successfully!"
            }
        )

        # Notify all chefs about new order
        await ws_manager.broadcast({
            "type": EventType.ORDER_CREATED,
            "data": {
                "order_id": created_order["id"],
                "order_number": created_order["order_number"],
                "location": created_order["location"],
                "location_type": created_order["location_type"],
                "items": created_order["items"],
                "priority": created_order["priority"],
                "special_instructions": created_order.get("special_instructions"),
                "message": f"🔔 New order from {created_order['location']}"
            },
            "timestamp": datetime.utcnow().isoformat()
        })

        return OrderResponse(**created_order)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    status_data: OrderStatusUpdate,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    db_pool: asyncpg.Pool = Depends(get_db_pool),
):
    """
    Update order status (Staff only)

    - Updates the status of an order
    - Validates status transitions
    """
    try:
        # Get existing order
        existing_response = supabase.table("orders").select("*").eq("id", order_id).execute()

        if not existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        order = existing_response.data[0]
        old_status = order["status"]
        new_status = status_data.status

        # Validate status transitions
        valid_transitions = {
            "pending": ["confirmed", "cancelled"],
            "confirmed": ["preparing", "cancelled"],
            "preparing": ["ready", "cancelled"],
            "ready": ["served", "cancelled"],
            "served": ["completed"],
            "completed": [],
            "cancelled": [],
        }

        if new_status not in valid_transitions.get(old_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {old_status} to {new_status}",
            )

        # Prepare update data
        update_data = {
            "status": new_status,
            "notes": status_data.notes,
        }

        # Set status-specific fields
        if new_status == "confirmed":
            update_data["confirmed_at"] = datetime.utcnow().isoformat()
        elif new_status == "preparing":
            update_data["preparing_started_at"] = datetime.utcnow().isoformat()
            update_data["assigned_chef_id"] = current_user["id"]
        elif new_status == "ready":
            update_data["ready_at"] = datetime.utcnow().isoformat()
        elif new_status == "served":
            update_data["served_at"] = datetime.utcnow().isoformat()
            update_data["assigned_waiter_id"] = current_user["id"]
        elif new_status == "completed":
            update_data["completed_at"] = datetime.utcnow().isoformat()
        elif new_status == "cancelled":
            update_data["cancelled_at"] = datetime.utcnow().isoformat()

        # Update order
        response = supabase.table("orders").update(update_data).eq("id", order_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status",
            )

        updated_order = response.data[0]

        # Send real-time status update to customer
        status_messages = {
            "confirmed": f"Your order {order['order_number']} has been confirmed!",
            "preparing": f"Chef is now preparing your order {order['order_number']}",
            "ready": f"Your order {order['order_number']} is ready! 🎉",
            "served": f"Your order {order['order_number']} has been served",
            "completed": f"Order {order['order_number']} completed. Thank you!",
            "cancelled": f"Order {order['order_number']} has been cancelled"
        }

        await send_order_event(
            order["customer_id"],
            EventType.ORDER_STATUS_CHANGED,
            {
                "order_id": order_id,
                "order_number": order["order_number"],
                "old_status": old_status,
                "new_status": new_status,
                "message": status_messages.get(new_status, f"Order status: {new_status}")
            }
        )

        # Broadcast to staff based on status
        if new_status == "ready":
            # Notify all waiters that order is ready for pickup
            await ws_manager.broadcast({
                "type": EventType.ORDER_READY,
                "data": {
                    "order_id": order_id,
                    "order_number": order["order_number"],
                    "location": order["location"],
                    "location_type": order["location_type"],
                    "message": f"🔔 Order {order['order_number']} ready at {order['location']}"
                },
                "timestamp": datetime.utcnow().isoformat()
            })

        # Trigger QuickBooks sync if order is completed
        if new_status == "completed":
            try:
                sync_service = QuickBooksSyncService(db_pool)
                # Run sync in background to not block the response
                asyncio.create_task(
                    sync_service.sync_completed_order(order_id)
                )
            except Exception as qb_error:
                # Log QB sync error but don't fail the request
                print(f"QuickBooks sync failed for order {order_id}: {str(qb_error)}")

        return OrderResponse(**updated_order)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """
    Update order (Staff only)

    - Updates order details like assigned staff and priority
    """
    try:
        # Get existing order
        existing_response = supabase.table("orders").select("*").eq("id", order_id).execute()

        if not existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        # Prepare update data
        update_data = order_data.model_dump(exclude_unset=True)

        if not update_data:
            return OrderResponse(**existing_response.data[0])

        # Update order
        response = supabase.table("orders").update(update_data).eq("id", order_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order",
            )

        return OrderResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
