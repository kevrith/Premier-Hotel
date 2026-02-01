"""
Order Management Endpoints
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import Optional, List
from app.core.supabase import get_supabase, get_supabase_admin
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderStatusUpdate
from app.middleware.auth_secure import get_current_user, require_staff, require_chef
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import random
import string
import asyncio
import asyncpg
from app.core.database import get_db_pool
from app.services.quickbooks_sync import QuickBooksSyncService
from app.services.websocket_manager import manager as ws_manager, EventType, send_order_event

router = APIRouter()


async def generate_order_number(supabase_admin: Client) -> str:
    """Generate sequential order number: PH-001, PH-002, ..., PH-999, PH-1000, etc."""
    # Get the highest existing order number
    response = supabase_admin.table("orders").select("order_number").like("order_number", "PH-%").order("order_number", desc=True).limit(1).execute()
    
    if response.data:
        # Extract number from last order (e.g., "PH-123" -> 123)
        last_number = response.data[0]["order_number"].split("-")[1]
        next_number = int(last_number) + 1
    else:
        # Start from 1 if no orders exist
        next_number = 1
    
    # Use minimum 3 digits, expand as needed
    return f"PH-{next_number:03d}" if next_number <= 999 else f"PH-{next_number}"


async def generate_receipt_number(supabase_admin: Client) -> str:
    """Generate sequential receipt number: RCP-001, RCP-002, ..., RCP-999, RCP-1000, etc."""
    # Get the highest existing receipt number
    response = supabase_admin.table("payments").select("receipt_number").like("receipt_number", "RCP-%").order("receipt_number", desc=True).limit(1).execute()
    
    if response.data:
        # Extract number from last receipt (e.g., "RCP-123" -> 123)
        last_number = response.data[0]["receipt_number"].split("-")[1]
        next_number = int(last_number) + 1
    else:
        # Start from 1 if no receipts exist
        next_number = 1
    
    # Use minimum 3 digits, expand as needed
    return f"RCP-{next_number:03d}" if next_number <= 999 else f"RCP-{next_number}"


@router.get("/", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    location_type: Optional[str] = None,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Get all orders (Staff only)

    - Returns all orders with optional filters
    """
    try:
        # Use admin client to bypass RLS
        query = supabase_admin.table("orders").select("*")

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
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Get current user's orders

    - Returns orders for the authenticated user
    """
    try:
        # Use admin client to bypass RLS
        response = (
            supabase_admin.table("orders")
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
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Get kitchen orders (Chef/Manager/Admin only)

    - Returns active orders for kitchen display
    - Includes orders with status: pending, confirmed, preparing, ready
    """
    try:
        # Use admin client to bypass RLS
        response = (
            supabase_admin.table("orders")
            .select("*, assigned_chef:profiles!assigned_chef_id(first_name, last_name), assigned_waiter:profiles!assigned_waiter_id(first_name, last_name)")
            .in_("status", ["pending", "confirmed", "preparing", "in-progress", "ready"])
            .order("priority", desc=True)
            .order("created_at", desc=False)
            .execute()
        )

        # Debug: Log the statuses of orders being returned
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            order_summary = [{
                'id': o.get('id')[:8] + '...',
                'order_number': o.get('order_number'),
                'status': o.get('status')
            } for o in response.data]
            logging.debug(f"Kitchen orders returned: {order_summary}")

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
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Get order by ID

    - Returns order details
    - Users can only see their own orders, staff can see all
    """
    try:
        # Use admin client to bypass RLS
        response = supabase_admin.table("orders").select("*").eq("id", order_id).execute()

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
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Create a new order

    - Creates an order for the authenticated user
    - Calculates pricing automatically
    """
    try:
        # Validate items exist and are available
        item_ids = [item.menu_item_id for item in order_data.items]
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Order creation - Looking for menu items with IDs: {item_ids}")

        # Use admin client to bypass RLS when reading menu items
        menu_items_response = (
            supabase_admin.table("menu_items").select("*").in_("id", item_ids).execute()
        )

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Found {len(menu_items_response.data)} menu items in database")
            if menu_items_response.data:
                found_ids = [item['id'] for item in menu_items_response.data]
                logging.debug(f"Found item IDs: {found_ids}")

        if len(menu_items_response.data) != len(item_ids):
            missing_ids = set(item_ids) - set(item['id'] for item in menu_items_response.data)
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug(f"Missing menu item IDs: {missing_ids}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Some menu items not found. Missing IDs: {list(missing_ids)}",
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
        estimated_ready_time = datetime.now(timezone.utc) + timedelta(minutes=max_prep_time)

        # Generate order number
        order_number = await generate_order_number(supabase_admin)

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

        # Use admin client to bypass RLS for order insertion
        response = supabase_admin.table("orders").insert(order_dict).execute()

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

        # Notify all chefs about new order - Add debug logging
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Broadcasting new order to all connected clients: {ws_manager.get_connection_count()} connections")
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
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug("Broadcast completed")

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
    supabase_admin: Client = Depends(get_supabase_admin),
    db_pool: Optional[asyncpg.Pool] = Depends(get_db_pool),
):
    """
    Update order status (Staff only)

    - Updates the status of an order
    - Validates status transitions
    """
    try:
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Starting order status update for order {order_id}")
        
        # Get existing order (use admin to bypass RLS)
        existing_response = supabase_admin.table("orders").select("*").eq("id", order_id).execute()

        if not existing_response.data:
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug(f"Order {order_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        order = existing_response.data[0]
        old_status = order["status"]
        new_status = status_data.status
        
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Order found: {order['order_number']}, changing from {old_status} to {new_status}")

        # Validate status transitions (with backward compatibility)
        valid_transitions = {
            "pending": ["confirmed", "in-progress", "cancelled"],  # Allow old 'in-progress'
            "confirmed": ["preparing", "in-progress", "cancelled"],
            "preparing": ["ready", "cancelled"],
            "in-progress": ["preparing", "ready", "cancelled"],  # Handle old status
            "ready": ["served", "delivered", "cancelled"],  # Allow old 'delivered'
            "served": ["completed"],
            "delivered": ["completed"],  # Handle old status
            "completed": [],
            "cancelled": [],
        }
        
        # Map old status values to new ones for internal processing
        status_mapping = {
            "in-progress": "preparing",
            "delivered": "served"
        }
        
        # Use mapped status for internal logic
        mapped_new_status = status_mapping.get(new_status, new_status)

        if new_status not in valid_transitions.get(old_status, []):
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug(f"Invalid status transition from {old_status} to {new_status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {old_status} to {new_status}",
            )

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug("Status transition validation passed")
        
        # Prepare update data - only include fields that are explicitly set
        update_data = {
            "status": new_status,
        }
        # Only include notes if provided
        if status_data.notes is not None:
            update_data["notes"] = status_data.notes

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Base update data prepared: {update_data}")
        
        # Set status-specific fields (using mapped status)
        # First check if current user exists in profiles table to avoid foreign key errors
        user_exists = False
        try:
            user_check = supabase_admin.table("profiles").select("id").eq("id", current_user["id"]).execute()
            user_exists = bool(user_check.data)
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug(f"User {current_user['id']} exists in profiles: {user_exists}")
        except Exception as user_check_error:
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug(f"Could not verify user existence: {str(user_check_error)}")
        
        if mapped_new_status == "confirmed":
            update_data["confirmed_at"] = datetime.now(timezone.utc).isoformat()
        elif mapped_new_status == "preparing" or new_status == "in-progress":
            # Check chef workload before assignment
            if user_exists and current_user.get("role") == "chef":
                # Count current orders assigned to this chef
                workload_check = supabase_admin.table("orders")\
                    .select("id")\
                    .eq("assigned_chef_id", current_user["id"])\
                    .in_("status", ["preparing", "ready"])\
                    .execute()
                
                current_workload = len(workload_check.data)
                max_workload = 5  # Maximum orders per chef
                
                if current_workload >= max_workload:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Chef workload limit reached ({current_workload}/{max_workload} orders)"
                    )
                
                if logging.getLogger().isEnabledFor(logging.DEBUG):
                    logging.debug(f"Chef workload: {current_workload}/{max_workload}")
            
            # Handle both new 'preparing' and old 'in-progress' status
            update_data["preparing_started_at"] = datetime.now(timezone.utc).isoformat()
            if user_exists:
                update_data["assigned_chef_id"] = current_user["id"]
            else:
                if logging.getLogger().isEnabledFor(logging.DEBUG):
                    logging.debug("Skipping assigned_chef_id - user not found in profiles table")
        elif mapped_new_status == "ready":
            update_data["ready_at"] = datetime.now(timezone.utc).isoformat()
        elif mapped_new_status == "served" or new_status == "delivered":
            # Handle both new 'served' and old 'delivered' status
            update_data["served_at"] = datetime.now(timezone.utc).isoformat()
            if user_exists:
                update_data["assigned_waiter_id"] = current_user["id"]
            else:
                if logging.getLogger().isEnabledFor(logging.DEBUG):
                    logging.debug("Skipping assigned_waiter_id - user not found in profiles table")
        elif mapped_new_status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif mapped_new_status == "cancelled":
            update_data["cancelled_at"] = datetime.now(timezone.utc).isoformat()

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Final update data: {update_data}")
        
        # Update order (use admin to bypass RLS)
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Updating order {order_id} with data: {update_data}")
        response = supabase_admin.table("orders").update(update_data).eq("id", order_id).execute()
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Supabase update response: {response}")

        if not response.data:
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug(f"No data returned from update - response: {response}")
                # Check if the order still exists
                check_response = supabase_admin.table("orders").select("id, status").eq("id", order_id).execute()
                logging.debug(f"Order existence check: {check_response}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status - no data returned",
            )

        updated_order = response.data[0]
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Updated order status: {updated_order.get('status')} for order {order_id}")

        # Verify the update persisted by re-fetching
        verify_response = supabase_admin.table("orders").select("status").eq("id", order_id).execute()
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug(f"Verification fetch - status: {verify_response.data[0]['status'] if verify_response.data else 'NOT FOUND'}")

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug("Starting WebSocket notifications...")
        
        # Send real-time status update to customer (use mapped status for messages)
        status_messages = {
            "confirmed": f"Your order {order['order_number']} has been confirmed!",
            "preparing": f"Chef is now preparing your order {order['order_number']}",
            "in-progress": f"Chef is now preparing your order {order['order_number']}",  # Backward compatibility
            "ready": f"Your order {order['order_number']} is ready! 🎉",
            "served": f"Your order {order['order_number']} has been served",
            "delivered": f"Your order {order['order_number']} has been served",  # Backward compatibility
            "completed": f"Order {order['order_number']} completed. Thank you!",
            "cancelled": f"Order {order['order_number']} has been cancelled"
        }

        try:
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
            if logging.getLogger().isEnabledFor(logging.DEBUG):
                logging.debug("Customer notification sent successfully")
        except Exception as ws_error:
            logging.warning(f"Customer WebSocket notification failed: {str(ws_error)}")
            # Don't fail the request if WebSocket fails

        # Broadcast to staff based on status
        if new_status == "ready":
            try:
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
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                if logging.getLogger().isEnabledFor(logging.DEBUG):
                    logging.debug("Staff broadcast sent successfully")
            except Exception as broadcast_error:
                logging.warning(f"Staff broadcast failed: {str(broadcast_error)}")
                # Don't fail the request if broadcast fails

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug("Checking QuickBooks sync...")
        
        # Trigger QuickBooks sync if order is completed and db_pool is available
        if new_status == "completed" and db_pool is not None:
            try:
                sync_service = QuickBooksSyncService(db_pool)
                # Run sync in background to not block the response
                asyncio.create_task(
                    sync_service.sync_completed_order(order_id)
                )
                if logging.getLogger().isEnabledFor(logging.DEBUG):
                    logging.debug("QuickBooks sync task created")
            except Exception as qb_error:
                # Log QB sync error but don't fail the request
                logging.warning(f"QuickBooks sync failed for order {order_id}: {str(qb_error)}")

        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug("Order status update completed successfully")
        return OrderResponse(**updated_order)

    except HTTPException:
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.debug("HTTPException raised, re-raising")
        raise
    except Exception as e:
        logging.error(f"Unexpected error in update_order_status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status",
        )


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Update order (Staff only)

    - Updates order details like assigned staff and priority
    """
    try:
        # Get existing order (use admin to bypass RLS)
        existing_response = supabase_admin.table("orders").select("*").eq("id", order_id).execute()

        if not existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )

        # Prepare update data
        update_data = order_data.model_dump(exclude_unset=True)

        if not update_data:
            return OrderResponse(**existing_response.data[0])

        # Update order (use admin to bypass RLS)
        response = supabase_admin.table("orders").update(update_data).eq("id", order_id).execute()

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


# =====================================================
# ORDER MODIFICATION ENDPOINTS
# =====================================================

@router.post("/void-request")
async def request_void(
    modification: dict,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Request to void an order or item"""
    try:
        # Validate order exists
        order_response = supabase_admin.table("orders").select("*").eq("id", modification["order_id"]).execute()
        if not order_response.data:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        order = order_response.data[0]
        
        # Create modification request
        modification_data = {
            "order_id": modification["order_id"],
            "item_id": modification.get("item_id"),
            "modification_type": modification["modification_type"],
            "reason": modification["reason"],
            "amount": modification["amount"],
            "requested_by": current_user["id"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        result = supabase_admin.table("order_modifications").insert(modification_data).execute()
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create void request: {str(e)}"
        )


@router.post("/void-approve/{modification_id}")
async def approve_void(
    modification_id: str,
    approval_data: dict,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Approve a void request"""
    try:
        # Get modification request
        mod_response = supabase_admin.table("order_modifications").select("*").eq("id", modification_id).execute()
        if not mod_response.data:
            raise HTTPException(
                status_code=404,
                detail="Modification request not found"
            )

        modification = mod_response.data[0]
        
        # Update modification status
        update_data = {
            "status": "approved",
            "approved_by": current_user["id"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }

        result = supabase_admin.table("order_modifications").update(update_data).eq("id", modification_id).execute()
        
        # Update order status if needed
        if modification["modification_type"] == "void":
            supabase_admin.table("orders").update({
                "status": "cancelled"
            }).eq("id", modification["order_id"]).execute()

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve void request: {str(e)}"
        )


@router.post("/void-reject/{modification_id}")
async def reject_void(
    modification_id: str,
    rejection_data: dict,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Reject a void request"""
    try:
        # Get modification request
        mod_response = supabase_admin.table("order_modifications").select("*").eq("id", modification_id).execute()
        if not mod_response.data:
            raise HTTPException(
                status_code=404,
                detail="Modification request not found"
            )

        modification = mod_response.data[0]
        
        # Update modification status
        update_data = {
            "status": "rejected",
            "rejected_by": current_user["id"],
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": rejection_data.get("reason", "Not specified")
        }

        result = supabase_admin.table("order_modifications").update(update_data).eq("id", modification_id).execute()
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject void request: {str(e)}"
        )


@router.get("/modifications/pending")
async def get_pending_modifications(
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get all pending modification requests"""
    try:
        result = supabase_admin.table("order_modifications").select("*").eq("status", "pending").execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get pending modifications: {str(e)}"
        )


@router.get("/{order_id}/history")
async def get_order_history(
    order_id: str,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get order modification history"""
    try:
        # Get order modifications
        mods_result = supabase_admin.table("order_modifications").select("*").eq("order_id", order_id).execute()
        
        # Get order status changes (simplified)
        status_changes = []
        
        return {
            "order_id": order_id,
            "modifications": mods_result.data,
            "status_changes": status_changes
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get order history: {str(e)}"
        )


@router.get("/void-statistics")
async def get_void_statistics(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get void statistics for reporting"""
    try:
        # Validate date format
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Please use YYYY-MM-DD format."
            )

        # Get modifications in period
        mods_result = supabase_admin.table("order_modifications").select("*").gte(
            "created_at", start_dt.isoformat()
        ).lte("created_at", end_dt.isoformat()).execute()

        modifications = mods_result.data

        # Calculate statistics
        total_voids = len(modifications)
        approved_voids = len([m for m in modifications if m.get("status") == "approved"])
        rejected_voids = len([m for m in modifications if m.get("status") == "rejected"])
        total_amount = sum(float(m.get("amount", 0)) for m in modifications)
        
        # Calculate average processing time
        processing_times = []
        for mod in modifications:
            if mod.get("approved_at") and mod.get("created_at"):
                created = datetime.fromisoformat(mod["created_at"].replace('Z', '+00:00'))
                approved = datetime.fromisoformat(mod["approved_at"].replace('Z', '+00:00'))
                processing_times.append((approved - created).total_seconds() / 60)  # minutes

        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0

        # Voids by employee
        voids_by_employee = {}
        for mod in modifications:
            employee_id = mod.get("requested_by")
            if employee_id:
                if employee_id not in voids_by_employee:
                    voids_by_employee[employee_id] = {
                        "employee_id": employee_id,
                        "void_count": 0,
                        "total_amount": 0
                    }
                voids_by_employee[employee_id]["void_count"] += 1
                voids_by_employee[employee_id]["total_amount"] += float(mod.get("amount", 0))

        return {
            "total_voids": total_voids,
            "approved_voids": approved_voids,
            "rejected_voids": rejected_voids,
            "total_amount": round(total_amount, 2),
            "avg_processing_time": round(avg_processing_time, 2),
            "voids_by_employee": list(voids_by_employee.values())
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get void statistics: {str(e)}"
        )


@router.post("/{order_id}/reverse")
async def reverse_order(
    order_id: str,
    reversal_data: dict,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Reverse a completed order"""
    try:
        # Get order
        order_response = supabase_admin.table("orders").select("*").eq("id", order_id).execute()
        if not order_response.data:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        order = order_response.data[0]
        
        # Create reversal record
        reversal_data = {
            "order_id": order_id,
            "reason": reversal_data["reason"],
            "reversed_by": current_user["id"],
            "reversed_at": datetime.now(timezone.utc).isoformat()
        }

        result = supabase_admin.table("order_reversals").insert(reversal_data).execute()
        
        # Update order status
        supabase_admin.table("orders").update({
            "status": "reversed"
        }).eq("id", order_id).execute()

        return {
            "success": True,
            "message": "Order reversed successfully",
            "transaction_id": result.data[0]["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reverse order: {str(e)}"
        )


# =====================================================
# AUDIT TRAIL ENDPOINTS
# =====================================================

@router.get("/audit/trail")
async def get_audit_trail(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    performed_by: Optional[str] = Query(None),
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get audit trail for order modifications"""
    try:
        query = supabase_admin.table("order_modifications").select("*")
        
        if start_date:
            query = query.gte("created_at", start_date)
        if end_date:
            query = query.lte("created_at", end_date)
        if entity_type:
            query = query.eq("modification_type", entity_type)
        if performed_by:
            query = query.eq("requested_by", performed_by)

        result = query.execute()
        return result.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get audit trail: {str(e)}"
        )
