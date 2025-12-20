"""
Check-in/Check-out API Endpoints
Handles guest check-in, check-out, and related operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user, require_role
from app.schemas.checkin_checkout import (
    GuestRegistrationCreate,
    GuestRegistrationResponse,
    CheckinCreate,
    CheckinProcess,
    CheckinComplete,
    CheckinResponse,
    CheckoutCreate,
    CheckoutProcess,
    CheckoutComplete,
    CheckoutResponse,
    CheckinCheckoutRequestCreate,
    CheckinCheckoutRequestProcess,
    CheckinCheckoutRequestResponse,
)

router = APIRouter()


# =====================================================
# Guest Registration Endpoints
# =====================================================

@router.post("/registrations", response_model=GuestRegistrationResponse)
async def create_registration(
    registration: GuestRegistrationCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create guest registration for check-in"""
    try:
        registration_data = registration.model_dump()
        registration_data["user_id"] = current_user["id"]
        registration_data["status"] = "pending"

        result = supabase.table("guest_registrations").insert(registration_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create registration")
        return GuestRegistrationResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating registration: {str(e)}")


@router.get("/registrations/{registration_id}", response_model=GuestRegistrationResponse)
async def get_registration(
    registration_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get registration details"""
    try:
        result = supabase.table("guest_registrations").select("*").eq("id", registration_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Registration not found")
        return GuestRegistrationResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching registration: {str(e)}")


# =====================================================
# Check-in Endpoints
# =====================================================

@router.post("/checkins", response_model=CheckinResponse)
async def create_checkin(
    checkin: CheckinCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Create check-in record"""
    try:
        checkin_data = checkin.model_dump()
        checkin_data["status"] = "pending"
        checkin_data["processed_by"] = current_user["id"]

        result = supabase.table("checkins").insert(checkin_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create check-in")
        return CheckinResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating check-in: {str(e)}")


@router.get("/checkins", response_model=List[CheckinResponse])
async def get_checkins(
    status: Optional[str] = None,
    booking_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get check-in records"""
    try:
        query = supabase.table("checkins").select("*")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer":
            # Get user's bookings
            bookings_result = supabase.table("bookings").select("id").eq("user_id", current_user["id"]).execute()
            booking_ids = [b["id"] for b in bookings_result.data]
            if not booking_ids:
                return []
            query = query.in_("booking_id", booking_ids)

        if status:
            query = query.eq("status", status)
        if booking_id:
            query = query.eq("booking_id", booking_id)

        query = query.order("created_at", desc=True).limit(limit)
        result = query.execute()
        return [CheckinResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching check-ins: {str(e)}")


@router.patch("/checkins/{checkin_id}/process", response_model=CheckinResponse)
async def process_checkin(
    checkin_id: str,
    process_data: CheckinProcess,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Process check-in (assign room, issue key)"""
    try:
        update_data = process_data.model_dump()
        update_data["status"] = "in_progress"
        update_data["room_assigned_at"] = datetime.now().isoformat()
        update_data["room_ready"] = True

        result = supabase.table("checkins").update(update_data).eq("id", checkin_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Check-in not found")
        return CheckinResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing check-in: {str(e)}")


@router.patch("/checkins/{checkin_id}/complete", response_model=CheckinResponse)
async def complete_checkin(
    checkin_id: str,
    complete_data: CheckinComplete,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Complete check-in"""
    try:
        update_data = {
            "actual_checkin": complete_data.actual_checkin or datetime.now().isoformat(),
            "key_card_issued": complete_data.key_card_issued,
            "key_card_issued_at": datetime.now().isoformat() if complete_data.key_card_issued else None,
            "terms_accepted": complete_data.terms_accepted,
            "terms_accepted_at": datetime.now().isoformat() if complete_data.terms_accepted else None,
            "status": "completed"
        }

        result = supabase.table("checkins").update(update_data).eq("id", checkin_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Check-in not found")
        return CheckinResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error completing check-in: {str(e)}")


# =====================================================
# Check-out Endpoints
# =====================================================

@router.post("/checkouts", response_model=CheckoutResponse)
async def create_checkout(
    checkout: CheckoutCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Create check-out record"""
    try:
        checkout_data = checkout.model_dump()
        checkout_data["status"] = "pending"
        checkout_data["processed_by"] = current_user["id"]

        result = supabase.table("checkouts").insert(checkout_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create check-out")
        return CheckoutResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating check-out: {str(e)}")


@router.get("/checkouts", response_model=List[CheckoutResponse])
async def get_checkouts(
    status: Optional[str] = None,
    booking_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get check-out records"""
    try:
        query = supabase.table("checkouts").select("*")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer":
            bookings_result = supabase.table("bookings").select("id").eq("user_id", current_user["id"]).execute()
            booking_ids = [b["id"] for b in bookings_result.data]
            if not booking_ids:
                return []
            query = query.in_("booking_id", booking_ids)

        if status:
            query = query.eq("status", status)
        if booking_id:
            query = query.eq("booking_id", booking_id)

        query = query.order("created_at", desc=True).limit(limit)
        result = query.execute()
        return [CheckoutResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching check-outs: {str(e)}")


@router.patch("/checkouts/{checkout_id}/process", response_model=CheckoutResponse)
async def process_checkout(
    checkout_id: str,
    process_data: CheckoutProcess,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Process check-out (inspect room, calculate charges)"""
    try:
        update_data = process_data.model_dump()
        update_data["status"] = "in_progress"
        update_data["room_inspected"] = True

        # Calculate total charges
        total = (
            update_data.get("damage_charges", Decimal("0")) +
            update_data.get("minibar_charges", Decimal("0")) +
            update_data.get("service_charges", Decimal("0"))
        )
        update_data["total_charges"] = float(total)

        result = supabase.table("checkouts").update(update_data).eq("id", checkout_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Check-out not found")
        return CheckoutResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing check-out: {str(e)}")


@router.patch("/checkouts/{checkout_id}/complete", response_model=CheckoutResponse)
async def complete_checkout(
    checkout_id: str,
    complete_data: CheckoutComplete,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Complete check-out"""
    try:
        update_data = {
            "actual_checkout": complete_data.actual_checkout or datetime.now().isoformat(),
            "key_card_returned": complete_data.key_card_returned,
            "key_card_returned_at": datetime.now().isoformat() if complete_data.key_card_returned else None,
            "checkout_rating": complete_data.checkout_rating,
            "checkout_feedback": complete_data.checkout_feedback,
            "payment_settled": True,
            "status": "completed"
        }

        result = supabase.table("checkouts").update(update_data).eq("id", checkout_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Check-out not found")
        return CheckoutResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error completing check-out: {str(e)}")


# =====================================================
# Early Check-in / Late Checkout Request Endpoints
# =====================================================

@router.post("/requests", response_model=CheckinCheckoutRequestResponse)
async def create_request(
    request: CheckinCheckoutRequestCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create early check-in or late checkout request"""
    try:
        request_data = request.model_dump()
        request_data["user_id"] = current_user["id"]
        request_data["status"] = "pending"

        result = supabase.table("checkin_checkout_requests").insert(request_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create request")
        return CheckinCheckoutRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating request: {str(e)}")


@router.get("/requests", response_model=List[CheckinCheckoutRequestResponse])
async def get_requests(
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get check-in/out requests"""
    try:
        query = supabase.table("checkin_checkout_requests").select("*")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer":
            query = query.eq("user_id", current_user["id"])

        if status:
            query = query.eq("status", status)
        if request_type:
            query = query.eq("request_type", request_type)

        query = query.order("created_at", desc=True)
        result = query.execute()
        return [CheckinCheckoutRequestResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching requests: {str(e)}")


@router.patch("/requests/{request_id}/process", response_model=CheckinCheckoutRequestResponse)
async def process_request(
    request_id: str,
    process_data: CheckinCheckoutRequestProcess,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Approve or reject request"""
    try:
        update_data = process_data.model_dump()
        update_data["processed_by"] = current_user["id"]
        update_data["processed_at"] = datetime.now().isoformat()

        result = supabase.table("checkin_checkout_requests").update(update_data).eq("id", request_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Request not found")
        return CheckinCheckoutRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing request: {str(e)}")
