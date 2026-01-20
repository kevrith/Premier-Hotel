"""
Bills API Endpoints
Handles unified bill aggregation and payment processing
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import List
from datetime import datetime
from decimal import Decimal

from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user
from app.schemas.bill import (
    BillCreate,
    BillResponse,
    PaymentCreate,
    PaymentResponse,
    UnpaidOrdersResponse,
    OrderInBill,
    MPesaCallbackData
)

router = APIRouter()


def generate_payment_number() -> str:
    """Generate unique payment number"""
    import random
    import string
    return "PAY" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


@router.get("/unpaid/{location_type}/{location}", response_model=UnpaidOrdersResponse)
async def get_unpaid_orders(
    location_type: str,
    location: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get all unpaid orders for a specific table or room

    - Any waiter can fetch unpaid orders for any location
    - Returns all orders regardless of who created them
    - Used to generate consolidated bills
    """
    try:
        # Validate location type
        if location_type not in ["table", "room"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location type must be 'table' or 'room'"
            )

        # Determine which field to query
        location_field = "table_number" if location_type == "table" else "room_number"

        # Fetch unpaid orders with waiter info in a single query (fix N+1 problem)
        # Use JOIN to get waiter information with the orders
        response = supabase.table("orders")\
            .select("""
                *,
                waiter:users!created_by_staff_id(id, full_name)
            """)\
            .eq(location_field, location)\
            .eq("payment_status", "unpaid")\
            .eq("status", "served")\
            .order("created_at")\
            .execute()

        if not response.data:
            return UnpaidOrdersResponse(
                location=location,
                location_type=location_type,
                orders=[],
                total_amount=Decimal(0),
                tax_included=Decimal(0),
                subtotal=Decimal(0),
                order_count=0
            )

        # Process orders (waiter info already loaded via JOIN)
        orders_with_waiters = []
        total_amount = Decimal(0)
        tax_included = Decimal(0)
        subtotal = Decimal(0)

        for order in response.data:
            # Waiter info is already included from JOIN
            waiter_info = order.get("waiter", {})
            waiter_name = waiter_info.get("full_name", "Unknown") if waiter_info else "Unknown"

            order_info = OrderInBill(
                order_id=order["id"],
                order_number=order["order_number"],
                waiter_id=order["created_by_staff_id"],
                waiter_name=waiter_name,
                items=order["items"],
                amount=Decimal(str(order["total_amount"])),
                created_at=order["created_at"]
            )

            orders_with_waiters.append(order_info)
            total_amount += Decimal(str(order["total_amount"]))
            tax_included += Decimal(str(order["tax"]))
            subtotal += Decimal(str(order["subtotal"]))

        return UnpaidOrdersResponse(
            location=location,
            location_type=location_type,
            orders=orders_with_waiters,
            total_amount=total_amount,
            tax_included=tax_included,
            subtotal=subtotal,
            order_count=len(orders_with_waiters)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching unpaid orders: {str(e)}"
        )


