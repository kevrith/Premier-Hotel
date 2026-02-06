"""
Combined Checkout Endpoint
Handles payment for both room charges and F&B bills together
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from typing import Optional, List
from datetime import datetime
from app.core.supabase import get_supabase_admin
from app.middleware.auth_secure import require_staff
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()

class CheckoutItem(BaseModel):
    type: str  # 'room' or 'food'
    id: str
    description: str
    amount: float

class CombinedCheckoutRequest(BaseModel):
    room_number: str
    payment_method: str  # 'cash', 'mpesa', 'card'
    mpesa_phone: Optional[str] = None
    card_reference: Optional[str] = None
    notes: Optional[str] = None

class CombinedCheckoutResponse(BaseModel):
    success: bool
    message: str
    total_amount: float
    room_charge: float
    food_charge: float
    items: List[CheckoutItem]
    booking_id: Optional[str] = None
    waiter_id: Optional[str] = None

@router.get("/room-folio/{room_number}")
async def get_room_folio(
    room_number: str,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """
    Get all charges for a room (booking + unpaid F&B bills)
    """
    try:
        # Extract just the room number (remove "Room " prefix if present)
        clean_room_number = room_number.replace("Room ", "").strip()
        
        print(f"[DEBUG] Fetching folio for room: {clean_room_number}")
        
        # Get active booking for this room
        # First, find the room by number
        room_response = supabase_admin.table("rooms")\
            .select("id, room_number")\
            .eq("room_number", clean_room_number)\
            .execute()
        
        print(f"[DEBUG] Room query result: {room_response.data}")
        
        booking = None
        room_charge = 0
        booking_id = None
        
        if room_response.data:
            room_id = room_response.data[0]["id"]
            
            # Now get booking for this room
            booking_response = supabase_admin.table("bookings")\
                .select("*")\
                .eq("room_id", room_id)\
                .in_("status", ["confirmed", "checked-in"])\
                .execute()
            
            print(f"[DEBUG] Booking query result: {booking_response.data}")
            
            if booking_response.data:
                booking = booking_response.data[0]
                booking_id = booking["id"]
                # Calculate room charge (total - paid)
                total = float(booking.get("total_amount", 0))
                paid = float(booking.get("paid_amount", 0))
                room_charge = total - paid
        
        # Get unpaid F&B bills for this room
        # Try multiple formats: "101", "Room 101", etc.
        bills_response = supabase_admin.table("bills")\
            .select("*")\
            .eq("payment_status", "unpaid")\
            .execute()
        
        print(f"[DEBUG] All unpaid bills: {bills_response.data}")
        
        # Filter bills that match this room (handle different formats)
        food_bills = []
        if bills_response.data:
            for bill in bills_response.data:
                bill_room = str(bill.get("room_number", "")).strip()
                # Match "101", "Room 101", "room 101", etc.
                if (bill_room == clean_room_number or 
                    bill_room.lower() == f"room {clean_room_number}".lower() or
                    bill_room.replace("Room ", "").replace("room ", "") == clean_room_number):
                    food_bills.append(bill)
        
        print(f"[DEBUG] Filtered bills for room {clean_room_number}: {food_bills}")
        
        food_charge = sum(float(bill.get("total_amount", 0)) for bill in food_bills)
        
        print(f"[DEBUG] Room charge: {room_charge}, Food charge: {food_charge}")
        
        # Build items list
        items = []
        
        if booking and room_charge > 0:
            items.append({
                "type": "room",
                "id": booking_id,
                "description": f"Room {clean_room_number} - {booking.get('check_in_date')} to {booking.get('check_out_date')}",
                "amount": room_charge
            })
        
        for bill in food_bills:
            items.append({
                "type": "food",
                "id": bill["id"],
                "description": f"F&B Bill {bill.get('bill_number', 'N/A')}",
                "amount": float(bill.get("total_amount", 0))
            })
        
        return {
            "success": True,
            "room_number": clean_room_number,
            "booking_id": booking_id,
            "room_charge": room_charge,
            "food_charge": food_charge,
            "total_amount": room_charge + food_charge,
            "items": items
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to fetch room folio: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch room folio: {str(e)}"
        )

@router.post("/combined-checkout", response_model=CombinedCheckoutResponse)
async def process_combined_checkout(
    checkout_data: CombinedCheckoutRequest,
    current_user: dict = Depends(require_staff),
    supabase_admin: Client = Depends(get_supabase_admin)
):
    """
    Process payment for both room and F&B charges together
    Properly attributes F&B revenue to waiter
    """
    try:
        clean_room_number = checkout_data.room_number.replace("Room ", "").strip()
        
        # Get folio first
        folio_response = await get_room_folio(clean_room_number, current_user, supabase_admin)
        
        if folio_response["total_amount"] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No outstanding charges for this room"
            )
        
        room_charge = folio_response["room_charge"]
        food_charge = folio_response["food_charge"]
        booking_id = folio_response["booking_id"]
        
        # Update booking payment if there's a room charge
        if booking_id and room_charge > 0:
            booking_response = supabase_admin.table("bookings")\
                .select("total_amount, paid_amount")\
                .eq("id", booking_id)\
                .execute()
            
            if booking_response.data:
                booking = booking_response.data[0]
                current_paid = float(booking.get("paid_amount", 0))
                new_paid = current_paid + room_charge
                total = float(booking.get("total_amount", 0))
                
                # Update booking
                supabase_admin.table("bookings").update({
                    "paid_amount": new_paid,
                    "payment_status": "paid" if new_paid >= total else "partial",
                    "payment_method": checkout_data.payment_method,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", booking_id).execute()
        
        # Update F&B bills to paid and attribute to waiter
        if food_charge > 0:
            bills_response = supabase_admin.table("bills")\
                .select("*")\
                .eq("room_number", clean_room_number)\
                .eq("payment_status", "unpaid")\
                .execute()
            
            for bill in bills_response.data:
                supabase_admin.table("bills").update({
                    "payment_status": "paid",
                    "paid_at": datetime.utcnow().isoformat(),
                    "settled_by_waiter_id": current_user.get("id"),
                    "notes": f"Paid via combined checkout. Method: {checkout_data.payment_method.upper()}. {checkout_data.notes or ''}"
                }).eq("id", bill["id"]).execute()
        
        return CombinedCheckoutResponse(
            success=True,
            message=f"Payment of KES {folio_response['total_amount']:,.2f} processed successfully",
            total_amount=folio_response["total_amount"],
            room_charge=room_charge,
            food_charge=food_charge,
            items=folio_response["items"],
            booking_id=booking_id,
            waiter_id=current_user.get("id")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Checkout processing failed: {str(e)}"
        )
