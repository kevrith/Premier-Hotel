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
    payment_method: str  # 'cash', 'mpesa', 'card', 'room_charge'
    amount: float
    mpesa_phone: Optional[str] = None
    card_reference: Optional[str] = None
    notes: Optional[str] = None
    room_number: Optional[str] = None  # For room_charge method

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

        # Check if bill already exists for this order
        existing_bill_response = supabase_admin.table("bills").select("*").eq("order_id", payment_data.order_id).execute()
        
        if existing_bill_response.data:
            # Bill already exists, update it instead of creating new one
            existing_bill = existing_bill_response.data[0]
            print(f"[DEBUG] Bill already exists: {existing_bill['id']}, updating payment status")
            
            # Determine payment status based on payment method
            payment_status = "paid" if payment_data.payment_method != "room_charge" else "unpaid"
            paid_at = datetime.utcnow().isoformat() if payment_data.payment_method != "room_charge" else None
            
            # Update existing bill
            bill_update = {
                "payment_status": payment_status,
                "paid_at": paid_at
            }
            
            bill_response = supabase_admin.table("bills").update(bill_update).eq("id", existing_bill["id"]).execute()
            print(f"[DEBUG] Bill updated successfully: {existing_bill['id']}")
        else:
            # No existing bill, create new one
            print(f"[DEBUG] No existing bill found, creating new one")
            
            # Determine payment status based on payment method
            payment_status = "paid" if payment_data.payment_method != "room_charge" else "unpaid"
            paid_at = datetime.utcnow().isoformat() if payment_data.payment_method != "room_charge" else None

            bill_record = {
                "order_id": payment_data.order_id,
                "bill_number": f"BILL-{order.get('order_number', payment_data.order_id)}",
                "location_type": order.get("location_type", "table"),
                "table_number": order.get("location") if order.get("location_type") == "table" else None,
                "room_number": payment_data.room_number or (order.get("location") if order.get("location_type") == "room" else None),
                "customer_name": customer_name,
                "customer_phone": customer_phone,
                "subtotal": payment_data.amount,
                "tax": 0,
                "total_amount": payment_data.amount,
                "payment_status": payment_status,
                "paid_at": paid_at,
                "settled_by_waiter_id": current_user.get("id")
            }
            
            print(f"[DEBUG] Creating bill with record: {bill_record}")
            
            # Insert bill record
            try:
                bill_response = supabase_admin.table("bills").insert(bill_record).execute()
                
                if not bill_response.data:
                    print(f"[DEBUG] Failed to create bill record - no data returned")
                    print(f"[DEBUG] Response: {bill_response}")
                else:
                    print(f"[DEBUG] Bill created successfully: {bill_response.data[0]['id']}")
            except Exception as bill_insert_error:
                print(f"[ERROR] Bill insert failed: {str(bill_insert_error)}")
                import traceback
                print(f"[ERROR] Traceback: {traceback.format_exc()}")
                raise
        
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
            message=(
                f"Charged KES {payment_data.amount:,.2f} to room {payment_data.room_number}. Will be paid at checkout."
                if payment_data.payment_method == "room_charge"
                else f"Payment of KES {payment_data.amount:,.2f} processed successfully via {payment_data.payment_method.upper()}"
            ),
            payment_id="temp-payment-id",
            order_status="completed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing failed: {str(e)}"
        )