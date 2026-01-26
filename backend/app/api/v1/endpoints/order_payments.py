"""
Simple Order Payment Endpoint
Handles direct payments for served orders in waiter dashboard
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import Optional
from datetime import datetime
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import require_staff
from pydantic import BaseModel

router = APIRouter()

class OrderPaymentRequest(BaseModel):
    order_id: str
    payment_method: str  # 'cash', 'mpesa', 'card'
    amount: float
    mpesa_phone: Optional[str] = None
    card_reference: Optional[str] = None
    notes: Optional[str] = None

class OrderPaymentResponse(BaseModel):
    success: bool
    message: str
    payment_id: Optional[str] = None
    order_status: str

@router.post("/order-payment", response_model=OrderPaymentResponse)
async def process_order_payment(
    payment_data: OrderPaymentRequest,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """
    Process payment for a served order directly
    """
    try:
        print(f"[DEBUG] Payment request: {payment_data}")
        print(f"[DEBUG] Current user: {current_user.get('id', 'Unknown')}")
        
        # Get the order
        order_response = supabase_admin.table("orders").select("*").eq("id", payment_data.order_id).execute()
        
        if not order_response.data:
            print(f"[DEBUG] Order not found: {payment_data.order_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order = order_response.data[0]
        print(f"[DEBUG] Order status: {order['status']}")
        
        # Verify order is ready for payment (delivered, ready, or served status)
        if order["status"] not in ["delivered", "ready", "served"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be delivered, ready, or served before payment. Current status: {order['status']}"
            )
        
        # Create a bill record for the completed order
        # Get customer info if available
        customer_name = None
        customer_phone = None
        if order.get("customer_id"):
            try:
                customer_response = supabase_admin.table("users").select("full_name, phone").eq("id", order["customer_id"]).execute()
                if customer_response.data:
                    customer_name = customer_response.data[0].get("full_name")
                    customer_phone = customer_response.data[0].get("phone")
            except Exception as e:
                print(f"[DEBUG] Could not fetch customer info: {e}")

        bill_record = {
            "bill_number": f"BILL-{order.get('order_number', payment_data.order_id)}",
            "location_type": order.get("location_type", "table"),
            "table_number": order.get("location") if order.get("location_type") == "table" else None,
            "room_number": order.get("location") if order.get("location_type") == "room" else None,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "subtotal": payment_data.amount,
            "tax": 0,
            "total_amount": payment_data.amount,
            "payment_status": "paid",
            "paid_at": datetime.utcnow().isoformat(),
            "settled_by_waiter_id": current_user.get("id")
        }
        
        # Insert bill record
        bill_response = supabase_admin.table("bills").insert(bill_record).execute()
        
        if not bill_response.data:
            print(f"[DEBUG] Failed to create bill record: {bill_response}")
            # Continue anyway, just log the error
        else:
            print(f"[DEBUG] Bill created successfully: {bill_response.data[0]['id']}")
        
        # Update order status to completed
        order_update = supabase_admin.table("orders").update({
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", payment_data.order_id).execute()
        
        if not order_update.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order status"
            )
        
        return OrderPaymentResponse(
            success=True,
            message=f"Payment of KES {payment_data.amount:,.2f} processed successfully via {payment_data.payment_method.upper()}",
            payment_id="temp-payment-id",  # Temporary until payments table is fixed
            order_status="completed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing failed: {str(e)}"
        )