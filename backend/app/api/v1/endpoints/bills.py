"""
Bills API Endpoints
Handles unified bill aggregation and payment processing
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from supabase import Client
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal

from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import get_current_user
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
    supabase: Client = Depends(get_supabase_admin),
    supabase_admin: Client = Depends(get_supabase_admin),
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

        # Fetch unpaid orders with waiter info using admin client
        response = supabase_admin.table("orders")\
            .select("*")\
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

        # Process orders
        orders_with_waiters = []
        total_amount = Decimal(0)
        tax_included = Decimal(0)
        subtotal = Decimal(0)

        for order in response.data:
            # Get waiter name if staff_id exists
            waiter_name = "Unknown"
            if order.get("created_by_staff_id"):
                try:
                    waiter_response = supabase_admin.table("users")\
                        .select("full_name")\
                        .eq("id", order["created_by_staff_id"])\
                        .execute()
                    if waiter_response.data:
                        waiter_name = waiter_response.data[0].get("full_name", "Unknown")
                except Exception:
                    pass

            order_info = OrderInBill(
                order_id=order["id"],
                order_number=order["order_number"],
                waiter_id=order.get("created_by_staff_id"),
                waiter_name=waiter_name,
                items=order.get("items", []),
                amount=Decimal(str(order.get("total_amount", 0))),
                created_at=order["created_at"]
            )

            orders_with_waiters.append(order_info)
            total_amount += Decimal(str(order.get("total_amount", 0)))
            tax_included += Decimal(str(order.get("tax", 0)))
            subtotal += Decimal(str(order.get("subtotal", 0)))

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
        logging.error(f"Error fetching unpaid orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching unpaid orders"
        )


@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    bill_data: BillCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """
    Generate a consolidated bill from multiple orders

    - Groups multiple orders together
    - Creates single bill with QR code for payment
    - Tracks waiter attribution for each order
    """
    try:
        # Verify all orders exist and are unpaid (use admin to bypass RLS)
        orders_response = supabase_admin.table("orders")\
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
        try:
            bill_number_response = supabase_admin.rpc(
                "generate_bill_number",
                {
                    "p_location_type": bill_data.location_type,
                    "p_location": location
                }
            ).execute()
            bill_number = bill_number_response.data if bill_number_response.data else f"BILL-{location}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        except Exception:
            # Fallback if RPC doesn't exist
            bill_number = f"BILL-{location}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

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

        bill_response = supabase_admin.table("bills").insert(bill_dict).execute()

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
                "waiter_id": order.get("created_by_staff_id"),
                "order_amount": float(order["total_amount"])
            })

        supabase_admin.table("bill_orders").insert(bill_orders).execute()

        # Update orders with bill_id
        for order_id in bill_data.order_ids:
            supabase_admin.table("orders")\
                .update({"bill_id": bill["id"]})\
                .eq("id", order_id)\
                .execute()

        # Fetch complete bill with orders
        return await get_bill(bill["id"], current_user, supabase, supabase_admin)

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating bill: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating bill"
        )


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """Get bill details with order breakdown"""
    try:
        # Fetch bill using admin client to bypass RLS
        bill_response = supabase_admin.table("bills")\
            .select("*")\
            .eq("id", bill_id)\
            .execute()

        if not bill_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bill not found"
            )

        bill = bill_response.data[0]

        # Fetch associated orders using admin client
        bill_orders_response = supabase_admin.table("bill_orders")\
            .select("*")\
            .eq("bill_id", bill_id)\
            .execute()

        orders_list = []
        for bo in bill_orders_response.data:
            # Get order details
            order_response = supabase_admin.table("orders")\
                .select("*")\
                .eq("id", bo["order_id"])\
                .execute()

            if order_response.data:
                order = order_response.data[0]

                # Get waiter name
                waiter_response = supabase_admin.table("users")\
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
        logging.error(f"Error fetching bill: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching bill"
        )


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
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
            "completed_at": datetime.now(timezone.utc).isoformat()
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
                    "paid_at": datetime.now(timezone.utc).isoformat()
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
                        "paid_at": datetime.now(timezone.utc).isoformat()
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
        logging.error(f"Error processing payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing payment"
        )


@router.post("/mpesa/callback")
async def mpesa_callback(
    callback_data: MPesaCallbackData,
    supabase: Client = Depends(get_supabase_admin),
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
            "completed_at": datetime.now(timezone.utc).isoformat()
        }

        payment_response = supabase.table("payments").insert(payment_dict).execute()

        if payment_response.data:
            # Update bill as paid
            supabase.table("bills")\
                .update({
                    "payment_status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
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
                        "paid_at": datetime.now(timezone.utc).isoformat()
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
        logging.error(f"Error processing M-Pesa callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing M-Pesa callback"
        )


@router.get("/", response_model=List[BillResponse])
async def list_bills(
    payment_status: str = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
    supabase_admin: Client = Depends(get_supabase_admin),
):
    """List bills with optional filtering by payment status"""
    try:
        logging.info(f"Listing bills for user {current_user.get('id')} with role {current_user.get('role')} and status filter: {payment_status}")
        
        # Use admin client to bypass RLS
        query = supabase_admin.table("bills").select("*").order("created_at", desc=True)

        if payment_status:
            query = query.eq("payment_status", payment_status)
            logging.info(f"Applied payment_status filter: {payment_status}")

        # Staff (waiters, managers, admins) can see all bills, customers only their own
        if current_user["role"] in ["customer", "guest"]:
            query = query.eq("customer_phone", current_user.get("phone"))
            logging.info(f"Applied customer phone filter: {current_user.get('phone')}")

        response = query.execute()
        logging.info(f"Found {len(response.data)} bills in database")

        bills = []
        for bill_data in response.data:
            bill = await get_bill(bill_data["id"], current_user, supabase, supabase_admin)
            bills.append(bill)

        logging.info(f"Successfully loaded {len(bills)} bills for user")
        return bills

    except Exception as e:
        logging.error(f"Error listing bills: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing bills"
        )


# ─── M-Pesa STK Push for Bills ───────────────────────────────────────────────

from pydantic import BaseModel as PydanticBaseModel


class STKPushRequest(PydanticBaseModel):
    bill_id: str
    phone_number: str
    amount: Optional[float] = None  # defaults to remaining balance


@router.post("/mpesa/stk-push")
async def bill_mpesa_stk_push(
    req: STKPushRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Initiate M-Pesa STK push for a bill payment.
    Returns checkout_request_id that the frontend can poll.
    """
    try:
        from app.services.mpesa import MpesaService

        # Fetch bill
        bill_resp = supabase.table("bills").select("*").eq("id", req.bill_id).execute()
        if not bill_resp.data:
            raise HTTPException(status_code=404, detail="Bill not found")
        bill = bill_resp.data[0]

        # Calculate amount
        if req.amount:
            amount = req.amount
        else:
            payments_resp = supabase.table("payments").select("amount").eq("bill_id", req.bill_id).eq("payment_status", "completed").execute()
            paid = sum(p["amount"] for p in (payments_resp.data or []))
            amount = bill["total_amount"] - paid

        if amount <= 0:
            raise HTTPException(status_code=400, detail="Bill already fully paid")

        mpesa = MpesaService()
        result = await mpesa.stk_push(
            phone_number=req.phone_number,
            amount=amount,
            account_reference=bill["bill_number"],
            transaction_desc=f"Payment for bill {bill['bill_number']}",
        )

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "STK push failed"))

        checkout_request_id = result["checkout_request_id"]

        # Store pending payment record
        # payment_number stores the full checkout_request_id so we can look it up when polling
        supabase.table("payments").insert({
            "payment_number": checkout_request_id,
            "bill_id": req.bill_id,
            "amount": amount,
            "payment_method": "mpesa",
            "payment_status": "pending",
            "mpesa_phone": req.phone_number,
            "processed_by_waiter_id": current_user["id"],
            "notes": f"STK Push initiated to {req.phone_number}",
        }).execute()

        return {
            "success": True,
            "checkout_request_id": checkout_request_id,
            "customer_message": result.get("customer_message", "Check your phone for M-Pesa prompt"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"STK push error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate M-Pesa payment")


@router.get("/mpesa/stk-status/{checkout_request_id}")
async def bill_mpesa_stk_status(
    checkout_request_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Poll the status of an M-Pesa STK push.
    When confirmed, updates the payment record and bill status.
    """
    try:
        from app.services.mpesa import MpesaService

        # Find the pending payment (checkout_request_id stored in payment_number)
        pay_resp = supabase.table("payments").select("*").eq("payment_number", checkout_request_id).execute()
        if not pay_resp.data:
            return {"status": "not_found"}

        payment = pay_resp.data[0]

        # Already completed
        if payment["payment_status"] == "completed":
            return {"status": "completed", "mpesa_code": payment.get("mpesa_code")}

        # Query M-Pesa for status
        mpesa = MpesaService()
        result = await mpesa.query_stk_status(checkout_request_id)

        result_code = result.get("result_code")

        if result_code == "0" or result_code == 0:
            # Payment confirmed - extract M-Pesa code from metadata
            mpesa_code = None
            raw = result.get("data", {})
            for item in raw.get("CallbackMetadata", {}).get("Item", []):
                if item.get("Name") == "MpesaReceiptNumber":
                    mpesa_code = item.get("Value")

            # Update payment to completed
            supabase.table("payments").update({
                "payment_status": "completed",
                "mpesa_code": mpesa_code,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "notes": "Confirmed via STK push",
            }).eq("payment_number", checkout_request_id).execute()

            # Update bill status
            bill_id = payment["bill_id"]
            payments_resp = supabase.table("payments").select("amount").eq("bill_id", bill_id).eq("payment_status", "completed").execute()
            total_paid = sum(p["amount"] for p in (payments_resp.data or []))

            bill_resp = supabase.table("bills").select("total_amount").eq("id", bill_id).execute()
            if bill_resp.data:
                bill_total = bill_resp.data[0]["total_amount"]
                if total_paid >= bill_total:
                    supabase.table("bills").update({
                        "payment_status": "paid",
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", bill_id).execute()

                    # Mark orders as paid
                    bo_resp = supabase.table("bill_orders").select("order_id").eq("bill_id", bill_id).execute()
                    for bo in (bo_resp.data or []):
                        supabase.table("orders").update({
                            "payment_status": "paid",
                            "paid_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", bo["order_id"]).execute()

                elif total_paid > 0:
                    supabase.table("bills").update({"payment_status": "partially_paid"}).eq("id", bill_id).execute()

            return {"status": "completed", "mpesa_code": mpesa_code}

        elif result_code is not None and result_code != "" and str(result_code) != "0":
            # Failed
            supabase.table("payments").update({
                "payment_status": "failed",
                "notes": result.get("result_desc", "Payment declined"),
            }).eq("payment_number", checkout_request_id).execute()
            return {"status": "failed", "message": result.get("result_desc", "Payment declined")}

        # Still pending
        return {"status": "pending"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"STK status error: {str(e)}")
        return {"status": "error", "message": str(e)}


# ─── Paystack for Bills ───────────────────────────────────────────────────────

class PaystackInitRequest(PydanticBaseModel):
    bill_id: str
    email: str
    amount: Optional[float] = None


@router.post("/paystack/initialize")
async def bill_paystack_initialize(
    req: PaystackInitRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Initialize a Paystack payment for a bill."""
    try:
        from app.services.paystack import PaystackService
        from app.core.config import settings
        import uuid

        bill_resp = supabase.table("bills").select("*").eq("id", req.bill_id).execute()
        if not bill_resp.data:
            raise HTTPException(status_code=404, detail="Bill not found")
        bill = bill_resp.data[0]

        if req.amount:
            amount = req.amount
        else:
            payments_resp = supabase.table("payments").select("amount").eq("bill_id", req.bill_id).eq("payment_status", "completed").execute()
            paid = sum(p["amount"] for p in (payments_resp.data or []))
            amount = bill["total_amount"] - paid

        if amount <= 0:
            raise HTTPException(status_code=400, detail="Bill already fully paid")

        reference = f"BILL-{bill['bill_number']}-{uuid.uuid4().hex[:8].upper()}"

        paystack = PaystackService()
        result = await paystack.initialize_transaction(
            email=req.email,
            amount=amount,
            reference=reference,
            metadata={"bill_id": req.bill_id, "bill_number": bill["bill_number"]},
        )

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to initialize Paystack"))

        # Store pending payment
        supabase.table("payments").insert({
            "payment_number": reference,
            "bill_id": req.bill_id,
            "amount": amount,
            "payment_method": "card",
            "payment_status": "pending",
            "card_transaction_ref": reference,
            "processed_by_waiter_id": current_user["id"],
            "notes": "Paystack payment initiated",
        }).execute()

        return {
            "success": True,
            "authorization_url": result["authorization_url"],
            "access_code": result["access_code"],
            "reference": reference,
            "public_key": getattr(settings, 'PAYSTACK_PUBLIC_KEY', ''),
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Paystack init error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize Paystack")


@router.get("/paystack/verify/{reference}")
async def bill_paystack_verify(
    reference: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """Verify a Paystack payment and record it if successful."""
    try:
        from app.services.paystack import PaystackService

        paystack = PaystackService()
        result = await paystack.verify_transaction(reference)

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message"))

        if result["status"] != "success":
            return {"status": result["status"], "message": "Payment not yet completed"}

        # Update payment record
        supabase.table("payments").update({
            "payment_status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "notes": f"Paystack verified - channel: {result.get('channel', 'card')}",
        }).eq("card_transaction_ref", reference).execute()

        # Find payment to get bill_id
        pay_resp = supabase.table("payments").select("bill_id, amount").eq("card_transaction_ref", reference).execute()
        if pay_resp.data:
            bill_id = pay_resp.data[0]["bill_id"]

            payments_resp = supabase.table("payments").select("amount").eq("bill_id", bill_id).eq("payment_status", "completed").execute()
            total_paid = sum(p["amount"] for p in (payments_resp.data or []))

            bill_resp = supabase.table("bills").select("total_amount").eq("id", bill_id).execute()
            if bill_resp.data:
                bill_total = bill_resp.data[0]["total_amount"]
                if total_paid >= bill_total:
                    supabase.table("bills").update({
                        "payment_status": "paid",
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", bill_id).execute()

                    bo_resp = supabase.table("bill_orders").select("order_id").eq("bill_id", bill_id).execute()
                    for bo in (bo_resp.data or []):
                        supabase.table("orders").update({
                            "payment_status": "paid",
                            "paid_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", bo["order_id"]).execute()
                elif total_paid > 0:
                    supabase.table("bills").update({"payment_status": "partially_paid"}).eq("id", bill_id).execute()

        return {"status": "success", "reference": reference}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Paystack verify error: {str(e)}")
        raise HTTPException(status_code=500, detail="Verification failed")


class BillInitiationRequest(PydanticBaseModel):
    location_type: str  # 'table' or 'room'
    location: str       # table number or room number
    initiated_by: str   # waiter name
    order_ids: list[str] = []

@router.post("/initiate-notification")
async def notify_bill_initiation(
    req: BillInitiationRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Notify all other waiters at a location that billing is about to start.
    They have 3 minutes to add any remaining items.
    """
    from datetime import datetime, timezone, timedelta

    # Find other waiters who have open orders at this location
    location_field = "table_number" if req.location_type == "table" else "room_number"
    orders_res = supabase.table("orders").select(
        "created_by_staff_id, order_number"
    ).eq(location_field, req.location).eq("payment_status", "unpaid").in_(
        "status", ["served", "ready", "preparing", "confirmed", "pending"]
    ).execute()

    other_waiter_ids = list({
        o["created_by_staff_id"] for o in (orders_res.data or [])
        if o.get("created_by_staff_id") and o["created_by_staff_id"] != current_user["id"]
    })

    if not other_waiter_ids:
        return {"notified": 0, "message": "No other waiters to notify"}

    # Store the bill initiation event so waiters can see it
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=3)).isoformat()
    location_display = f"{'Table' if req.location_type == 'table' else 'Room'} {req.location}"

    # Insert notifications for each waiter
    notifications = []
    for waiter_id in other_waiter_ids:
        notifications.append({
            "user_id": waiter_id,
            "type": "bill_initiation",
            "title": f"Bill being created — {location_display}",
            "message": f"{req.initiated_by} is creating a bill for {location_display}. Add any remaining items in the next 3 minutes.",
            "data": {
                "location_type": req.location_type,
                "location": req.location,
                "initiated_by_id": current_user["id"],
                "initiated_by_name": req.initiated_by,
                "expires_at": expires_at,
            },
            "is_read": False,
        })

    try:
        supabase.table("notifications").insert(notifications).execute()
    except Exception as e:
        logging.warning(f"Failed to insert bill notifications: {e}")

    return {
        "notified": len(other_waiter_ids),
        "message": f"Notified {len(other_waiter_ids)} other waiter(s)",
        "expires_at": expires_at,
    }


@router.post("/paystack/webhook")
async def bill_paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None, alias="x-paystack-signature"),
    supabase: Client = Depends(get_supabase_admin),
):
    """Handle Paystack payment webhook callbacks."""
    try:
        from app.services.paystack import PaystackService
        import json

        body_bytes = await request.body()
        paystack = PaystackService()

        if not paystack.verify_webhook_signature(body_bytes, x_paystack_signature or ""):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

        data = json.loads(body_bytes)
        event = data.get("event")

        if event == "charge.success":
            reference = data["data"]["reference"]

            # Update payment
            supabase.table("payments").update({
                "payment_status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "notes": "Paystack webhook confirmed",
            }).eq("card_transaction_ref", reference).execute()

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Paystack webhook error: {str(e)}")
        return {"status": "error"}
