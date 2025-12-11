"""
Payment Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional
from datetime import datetime
from app.middleware.auth import get_current_user, require_role
from app.core.supabase import get_supabase, get_supabase_admin
from app.schemas.payment import (
    PaymentInitiate,
    PaymentResponse,
    MpesaSTKPush,
    MpesaCallback,
    PaymentStatusQuery
)
from app.services.mpesa import MpesaService
from supabase import Client

router = APIRouter()


@router.post("/initiate", response_model=PaymentResponse)
async def initiate_payment(
    payment: PaymentInitiate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Initiate a payment for a booking or order
    """
    user_id = current_user["id"]

    # Verify the reference exists and belongs to the user
    if payment.reference_type == "booking":
        booking = supabase.table("bookings").select("*").eq("id", payment.reference_id).eq("user_id", user_id).maybe_single().execute()
        if not booking.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or does not belong to you"
            )
    elif payment.reference_type == "order":
        order = supabase.table("orders").select("*").eq("id", payment.reference_id).eq("user_id", user_id).maybe_single().execute()
        if not order.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or does not belong to you"
            )

    # Create payment record
    payment_data = {
        "user_id": user_id,
        "reference_type": payment.reference_type,
        "reference_id": payment.reference_id,
        "payment_method": payment.payment_method,
        "amount": float(payment.amount),
        "description": payment.description,
        "status": "pending"
    }

    # Handle M-Pesa payment
    if payment.payment_method == "mpesa":
        if not payment.phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required for M-Pesa payments"
            )

        # Initialize M-Pesa service
        mpesa_service = MpesaService()

        # Initiate STK push
        stk_response = await mpesa_service.stk_push(
            phone_number=payment.phone_number,
            amount=float(payment.amount),
            account_reference=f"{payment.reference_type.upper()}-{payment.reference_id}",
            transaction_desc=payment.description or f"Payment for {payment.reference_type}"
        )

        if not stk_response.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=stk_response.get("message", "Failed to initiate M-Pesa payment")
            )

        # Add M-Pesa specific data
        payment_data["mpesa_checkout_request_id"] = stk_response.get("checkout_request_id")
        payment_data["mpesa_phone_number"] = payment.phone_number
        payment_data["status"] = "processing"

    elif payment.payment_method == "cash":
        # Cash payments remain pending until staff confirms
        payment_data["status"] = "pending"

    elif payment.payment_method == "card":
        # Card payments would integrate with a payment gateway
        # For now, mark as pending
        payment_data["status"] = "pending"

    # Insert payment record
    result = supabase.table("payments").insert(payment_data).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment record"
        )

    payment_record = result.data[0]

    return PaymentResponse(**payment_record)


@router.post("/mpesa/callback")
async def mpesa_callback(
    request: Request,
    supabase: Client = Depends(get_supabase_admin)
):
    """
    Handle M-Pesa payment callback
    """
    try:
        callback_data = await request.json()

        # Extract data from M-Pesa callback
        body = callback_data.get("Body", {})
        stk_callback = body.get("stkCallback", {})

        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")

        if not checkout_request_id:
            return {"status": "error", "message": "Invalid callback data"}

        # Find payment record
        payment = supabase.table("payments").select("*").eq(
            "mpesa_checkout_request_id", checkout_request_id
        ).maybe_single().execute()

        if not payment.data:
            return {"status": "error", "message": "Payment record not found"}

        # Update payment status based on result code
        update_data = {}

        if result_code == 0:
            # Payment successful
            callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            mpesa_transaction_id = None

            for item in callback_metadata:
                if item.get("Name") == "MpesaReceiptNumber":
                    mpesa_transaction_id = item.get("Value")
                    break

            update_data = {
                "status": "completed",
                "mpesa_transaction_id": mpesa_transaction_id,
                "completed_at": datetime.utcnow().isoformat()
            }

            # Update booking or order status
            payment_record = payment.data
            if payment_record["reference_type"] == "booking":
                supabase.table("bookings").update({
                    "payment_status": "paid"
                }).eq("id", payment_record["reference_id"]).execute()

            elif payment_record["reference_type"] == "order":
                supabase.table("orders").update({
                    "payment_status": "paid"
                }).eq("id", payment_record["reference_id"]).execute()

        else:
            # Payment failed
            result_desc = stk_callback.get("ResultDesc", "Payment failed")
            update_data = {
                "status": "failed",
                "error_message": result_desc
            }

        # Update payment record
        supabase.table("payments").update(update_data).eq(
            "mpesa_checkout_request_id", checkout_request_id
        ).execute()

        return {"status": "success", "message": "Callback processed"}

    except Exception as e:
        print(f"Error processing M-Pesa callback: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/status/{payment_id}", response_model=PaymentResponse)
