"""
Room Management Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import Optional, List
from app.core.supabase import get_supabase, get_supabase_admin
from app.schemas.room import (
    RoomCreate,
    RoomUpdate,
    RoomResponse,
    AvailabilityCheck,
    AvailabilityResponse,
)
from app.middleware.auth_secure import get_current_user, require_admin
from datetime import date

router = APIRouter()


@router.get("/", response_model=List[RoomResponse])
async def get_rooms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    room_type: Optional[str] = None,
    room_status: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Get all rooms with optional filters

    - Supports pagination, type filtering, status filtering, and price range
    """
    try:
        query = supabase.table("rooms").select("*")

        # Apply filters
        if room_type:
            query = query.eq("type", room_type)
        if room_status:
            query = query.eq("status", room_status)
        if min_price is not None:
            query = query.gte("base_price", min_price)
        if max_price is not None:
            query = query.lte("base_price", max_price)

        # Apply pagination
        query = query.range(skip, skip + limit - 1)

        response = query.execute()
        return [RoomResponse(**room) for room in response.data]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/available", response_model=List[RoomResponse])
async def get_available_rooms(
    check_in: date,
    check_out: date,
    guests: Optional[int] = None,
    room_type: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
):
    """
    Get available rooms for specific dates

    - Returns rooms that are available between check-in and check-out dates
    - Can filter by guest count and room type
    """
    try:
        # Get all rooms
        query = supabase.table("rooms").select("*").eq("status", "available")

        if room_type:
            query = query.eq("type", room_type)
        if guests:
            query = query.gte("max_occupancy", guests)

        rooms_response = query.execute()

        # Check availability for each room
        available_rooms = []
        for room in rooms_response.data:
            # Use database function to check availability
            availability_response = supabase.rpc(
                "check_room_availability",
                {
                    "p_room_id": room["id"],
                    "p_check_in": str(check_in),
                    "p_check_out": str(check_out),
                },
            ).execute()

            if availability_response.data:
                available_rooms.append(RoomResponse(**room))

        return available_rooms

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str, supabase: Client = Depends(get_supabase)):
    """
    Get room by ID

    - Returns detailed information about a specific room
    """
    try:
        response = supabase.table("rooms").select("*").eq("id", room_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found",
            )

        return RoomResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/{room_id}/availability", response_model=AvailabilityResponse)
async def check_availability(
    room_id: str,
    availability_data: AvailabilityCheck,
    supabase: Client = Depends(get_supabase),
):
    """
    Check room availability

    - Checks if a specific room is available for the given dates
    """
    try:
        # Check if room exists
        room_response = supabase.table("rooms").select("*").eq("id", room_id).execute()

        if not room_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found",
            )

        room = room_response.data[0]

        # Check guest count
        if availability_data.guests and availability_data.guests > room["max_occupancy"]:
            return AvailabilityResponse(
                available=False,
                room_id=room_id,
                check_in=availability_data.check_in,
                check_out=availability_data.check_out,
                message=f"Room can accommodate max {room['max_occupancy']} guests",
            )

        # Use database function to check availability
        availability_response = supabase.rpc(
            "check_room_availability",
            {
                "p_room_id": room_id,
                "p_check_in": str(availability_data.check_in),
                "p_check_out": str(availability_data.check_out),
            },
        ).execute()

        is_available = availability_response.data

        return AvailabilityResponse(
            available=is_available,
            room_id=room_id,
            check_in=availability_data.check_in,
            check_out=availability_data.check_out,
            message="Room is available" if is_available else "Room is not available",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    current_user: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Create a new room (Admin only)

    - Creates a new room in the system
    """
    try:
        # Check if room number already exists
        existing = (
            supabase.table("rooms")
            .select("id")
            .eq("room_number", room_data.room_number)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room number already exists",
            )

        # Create room - convert Decimal to float for JSON serialization
        from decimal import Decimal
        room_dict = room_data.model_dump()
        # Convert Decimal fields to float
        if 'base_price' in room_dict and isinstance(room_dict['base_price'], Decimal):
            room_dict['base_price'] = float(room_dict['base_price'])

        response = supabase.table("rooms").insert(room_dict).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create room",
            )

        return RoomResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    room_data: RoomUpdate,
    current_user: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Update room (Admin only)

    - Updates room information
    """
    try:
        # Check if room exists
        existing = supabase.table("rooms").select("id").eq("id", room_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found",
            )

        # Prepare update data
        from decimal import Decimal
        update_data = room_data.model_dump(exclude_unset=True)

        if not update_data:
            # Return existing room if no updates
            response = supabase.table("rooms").select("*").eq("id", room_id).execute()
            return RoomResponse(**response.data[0])

        # Convert Decimal fields to float
        if 'base_price' in update_data and isinstance(update_data['base_price'], Decimal):
            update_data['base_price'] = float(update_data['base_price'])

        # Check if room number is being changed and if it already exists
        if "room_number" in update_data:
            existing_number = (
                supabase.table("rooms")
                .select("id")
                .eq("room_number", update_data["room_number"])
                .neq("id", room_id)
                .execute()
            )
            if existing_number.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Room number already exists",
                )

        # Update room
        response = (
            supabase.table("rooms").update(update_data).eq("id", room_id).execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update room",
            )

        return RoomResponse(**response.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: str,
    current_user: dict = Depends(require_admin),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Delete room (Admin only)

    - Soft deletes a room by setting status to 'inactive'
    """
    try:
        # Check if room exists
        existing = supabase.table("rooms").select("id").eq("id", room_id).execute()

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found",
            )

        # Soft delete by updating status
        supabase.table("rooms").update({"status": "inactive"}).eq("id", room_id).execute()

        return None

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
