"""
Notification System API Endpoints - Enterprise Edition
With deduplication, delivery tracking, and smart routing
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List
from datetime import datetime
from supabase import Client

from app.core.supabase import get_supabase
from app.middleware.auth_secure import get_current_user, require_role
from app.services.notification_deduplicator import should_send_notification

from app.schemas.notifications import (
    NotificationPreferencesBase, NotificationPreferencesResponse,
    NotificationCreate, NotificationResponse, NotificationUpdate,
    NotificationStats
)

router = APIRouter()


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_my_preferences(
    request: Request,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's notification preferences"""
    result = supabase.table("notification_preferences").select("*").eq("user_id", current_user["id"]).execute()

    if not result.data:
        # Create default preferences
        default_prefs = {"user_id": current_user["id"]}
        result = supabase.table("notification_preferences").insert(default_prefs).execute()

    return NotificationPreferencesResponse(**result.data[0])


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_preferences(
    preferences: NotificationPreferencesBase,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update notification preferences"""
    prefs_data = preferences.model_dump()

    result = supabase.table("notification_preferences")\
        .update(prefs_data)\
        .eq("user_id", current_user["id"])\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Preferences not found")

    return NotificationPreferencesResponse(**result.data[0])


@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current user's notifications"""
    query = supabase.table("notifications").select("*").eq("user_id", current_user["id"])

    if unread_only:
        query = query.is_("read_at", "null")

    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    result = query.execute()

    return [NotificationResponse(**n) for n in result.data]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Mark notification as read"""
    update_data = {"read_at": datetime.now().isoformat()}

    result = supabase.table("notifications")\
        .update(update_data)\
        .eq("id", notification_id)\
        .eq("user_id", current_user["id"])\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Notification not found")

    return NotificationResponse(**result.data[0])


@router.post("/mark-all-read")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Mark all notifications as read"""
    update_data = {"read_at": datetime.now().isoformat()}

    supabase.table("notifications")\
        .update(update_data)\
        .eq("user_id", current_user["id"])\
        .is_("read_at", "null")\
        .execute()

    return {"message": "All notifications marked as read"}


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get notification statistics"""
    result = supabase.table("notifications").select("*").eq("user_id", current_user["id"]).execute()

    notifications = result.data
    unread = [n for n in notifications if not n.get("read_at")]

    by_type = {}
    for n in notifications:
        nt = n.get("notification_type", "unknown")
        by_type[nt] = by_type.get(nt, 0) + 1

    recent = sorted(notifications, key=lambda x: x["created_at"], reverse=True)[:5]

    return NotificationStats(
        total_notifications=len(notifications),
        unread_count=len(unread),
        by_type=by_type,
        recent_notifications=[NotificationResponse(**n) for n in recent]
    )


@router.post("/send", response_model=NotificationResponse)
async def send_notification(
    notification: NotificationCreate,
    current_user: dict = Depends(require_role(["admin", "manager", "staff"])),
    supabase: Client = Depends(get_supabase)
):
    """
    Send notification with enterprise deduplication (staff only)

    Features:
    - Automatic duplicate detection
    - Type-specific deduplication windows
    - Fingerprint generation for tracking
    """

    # Check for duplicates using enterprise deduplicator
    should_send, fingerprint = should_send_notification(
        supabase=supabase,
        user_id=notification.user_id,
        notification_type=notification.notification_type,
        title=notification.title,
        message=notification.message,
        data=notification.data,
    )

    if not should_send:
        raise HTTPException(
            status_code=409,  # Conflict
            detail="Duplicate notification detected. Notification blocked to prevent spam."
        )

    # Add fingerprint and status to notification data
    notif_data = notification.model_dump()
    notif_data["status"] = "pending"
    notif_data["fingerprint"] = fingerprint

    result = supabase.table("notifications").insert(notif_data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create notification")

    return NotificationResponse(**result.data[0])
