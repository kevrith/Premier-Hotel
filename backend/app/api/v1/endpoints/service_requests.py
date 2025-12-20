"""
Service Requests API Endpoints
Handles all service request operations for guests and staff
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from typing import List, Optional
from datetime import datetime, timedelta
import random
import string

from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user, require_role
from app.schemas.service_requests import (
    ServiceRequestTypeCreate,
    ServiceRequestTypeUpdate,
    ServiceRequestTypeResponse,
    ServiceRequestCreate,
    ServiceRequestUpdate,
    ServiceRequestAssign,
    ServiceRequestStart,
    ServiceRequestComplete,
    ServiceRequestCancel,
    ServiceRequestFeedback,
    ServiceRequestResponse,
    ServiceRequestWithDetails,
    ServiceRequestStatusHistoryResponse,
    ServiceRequestAttachmentCreate,
    ServiceRequestAttachmentResponse,
    ServiceRequestCommentCreate,
    ServiceRequestCommentUpdate,
    ServiceRequestCommentResponse,
    ServiceRequestStats,
    ServiceRequestDashboard,
)

router = APIRouter()


# =====================================================
# Helper Functions
# =====================================================

def generate_request_number() -> str:
    """Generate unique request number (e.g., SR-2024-001234)"""
    year = datetime.now().year
    random_digits = ''.join(random.choices(string.digits, k=6))
    return f"SR-{year}-{random_digits}"


# =====================================================
# Service Request Types Endpoints
# =====================================================

@router.get("/types", response_model=List[ServiceRequestTypeResponse])
async def get_service_request_types(
    category: Optional[str] = Query(None, pattern="^(room_service|housekeeping|maintenance|concierge|amenities|other)$"),
    is_active: Optional[bool] = Query(True),
    supabase: Client = Depends(get_supabase)
):
    """Get all service request types"""
    try:
        query = supabase.table("service_request_types").select("*")

        if category:
            query = query.eq("category", category)
        if is_active is not None:
            query = query.eq("is_active", is_active)

        query = query.order("display_order")
        result = query.execute()

        return [ServiceRequestTypeResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching service request types: {str(e)}")


@router.post("/types", response_model=ServiceRequestTypeResponse)
async def create_service_request_type(
    request_type: ServiceRequestTypeCreate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Create a new service request type (Admin/Manager only)"""
    try:
        request_type_data = request_type.model_dump()
        result = supabase.table("service_request_types").insert(request_type_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create service request type")

        return ServiceRequestTypeResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating service request type: {str(e)}")


@router.patch("/types/{type_id}", response_model=ServiceRequestTypeResponse)
async def update_service_request_type(
    type_id: str,
    updates: ServiceRequestTypeUpdate,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Update a service request type (Admin/Manager only)"""
    try:
        update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        result = supabase.table("service_request_types").update(update_data).eq("id", type_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request type not found")

        return ServiceRequestTypeResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating service request type: {str(e)}")


@router.delete("/types/{type_id}")
async def delete_service_request_type(
    type_id: str,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase)
):
    """Delete a service request type (Admin/Manager only)"""
    try:
        result = supabase.table("service_request_types").delete().eq("id", type_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request type not found")

        return {"message": "Service request type deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting service request type: {str(e)}")


# =====================================================
# Service Requests Endpoints
# =====================================================

@router.get("/", response_model=List[ServiceRequestResponse])
async def get_service_requests(
    status: Optional[str] = Query(None, pattern="^(pending|assigned|in_progress|completed|cancelled|rejected)$"),
    category: Optional[str] = Query(None, pattern="^(room_service|housekeeping|maintenance|concierge|amenities|other)$"),
    priority: Optional[str] = Query(None, pattern="^(low|normal|high|urgent)$"),
    guest_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    room_id: Optional[str] = None,
    is_urgent: Optional[bool] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get service requests with filters"""
    try:
        query = supabase.table("service_requests").select("*")

        # Apply role-based filtering
        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer":
            # Guests only see their own requests
            query = query.eq("guest_id", current_user["id"])
        elif user_role in ["staff", "cleaner"]:
            # Staff see assigned requests or unassigned
            if not assigned_to:
                query = query.or_(f"assigned_to.eq.{current_user['id']},assigned_to.is.null")
        # Admins and managers see all requests

        # Apply filters
        if status:
            query = query.eq("status", status)
        if category:
            query = query.eq("category", category)
        if priority:
            query = query.eq("priority", priority)
        if guest_id:
            query = query.eq("guest_id", guest_id)
        if assigned_to:
            query = query.eq("assigned_to", assigned_to)
        if room_id:
            query = query.eq("room_id", room_id)
        if is_urgent is not None:
            query = query.eq("is_urgent", is_urgent)
        if from_date:
            query = query.gte("requested_at", from_date.isoformat())
        if to_date:
            query = query.lte("requested_at", to_date.isoformat())

        # Pagination and sorting
        query = query.order("requested_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()

        return [ServiceRequestResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching service requests: {str(e)}")


@router.get("/{request_id}", response_model=ServiceRequestResponse)
async def get_service_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific service request by ID"""
    try:
        result = supabase.table("service_requests").select("*").eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        request_data = result.data[0]

        # Check access permissions
        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer" and request_data["guest_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        return ServiceRequestResponse(**request_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching service request: {str(e)}")


@router.post("/", response_model=ServiceRequestResponse)
async def create_service_request(
    request: ServiceRequestCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create a new service request"""
    try:
        # Ensure guest_id matches current user for customers
        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer" and request.guest_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Cannot create requests for other users")

        request_data = request.model_dump()
        request_data["request_number"] = generate_request_number()
        request_data["status"] = "pending"
        request_data["requested_at"] = datetime.now().isoformat()

        result = supabase.table("service_requests").insert(request_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create service request")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating service request: {str(e)}")


@router.patch("/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: str,
    updates: ServiceRequestUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update a service request"""
    try:
        # Get existing request
        existing = supabase.table("service_requests").select("*").eq("id", request_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        request_data = existing.data[0]

        # Check permissions
        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer":
            if request_data["guest_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            if request_data["status"] != "pending":
                raise HTTPException(status_code=400, detail="Can only update pending requests")

        update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        result = supabase.table("service_requests").update(update_data).eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating service request: {str(e)}")


@router.patch("/{request_id}/assign", response_model=ServiceRequestResponse)
async def assign_service_request(
    request_id: str,
    assignment: ServiceRequestAssign,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Assign a service request to a staff member"""
    try:
        update_data = {
            "assigned_to": assignment.assigned_to,
            "assigned_by": assignment.assigned_by or current_user["id"],
            "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else datetime.now().isoformat(),
            "status": "assigned"
        }

        result = supabase.table("service_requests").update(update_data).eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error assigning service request: {str(e)}")


@router.patch("/{request_id}/start", response_model=ServiceRequestResponse)
async def start_service_request(
    request_id: str,
    start_data: ServiceRequestStart,
    current_user: dict = Depends(require_role(["admin", "manager", "staff", "cleaner"])),
    supabase: Client = Depends(get_supabase)
):
    """Mark a service request as in progress"""
    try:
        # Get existing request
        existing = supabase.table("service_requests").select("*").eq("id", request_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        request_data = existing.data[0]

        # Verify staff is assigned to this request
        if request_data["assigned_to"] != current_user["id"]:
            user_role = current_user.get("user_metadata", {}).get("role", "customer")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="You are not assigned to this request")

        update_data = {
            "started_at": start_data.started_at.isoformat() if start_data.started_at else datetime.now().isoformat(),
            "status": "in_progress"
        }

        result = supabase.table("service_requests").update(update_data).eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error starting service request: {str(e)}")


@router.patch("/{request_id}/complete", response_model=ServiceRequestResponse)
async def complete_service_request(
    request_id: str,
    completion_data: ServiceRequestComplete,
    current_user: dict = Depends(require_role(["admin", "manager", "staff", "cleaner"])),
    supabase: Client = Depends(get_supabase)
):
    """Mark a service request as completed"""
    try:
        # Get existing request
        existing = supabase.table("service_requests").select("*").eq("id", request_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        request_data = existing.data[0]

        # Verify staff is assigned to this request
        if request_data["assigned_to"] != current_user["id"]:
            user_role = current_user.get("user_metadata", {}).get("role", "customer")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="You are not assigned to this request")

        update_data = {
            "completed_at": completion_data.completed_at.isoformat() if completion_data.completed_at else datetime.now().isoformat(),
            "status": "completed"
        }

        if completion_data.actual_duration is not None:
            update_data["actual_duration"] = completion_data.actual_duration
        if completion_data.resolution_notes:
            update_data["resolution_notes"] = completion_data.resolution_notes
        if completion_data.staff_notes:
            update_data["staff_notes"] = completion_data.staff_notes

        result = supabase.table("service_requests").update(update_data).eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error completing service request: {str(e)}")


@router.patch("/{request_id}/cancel", response_model=ServiceRequestResponse)
async def cancel_service_request(
    request_id: str,
    cancel_data: ServiceRequestCancel,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Cancel a service request"""
    try:
        # Get existing request
        existing = supabase.table("service_requests").select("*").eq("id", request_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        request_data = existing.data[0]

        # Check permissions
        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer" and request_data["guest_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = {
            "status": "cancelled",
            "resolution_notes": cancel_data.resolution_notes
        }

        result = supabase.table("service_requests").update(update_data).eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error cancelling service request: {str(e)}")


@router.post("/{request_id}/feedback", response_model=ServiceRequestResponse)
async def submit_service_request_feedback(
    request_id: str,
    feedback: ServiceRequestFeedback,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Submit feedback for a completed service request"""
    try:
        # Get existing request
        existing = supabase.table("service_requests").select("*").eq("id", request_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        request_data = existing.data[0]

        # Verify guest owns this request
        if request_data["guest_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Verify request is completed
        if request_data["status"] != "completed":
            raise HTTPException(status_code=400, detail="Can only provide feedback for completed requests")

        update_data = {
            "guest_feedback": feedback.guest_feedback,
            "rating": feedback.rating
        }

        result = supabase.table("service_requests").update(update_data).eq("id", request_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        return ServiceRequestResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error submitting feedback: {str(e)}")


# =====================================================
# Status History Endpoints
# =====================================================

@router.get("/{request_id}/history", response_model=List[ServiceRequestStatusHistoryResponse])
async def get_service_request_history(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get status history for a service request"""
    try:
        # Verify access to the request
        request_result = supabase.table("service_requests").select("guest_id").eq("id", request_id).execute()
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer" and request_result.data[0]["guest_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        result = supabase.table("service_request_status_history").select("*").eq("request_id", request_id).order("changed_at", desc=True).execute()

        return [ServiceRequestStatusHistoryResponse(**item) for item in result.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching status history: {str(e)}")


# =====================================================
# Attachments Endpoints
# =====================================================

@router.post("/{request_id}/attachments", response_model=ServiceRequestAttachmentResponse)
async def add_service_request_attachment(
    request_id: str,
    attachment: ServiceRequestAttachmentCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Add an attachment to a service request"""
    try:
        # Verify access to the request
        request_result = supabase.table("service_requests").select("guest_id").eq("id", request_id).execute()
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer" and request_result.data[0]["guest_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        attachment_data = attachment.model_dump()
        attachment_data["uploaded_by"] = current_user["id"]

        result = supabase.table("service_request_attachments").insert(attachment_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add attachment")

        return ServiceRequestAttachmentResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error adding attachment: {str(e)}")


@router.get("/{request_id}/attachments", response_model=List[ServiceRequestAttachmentResponse])
async def get_service_request_attachments(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get all attachments for a service request"""
    try:
        # Verify access to the request
        request_result = supabase.table("service_requests").select("guest_id").eq("id", request_id).execute()
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer" and request_result.data[0]["guest_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        result = supabase.table("service_request_attachments").select("*").eq("request_id", request_id).order("created_at", desc=True).execute()

        return [ServiceRequestAttachmentResponse(**item) for item in result.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attachments: {str(e)}")


# =====================================================
# Comments Endpoints
# =====================================================

@router.post("/{request_id}/comments", response_model=ServiceRequestCommentResponse)
async def add_service_request_comment(
    request_id: str,
    comment: ServiceRequestCommentCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Add a comment to a service request"""
    try:
        # Verify access to the request
        request_result = supabase.table("service_requests").select("guest_id").eq("id", request_id).execute()
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")
        if user_role == "customer":
            if request_result.data[0]["guest_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            # Customers cannot create internal comments
            if comment.is_internal:
                raise HTTPException(status_code=403, detail="Cannot create internal comments")

        comment_data = comment.model_dump()
        comment_data["user_id"] = current_user["id"]

        result = supabase.table("service_request_comments").insert(comment_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add comment")

        return ServiceRequestCommentResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error adding comment: {str(e)}")


@router.get("/{request_id}/comments", response_model=List[ServiceRequestCommentResponse])
async def get_service_request_comments(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get all comments for a service request"""
    try:
        # Verify access to the request
        request_result = supabase.table("service_requests").select("guest_id").eq("id", request_id).execute()
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Service request not found")

        user_role = current_user.get("user_metadata", {}).get("role", "customer")

        query = supabase.table("service_request_comments").select("*").eq("request_id", request_id)

        # Customers only see non-internal comments
        if user_role == "customer":
            if request_result.data[0]["guest_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied")
            query = query.eq("is_internal", False)

        result = query.order("created_at", desc=False).execute()

        return [ServiceRequestCommentResponse(**item) for item in result.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")


# =====================================================
# Statistics Endpoints
# =====================================================

@router.get("/stats/overview", response_model=ServiceRequestStats)
async def get_service_request_stats(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """Get overall service request statistics"""
    try:
        # Build query
        query = supabase.table("service_requests").select("*")

        if from_date:
            query = query.gte("requested_at", from_date.isoformat())
        if to_date:
            query = query.lte("requested_at", to_date.isoformat())

        result = query.execute()
        requests = result.data

        # Calculate statistics
        total = len(requests)
        pending = len([r for r in requests if r["status"] == "pending"])
        in_progress = len([r for r in requests if r["status"] == "in_progress"])
        completed = len([r for r in requests if r["status"] == "completed"])
        cancelled = len([r for r in requests if r["status"] == "cancelled"])
        urgent = len([r for r in requests if r.get("is_urgent", False)])

        # Calculate average completion time
        completed_with_time = [r for r in requests if r["status"] == "completed" and r.get("actual_duration")]
        avg_completion = sum(r["actual_duration"] for r in completed_with_time) / len(completed_with_time) if completed_with_time else None

        # Calculate average rating
        rated = [r for r in requests if r.get("rating")]
        avg_rating = sum(r["rating"] for r in rated) / len(rated) if rated else None

        # Requests by category
        by_category = {}
        for r in requests:
            cat = r.get("category", "other")
            by_category[cat] = by_category.get(cat, 0) + 1

        # Requests by priority
        by_priority = {}
        for r in requests:
            pri = r.get("priority", "normal")
            by_priority[pri] = by_priority.get(pri, 0) + 1

        # Completion rate
        completion_rate = (completed / total * 100) if total > 0 else 0.0

        return ServiceRequestStats(
            total_requests=total,
            pending_requests=pending,
            in_progress_requests=in_progress,
            completed_requests=completed,
            cancelled_requests=cancelled,
            urgent_requests=urgent,
            average_completion_time=avg_completion,
            average_rating=avg_rating,
            requests_by_category=by_category,
            requests_by_priority=by_priority,
            completion_rate=completion_rate
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating statistics: {str(e)}")


@router.get("/stats/my-requests", response_model=List[ServiceRequestResponse])
async def get_my_service_requests(
    status: Optional[str] = Query(None, pattern="^(pending|assigned|in_progress|completed|cancelled|rejected)$"),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's service requests"""
    try:
        query = supabase.table("service_requests").select("*").eq("guest_id", current_user["id"])

        if status:
            query = query.eq("status", status)

        query = query.order("requested_at", desc=True).limit(limit)
        result = query.execute()

        return [ServiceRequestResponse(**item) for item in result.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching your requests: {str(e)}")
