"""
Booking Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import Optional, List
from app.core.supabase import get_supabase
from app.schemas.booking import (
    BookingCreate,
    BookingUpdate,
    BookingResponse,
    BookingCancel,
    BookingCheckIn,
    BookingCheckOut,
)
from app.middleware.auth import get_current_user, require_staff
from datetime import datetime
import random
import string

router = APIRouter()


def generate_booking_reference() -> str:
    """Generate a unique booking reference"""
    prefix = "BK"
    random_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}{random_part}"


@router.get("/", response_model=List[BookingResponse])
async def get_all_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """
    Get all bookings (Staff only)

    - Returns all bookings with optional status filter
    """
    try:
        query = supabase.table("bookings").select("*")

        if status:
            query = query.eq("status", status)

        query = query.range(skip, skip + limit - 1).order("created_at", desc=True)

        response = query.execute()
        return [BookingResponse(**booking) for booking in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/my-bookings", response_model=List[BookingResponse])
async def get_my_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get current user's bookings

    - Returns bookings for the authenticated user
    """
    try:
        response = (
            supabase.table("bookings")
            .select("*")
            .eq("customer_id", current_user["id"])
            .range(skip, skip + limit - 1)
            .order("created_at", desc=True)
            .execute()
        )

        return [BookingResponse(**booking) for booking in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Get booking by ID

    - Returns booking details
    - Users can only see their own bookings, staff can see all
    """
    try:
        response = supabase.table("bookings").select("*").eq("id", booking_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        booking = response.data[0]

        # Check access permissions
        if booking["customer_id"] != current_user["id"] and current_user["role"] not in [
            "admin",
            "manager",
            "cleaner",
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this booking",
            )

        return BookingResponse(**booking)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Create a new booking

    - Creates a booking for the authenticated user
    - Checks room availability before booking
    """
    try:
        # Validate dates
        if booking_data.check_out_date <= booking_data.check_in_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out date must be after check-in date",
            )

        # Check room exists
        room_response = (
            supabase.table("rooms").select("*").eq("id", booking_data.room_id).execute()
        )

        if not room_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found",
            )

        room = room_response.data[0]

        # Check room capacity
        if booking_data.total_guests > room["max_occupancy"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room can accommodate max {room['max_occupancy']} guests",
            )

        # Check availability using database function
        availability_response = supabase.rpc(
            "check_room_availability",
            {
                "p_room_id": booking_data.room_id,
                "p_check_in": str(booking_data.check_in_date),
                "p_check_out": str(booking_data.check_out_date),
            },
        ).execute()

        if not availability_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room is not available for the selected dates",
            )

        # Calculate total amount
        days = (booking_data.check_out_date - booking_data.check_in_date).days
        subtotal = float(room["base_price"]) * days
        tax = subtotal * 0.16  # 16% tax
        total_amount = subtotal + tax

        # Generate booking reference
        booking_reference = generate_booking_reference()

        # Create booking
        booking_dict = {
            "booking_reference": booking_reference,
            "customer_id": current_user["id"],
            "room_id": booking_data.room_id,
            "check_in_date": str(booking_data.check_in_date),
            "check_out_date": str(booking_data.check_out_date),
            "status": "pending",
            "total_amount": total_amount,
            "guest_info": booking_data.guest_info.model_dump(),
            "pricing": {
                "base_price": float(room["base_price"]),
                "days": days,
                "subtotal": subtotal,
                "tax": tax,
                "total": total_amount,
            },
            "total_guests": booking_data.total_guests,
            "special_requests": booking_data.special_requests,
            "payment_status": "pending",
        }

        response = supabase.table("bookings").insert(booking_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create booking",
            )

        return BookingResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: str,
    booking_data: BookingUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Update booking

    - Users can update their own pending bookings
    - Staff can update any booking
    """
    try:
        # Get existing booking
        existing_response = (
            supabase.table("bookings").select("*").eq("id", booking_id).execute()
        )

        if not existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        booking = existing_response.data[0]

        # Check permissions
        if booking["customer_id"] != current_user["id"] and current_user["role"] not in [
            "admin",
            "manager",
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this booking",
            )

        # Users can only update pending bookings
        if (
            booking["customer_id"] == current_user["id"]
            and booking["status"] != "pending"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update pending bookings",
            )

        # Prepare update data
        update_data = booking_data.model_dump(exclude_unset=True)

        if not update_data:
            return BookingResponse(**booking)

        # If dates are being updated, recheck availability
        if "check_in_date" in update_data or "check_out_date" in update_data:
            check_in = update_data.get("check_in_date", booking["check_in_date"])
            check_out = update_data.get("check_out_date", booking["check_out_date"])

            if check_out <= check_in:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Check-out date must be after check-in date",
                )

            # Convert dates to strings for the RPC call
            availability_response = supabase.rpc(
                "check_room_availability",
                {
                    "p_room_id": booking["room_id"],
                    "p_check_in": str(check_in),
                    "p_check_out": str(check_out),
                },
            ).execute()

            if not availability_response.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Room is not available for the new dates",
                )

        # Convert guest_info to dict if present
        if "guest_info" in update_data and update_data["guest_info"]:
            update_data["guest_info"] = update_data["guest_info"].model_dump()

        # Update booking
        response = (
            supabase.table("bookings").update(update_data).eq("id", booking_id).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update booking",
            )

        return BookingResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: str,
    cancel_data: BookingCancel,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Cancel booking

    - Users can cancel their own bookings
    - Staff can cancel any booking
    """
    try:
        # Get booking
        response = supabase.table("bookings").select("*").eq("id", booking_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        booking = response.data[0]

        # Check permissions
        if booking["customer_id"] != current_user["id"] and current_user["role"] not in [
            "admin",
            "manager",
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to cancel this booking",
            )

        # Check if already cancelled or completed
        if booking["status"] in ["cancelled", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel {booking['status']} booking",
            )

        # Cancel booking
        update_data = {
            "status": "cancelled",
            "cancelled_at": datetime.utcnow().isoformat(),
            "cancellation_reason": cancel_data.reason,
        }

        response = (
            supabase.table("bookings").update(update_data).eq("id", booking_id).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel booking",
            )

        return BookingResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/{booking_id}/check-in", response_model=BookingResponse)
async def check_in(
    booking_id: str,
    check_in_data: BookingCheckIn,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """
    Check in guest (Staff only)

    - Marks booking as checked in
    - Updates room status to occupied
    """
    try:
        # Get booking
        response = supabase.table("bookings").select("*").eq("id", booking_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        booking = response.data[0]

        # Check if booking is confirmed
        if booking["status"] != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only confirmed bookings can be checked in",
            )

        # Update booking status
        update_data = {
            "status": "checked_in",
            "checked_in_at": datetime.utcnow().isoformat(),
            "checked_in_by": current_user["id"],
            "check_in_notes": check_in_data.notes,
        }

        booking_response = (
            supabase.table("bookings").update(update_data).eq("id", booking_id).execute()
        )

        # Update room status to occupied
        supabase.table("rooms").update({"status": "occupied"}).eq(
            "id", booking["room_id"]
        ).execute()

        return BookingResponse(**booking_response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/{booking_id}/check-out", response_model=BookingResponse)
async def check_out(
    booking_id: str,
    check_out_data: BookingCheckOut,
    current_user: dict = Depends(require_staff),
    supabase: Client = Depends(get_supabase),
):
    """
    Check out guest (Staff only)

    - Marks booking as completed
    - Updates room status to maintenance or available
    """
    try:
        # Get booking
        response = supabase.table("bookings").select("*").eq("id", booking_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found",
            )

        booking = response.data[0]

        # Check if booking is checked in
        if booking["status"] != "checked_in":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only checked-in bookings can be checked out",
            )

        # Calculate final amount if there are additional charges
        final_amount = booking["total_amount"]
        if check_out_data.additional_charges:
            final_amount += float(check_out_data.additional_charges)

        # Update booking status
        update_data = {
            "status": "completed",
            "checked_out_at": datetime.utcnow().isoformat(),
            "checked_out_by": current_user["id"],
            "check_out_notes": check_out_data.notes,
            "damages": check_out_data.damages,
            "total_amount": final_amount,
        }

        booking_response = (
            supabase.table("bookings").update(update_data).eq("id", booking_id).execute()
        )

        # Update room status
        new_room_status = "maintenance" if check_out_data.damages else "available"
        supabase.table("rooms").update({"status": new_room_status}).eq(
            "id", booking["room_id"]
        ).execute()

        # If there are damages, create a maintenance issue
        if check_out_data.damages:
            maintenance_data = {
                "room_id": booking["room_id"],
                "reported_by": current_user["id"],
                "issue": check_out_data.damages,
                "priority": "high",
                "status": "pending",
            }
            supabase.table("maintenance_issues").insert(maintenance_data).execute()

        return BookingResponse(**booking_response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