async def get_payment_status(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get payment status
    """
    user_id = current_user["id"]
    user_role = current_user.get("role", "customer")

    # Build query
    query = supabase.table("payments").select("*").eq("id", payment_id)

    # Users can only see their own payments unless they're staff
    if user_role not in ["admin", "staff", "manager"]:
        query = query.eq("user_id", user_id)

    result = query.maybe_single().execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    payment = result.data

    # For M-Pesa payments that are still processing, query the status
    if (payment["payment_method"] == "mpesa" and
        payment["status"] == "processing" and
        payment.get("mpesa_checkout_request_id")):

        mpesa_service = MpesaService()
        mpesa_status = await mpesa_service.query_payment_status(
            payment["mpesa_checkout_request_id"]
        )

        if mpesa_status.get("success"):
            # Update payment status if it changed
            if mpesa_status.get("status") != payment["status"]:
                update_data = {"status": mpesa_status["status"]}

                if mpesa_status["status"] == "completed":
                    update_data["completed_at"] = datetime.utcnow().isoformat()
                    update_data["mpesa_transaction_id"] = mpesa_status.get("transaction_id")

                result = supabase.table("payments").update(update_data).eq(
                    "id", payment_id
                ).execute()

                if result.data:
                    payment = result.data[0]

    return PaymentResponse(**payment)


@router.get("/my-payments", response_model=List[PaymentResponse])
async def get_my_payments(
    reference_type: Optional[str] = None,
    payment_status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get current user's payments
    """
    user_id = current_user["id"]

    query = supabase.table("payments").select("*").eq("user_id", user_id)

    if reference_type:
        query = query.eq("reference_type", reference_type)

    if payment_status:
        query = query.eq("status", payment_status)

    result = query.order("created_at", desc=True).execute()

    return [PaymentResponse(**payment) for payment in result.data]


@router.get("/all", response_model=List[PaymentResponse])
async def get_all_payments(
    reference_type: Optional[str] = None,
    payment_method: Optional[str] = None,
    payment_status: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin", "staff", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Get all payments (staff only)
    """
    query = supabase.table("payments").select("*")

    if reference_type:
        query = query.eq("reference_type", reference_type)

    if payment_method:
        query = query.eq("payment_method", payment_method)

    if payment_status:
        query = query.eq("status", payment_status)

    result = query.order("created_at", desc=True).execute()

    return [PaymentResponse(**payment) for payment in result.data]


@router.patch("/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(
    payment_id: str,
    transaction_reference: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin", "staff", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Confirm a cash/card payment (staff only)
    """
    # Get payment
    payment = supabase.table("payments").select("*").eq("id", payment_id).maybe_single().execute()

    if not payment.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    payment_data = payment.data

    if payment_data["status"] == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already completed"
        )

    # Update payment
    update_data = {
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat()
    }

    if transaction_reference:
        update_data["metadata"] = {"transaction_reference": transaction_reference}

    result = supabase.table("payments").update(update_data).eq("id", payment_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update payment"
        )

    # Update related booking or order
    if payment_data["reference_type"] == "booking":
        supabase.table("bookings").update({
            "payment_status": "paid"
        }).eq("id", payment_data["reference_id"]).execute()

    elif payment_data["reference_type"] == "order":
        supabase.table("orders").update({
            "payment_status": "paid"
        }).eq("id", payment_data["reference_id"]).execute()

    return PaymentResponse(**result.data[0])


@router.patch("/{payment_id}/cancel", response_model=PaymentResponse)
async def cancel_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Cancel a pending payment
    """
    user_id = current_user["id"]
    user_role = current_user.get("role", "customer")

    # Get payment
    query = supabase.table("payments").select("*").eq("id", payment_id)

    # Users can only cancel their own payments unless they're staff
    if user_role not in ["admin", "staff", "manager"]:
        query = query.eq("user_id", user_id)

    payment = query.maybe_single().execute()

    if not payment.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    payment_data = payment.data

    if payment_data["status"] not in ["pending", "processing"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel payment with status: {payment_data['status']}"
        )

    # Update payment
    result = supabase.table("payments").update({
        "status": "cancelled"
    }).eq("id", payment_id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel payment"
        )

    return PaymentResponse(**result.data[0])
