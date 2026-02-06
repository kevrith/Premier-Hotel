"""
Test endpoint to manually create bills for debugging
"""
from fastapi import APIRouter, Depends
from supabase import Client
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import require_staff
from datetime import datetime

router = APIRouter()

@router.post("/test/create-bill-for-order/{order_id}")
async def test_create_bill(
    order_id: str,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """
    Test endpoint to manually create a bill for an order
    """
    try:
        # Get the order
        order_response = supabase_admin.table("orders").select("*").eq("id", order_id).execute()
        
        if not order_response.data:
            return {"error": "Order not found"}
        
        order = order_response.data[0]
        
        # Get customer info
        customer_name = None
        customer_phone = None
        if order.get("customer_id"):
            try:
                customer_response = supabase_admin.table("users").select("full_name, phone").eq("id", order["customer_id"]).execute()
                if customer_response.data:
                    customer_name = customer_response.data[0].get("full_name")
                    customer_phone = customer_response.data[0].get("phone")
            except Exception as e:
                print(f"Could not fetch customer info: {e}")
        
        # Create bill
        bill_record = {
            "bill_number": f"BILL-{order.get('order_number', order_id)}",
            "location_type": order.get("location_type", "table"),
            "table_number": order.get("location") if order.get("location_type") == "table" else None,
            "room_number": order.get("location") if order.get("location_type") == "room" else None,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "subtotal": order.get("subtotal", order.get("total_amount", 0)),
            "tax": order.get("tax", 0),
            "total_amount": order.get("total_amount", 0),
            "payment_status": "unpaid",
            "paid_at": None,
            "settled_by_waiter_id": current_user.get("id"),
            "notes": f"Manually created bill for order {order.get('order_number')}"
        }
        
        print(f"Creating bill with data: {bill_record}")
        bill_response = supabase_admin.table("bills").insert(bill_record).execute()
        
        if bill_response.data:
            return {
                "success": True,
                "message": "Bill created successfully",
                "bill": bill_response.data[0]
            }
        else:
            return {
                "success": False,
                "message": "Failed to create bill - no data returned"
            }
    
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