@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    bill_data: BillCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Generate a consolidated bill from multiple orders

    - Groups multiple orders together
    - Creates single bill with QR code for payment
    - Tracks waiter attribution for each order
    """
    try:
        # Verify all orders exist and are unpaid
        orders_response = supabase.table("orders")\
            .select("*")\
            .in_("id", bill_data.order_ids)\
            .execute()

        if len(orders_response.data) != len(bill_data.order_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some orders not found"
            )

        # Check all orders are unpaid
        paid_orders = [o for o in orders_response.data if o.get("payment_status") != "unpaid"]
        if paid_orders:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Orders already paid: {[o['order_number'] for o in paid_orders]}"
            )

        # Calculate totals
        total_amount = Decimal(0)
        subtotal = Decimal(0)
        tax = Decimal(0)

        for order in orders_response.data:
            total_amount += Decimal(str(order["total_amount"]))
            subtotal += Decimal(str(order["subtotal"]))
            tax += Decimal(str(order["tax"]))

        # Generate bill number
        location = bill_data.table_number or bill_data.room_number
        bill_number_response = supabase.rpc(
            "generate_bill_number",
            {
                "p_location_type": bill_data.location_type,
                "p_location": location
            }
        ).execute()

        bill_number = bill_number_response.data if bill_number_response.data else f"BILL-{location}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Create bill record
        bill_dict = {
            "bill_number": bill_number,
            "table_number": bill_data.table_number,
            "room_number": bill_data.room_number,
            "location_type": bill_data.location_type,
            "customer_name": bill_data.customer_name,
            "customer_phone": bill_data.customer_phone,
            "subtotal": float(subtotal),
            "tax": float(tax),
            "total_amount": float(total_amount),
            "payment_status": "unpaid",
            "settled_by_waiter_id": current_user["id"],
        }

        bill_response = supabase.table("bills").insert(bill_dict).execute()

        if not bill_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create bill"
            )

        bill = bill_response.data[0]

        # Link orders to bill
        bill_orders = []
        for order in orders_response.data:
            bill_orders.append({
                "bill_id": bill["id"],
                "order_id": order["id"],
                "waiter_id": order["created_by_staff_id"],
                "order_amount": float(order["total_amount"])
            })

        supabase.table("bill_orders").insert(bill_orders).execute()

        # Update orders with bill_id
        for order_id in bill_data.order_ids:
            supabase.table("orders")\
                .update({"bill_id": bill["id"]})\
                .eq("id", order_id)\
                .execute()

        # Fetch complete bill with orders
        return await get_bill(bill["id"], current_user, supabase)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating bill: {str(e)}"
        )


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get bill details with order breakdown"""
    try:
        # Fetch bill
        bill_response = supabase.table("bills")\
            .select("*")\
            .eq("id", bill_id)\
            .execute()

        if not bill_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bill not found"
            )

        bill = bill_response.data[0]

        # Fetch associated orders
        bill_orders_response = supabase.table("bill_orders")\
            .select("*")\
            .eq("bill_id", bill_id)\
            .execute()

        orders_list = []
        for bo in bill_orders_response.data:
            # Get order details
            order_response = supabase.table("orders")\
                .select("*")\
                .eq("id", bo["order_id"])\
                .execute()

            if order_response.data:
                order = order_response.data[0]

                # Get waiter name
                waiter_response = supabase.table("users")\
                    .select("full_name")\
                    .eq("id", bo["waiter_id"])\
                    .execute()

                waiter_name = waiter_response.data[0]["full_name"] if waiter_response.data else "Unknown"

                orders_list.append(OrderInBill(
                    order_id=order["id"],
                    order_number=order["order_number"],
                    waiter_id=bo["waiter_id"],
                    waiter_name=waiter_name,
                    items=order["items"],
                    amount=Decimal(str(order["total_amount"])),
                    created_at=order["created_at"]
                ))

        bill["orders"] = orders_list
        return BillResponse(**bill)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching bill: {str(e)}"
        )


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Process a payment for a bill

    - Supports partial and full payments
    - Automatically attributes to waiters based on orders
    - Updates bill and order payment status
    """
    try:
        # Verify bill exists
        bill_response = supabase.table("bills")\
            .select("*")\
            .eq("id", payment_data.bill_id)\
            .execute()

        if not bill_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bill not found"
            )

        bill = bill_response.data[0]

        # Validate payment method requirements
        if payment_data.payment_method == "mpesa" and not payment_data.mpesa_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="M-Pesa code required for M-Pesa payments"
            )

        # Generate payment number
        payment_number = generate_payment_number()

        # Create payment record
        payment_dict = {
            "payment_number": payment_number,
            "bill_id": payment_data.bill_id,
            "amount": float(payment_data.amount),
            "payment_method": payment_data.payment_method,
            "payment_status": "completed",
            "mpesa_code": payment_data.mpesa_code,
            "mpesa_phone": payment_data.mpesa_phone,
            "card_transaction_ref": payment_data.card_transaction_ref,
            "room_charge_ref": payment_data.room_charge_ref,
            "processed_by_waiter_id": current_user["id"],
            "notes": payment_data.notes,
            "completed_at": datetime.utcnow().isoformat()
        }

        payment_response = supabase.table("payments").insert(payment_dict).execute()

        if not payment_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment"
            )

        payment = payment_response.data[0]

        # Check if bill is fully paid
        payments_sum_response = supabase.table("payments")\
            .select("amount")\
            .eq("bill_id", payment_data.bill_id)\
            .eq("payment_status", "completed")\
            .execute()

        total_paid = sum(Decimal(str(p["amount"])) for p in payments_sum_response.data)
        bill_total = Decimal(str(bill["total_amount"]))

        # Update bill status
        if total_paid >= bill_total:
            # Fully paid
            supabase.table("bills")\
                .update({
                    "payment_status": "paid",
                    "paid_at": datetime.utcnow().isoformat()
                })\
                .eq("id", payment_data.bill_id)\
                .execute()

            # Mark all orders as paid
            bill_orders_response = supabase.table("bill_orders")\
                .select("order_id")\
                .eq("bill_id", payment_data.bill_id)\
                .execute()

            for bo in bill_orders_response.data:
                supabase.table("orders")\
                    .update({
                        "payment_status": "paid",
                        "paid_at": datetime.utcnow().isoformat()
                    })\
                    .eq("id", bo["order_id"])\
                    .execute()

        elif total_paid > 0:
            # Partially paid
            supabase.table("bills")\
                .update({"payment_status": "partially_paid"})\
                .eq("id", payment_data.bill_id)\
                .execute()

        return PaymentResponse(**payment)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing payment: {str(e)}"
        )


@router.post("/mpesa/callback")
async def mpesa_callback(
    callback_data: MPesaCallbackData,
    supabase: Client = Depends(get_supabase),
):
    """
    Handle M-Pesa payment callbacks

    - Automatically processes M-Pesa payments
    - Attributes payment to waiters
    - Updates bill and order status
    """
    try:
        # Find bill by account reference (bill number)
        bill_response = supabase.table("bills")\
            .select("*")\
            .eq("bill_number", callback_data.account_reference)\
            .execute()

        if not bill_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bill not found: {callback_data.account_reference}"
            )

        bill = bill_response.data[0]

        # Create payment record
        payment_dict = {
            "payment_number": f"PAY-MPESA-{callback_data.mpesa_code}",
            "bill_id": bill["id"],
            "amount": float(callback_data.amount),
            "payment_method": "mpesa",
            "payment_status": "completed",
            "mpesa_code": callback_data.mpesa_code,
            "mpesa_phone": callback_data.phone,
            "processed_by_waiter_id": bill["settled_by_waiter_id"],  # Use bill creator
            "completed_at": datetime.utcnow().isoformat()
        }

        payment_response = supabase.table("payments").insert(payment_dict).execute()

        if payment_response.data:
            # Update bill as paid
            supabase.table("bills")\
                .update({
                    "payment_status": "paid",
                    "paid_at": datetime.utcnow().isoformat()
                })\
                .eq("id", bill["id"])\
                .execute()

            # Mark all orders as paid
            bill_orders_response = supabase.table("bill_orders")\
                .select("order_id")\
                .eq("bill_id", bill["id"])\
                .execute()

            for bo in bill_orders_response.data:
                supabase.table("orders")\
                    .update({
                        "payment_status": "paid",
                        "paid_at": datetime.utcnow().isoformat()
                    })\
                    .eq("id", bo["order_id"])\
                    .execute()

            return {
                "status": "success",
                "message": "Payment processed successfully",
                "bill_number": bill["bill_number"],
                "amount": callback_data.amount
            }

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process payment"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing M-Pesa callback: {str(e)}"
        )


@router.get("/", response_model=List[BillResponse])
async def list_bills(
    payment_status: str = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """List bills with optional filtering by payment status"""
    try:
        query = supabase.table("bills").select("*").order("created_at", desc=True)

        if payment_status:
            query = query.eq("payment_status", payment_status)

        # Staff can see all bills, customers only their own
        if current_user["role"] not in ["chef", "waiter", "manager", "admin"]:
            query = query.eq("customer_phone", current_user.get("phone"))

        response = query.execute()

        bills = []
        for bill_data in response.data:
            bill = await get_bill(bill_data["id"], current_user, supabase)
            bills.append(bill)

        return bills

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing bills: {str(e)}"
        )
