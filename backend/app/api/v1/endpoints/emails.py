"""
Email Management Endpoints
Endpoints for processing email queue and sending emails
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.core.dependencies import get_supabase_client, require_role
from app.services.email_queue_processor import (
    process_email_queue,
    queue_booking_confirmation_email,
    queue_payment_receipt_email,
    queue_order_confirmation_email
)
from pydantic import BaseModel, EmailStr
from typing import Dict, Any

router = APIRouter()


class EmailStatsResponse(BaseModel):
    total_queued: int
    pending: int
    sent: int
    failed: int


@router.post("/process-queue")
async def process_queue(
    limit: int = 10,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Process pending emails in the queue (Admin/Manager only)

    This endpoint processes emails that are waiting in the queue.
    It's typically called by a scheduled task or manually by admins.
    """
    try:
        processed_count = await process_email_queue(supabase, limit=limit)

        return {
            "success": True,
            "processed_count": processed_count,
            "message": f"Processed {processed_count} emails"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing email queue: {str(e)}")


@router.get("/stats", response_model=EmailStatsResponse)
async def get_email_stats(
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_client)
):
    """Get email queue statistics (Admin/Manager only)"""
    try:
        # Get counts by status
        pending_result = supabase.table("email_queue").select("id", count="exact").eq("status", "pending").execute()
        sent_result = supabase.table("email_queue").select("id", count="exact").eq("status", "sent").execute()
        failed_result = supabase.table("email_queue").select("id", count="exact").eq("status", "failed").execute()
        total_result = supabase.table("email_queue").select("id", count="exact").execute()

        return EmailStatsResponse(
            total_queued=total_result.count or 0,
            pending=pending_result.count or 0,
            sent=sent_result.count or 0,
            failed=failed_result.count or 0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching email stats: {str(e)}")


@router.get("/queue")
async def get_email_queue(
    status: str = None,
    limit: int = 50,
    current_user: dict = Depends(require_role(["admin", "manager"])),
    supabase: Client = Depends(get_supabase_client)
):
    """Get emails from the queue (Admin/Manager only)"""
    try:
        query = supabase.table("email_queue").select("*").limit(limit).order("created_at", desc=True)

        if status:
            query = query.eq("status", status)

        result = query.execute()

        return {
            "success": True,
            "emails": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching email queue: {str(e)}")


class QueueEmailRequest(BaseModel):
    to_email: EmailStr
    email_type: str  # booking_confirmation, payment_receipt, order_confirmation
    data: Dict[str, Any]


@router.post("/queue")
async def queue_email(
    request: QueueEmailRequest,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Manually queue an email for sending (Staff/Admin/Manager)

    Useful for re-sending confirmations or testing email templates.
    """
    try:
        success = False

        if request.email_type == "booking_confirmation":
            success = await queue_booking_confirmation_email(supabase, request.to_email, request.data)
        elif request.email_type == "payment_receipt":
            success = await queue_payment_receipt_email(supabase, request.to_email, request.data)
        elif request.email_type == "order_confirmation":
            success = await queue_order_confirmation_email(supabase, request.to_email, request.data)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown email type: {request.email_type}")

        if success:
            return {
                "success": True,
                "message": f"Email queued successfully to {request.to_email}"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to queue email")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error queuing email: {str(e)}")


@router.delete("/queue/{email_id}")
async def delete_queued_email(
    email_id: str,
    current_user: dict = Depends(require_role(["admin"])),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete an email from the queue (Admin only)"""
    try:
        result = supabase.table("email_queue").delete().eq("id", email_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Email not found in queue")

        return {
            "success": True,
            "message": "Email deleted from queue"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting email: {str(e)}")


@router.post("/retry-failed")
async def retry_failed_emails(
    current_user: dict = Depends(require_role(["admin"])),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Retry all failed emails (Admin only)

    Resets failed emails to pending status so they can be processed again.
    """
    try:
        result = supabase.table("email_queue").update({
            "status": "pending",
            "error_message": None
        }).eq("status", "failed").execute()

        count = len(result.data) if result.data else 0

        return {
            "success": True,
            "message": f"Reset {count} failed emails to pending status"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrying failed emails: {str(e)}")
