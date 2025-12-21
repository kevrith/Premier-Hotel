"""
Messaging System Endpoints
In-app messaging between guests and staff
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.core.supabase import get_supabase
from app.middleware.auth import get_current_user
from app.schemas.messaging import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    MessageCreate,
    MessageUpdate,
    MessageResponse,
    ConversationStats,
    MessageStats
)
from app.services.websocket_manager import send_message_event
from typing import List, Optional
from datetime import datetime

router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create a new conversation"""
    try:
        user_id = current_user["id"]

        # Create conversation
        conv_data = {
            "type": conversation.type,
            "subject": conversation.subject,
            "status": conversation.status
        }

        result = supabase.table("conversations").insert(conv_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create conversation")

        conversation_id = result.data[0]["id"]

        # Add current user as participant (owner)
        participants = [
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "role": "owner"
            }
        ]

        # Add other participants
        for participant_id in conversation.participant_ids:
            if participant_id != user_id:
                participants.append({
                    "conversation_id": conversation_id,
                    "user_id": participant_id,
                    "role": "staff" if conversation.type == "guest_staff" else "participant"
                })

        supabase.table("conversation_participants").insert(participants).execute()

        # Fetch complete conversation
        return await get_conversation(conversation_id, current_user, supabase)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating conversation: {str(e)}")


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """List user's conversations"""
    try:
        user_id = current_user["id"]

        # Get user's conversation IDs
        participant_result = supabase.table("conversation_participants")\
            .select("conversation_id")\
            .eq("user_id", user_id)\
            .execute()

        if not participant_result.data:
            return []

        conversation_ids = [p["conversation_id"] for p in participant_result.data]

        # Build query
        query = supabase.table("conversations")\
            .select("*")\
            .in_("id", conversation_ids)\
            .order("last_message_at", desc=True)\
            .limit(limit)

        if status:
            query = query.eq("status", status)

        result = query.execute()

        # Enrich with additional data
        conversations = []
        for conv in result.data:
            # Get last message
            last_msg_result = supabase.table("messages")\
                .select("message_text")\
                .eq("conversation_id", conv["id"])\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()

            # Get unread count
            unread_result = supabase.table("messages")\
                .select("id", count="exact")\
                .eq("conversation_id", conv["id"])\
                .eq("is_read", False)\
                .neq("sender_id", user_id)\
                .execute()

            # Get participants
            parts_result = supabase.table("conversation_participants")\
                .select("user_id")\
                .eq("conversation_id", conv["id"])\
                .execute()

            conv["last_message"] = last_msg_result.data[0]["message_text"] if last_msg_result.data else None
            conv["unread_count"] = unread_result.count or 0
            conv["participants"] = [{"user_id": p["user_id"]} for p in parts_result.data] if parts_result.data else []

            conversations.append(conv)

        return conversations

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing conversations: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get a specific conversation"""
    try:
        user_id = current_user["id"]

        # Check if user is participant
        participant_check = supabase.table("conversation_participants")\
            .select("id")\
            .eq("conversation_id", conversation_id)\
            .eq("user_id", user_id)\
            .execute()

        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        # Get conversation
        result = supabase.table("conversations").select("*").eq("id", conversation_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation = result.data[0]

        # Get last message
        last_msg_result = supabase.table("messages")\
            .select("message_text")\
            .eq("conversation_id", conversation_id)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        # Get unread count
        unread_result = supabase.table("messages")\
            .select("id", count="exact")\
            .eq("conversation_id", conversation_id)\
            .eq("is_read", False)\
            .neq("sender_id", user_id)\
            .execute()

        # Get participants
        parts_result = supabase.table("conversation_participants")\
            .select("user_id")\
            .eq("conversation_id", conversation_id)\
            .execute()

        conversation["last_message"] = last_msg_result.data[0]["message_text"] if last_msg_result.data else None
        conversation["unread_count"] = unread_result.count or 0
        conversation["participants"] = [{"user_id": p["user_id"]} for p in parts_result.data] if parts_result.data else []

        return conversation

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting conversation: {str(e)}")


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    conversation: ConversationUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update a conversation"""
    try:
        update_data = conversation.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")

        result = supabase.table("conversations")\
            .update(update_data)\
            .eq("id", conversation_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return await get_conversation(conversation_id, current_user, supabase)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating conversation: {str(e)}")


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Send a message in a conversation"""
    try:
        user_id = current_user["id"]

        # Check if user is participant
        participant_check = supabase.table("conversation_participants")\
            .select("id")\
            .eq("conversation_id", message.conversation_id)\
            .eq("user_id", user_id)\
            .execute()

        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        # Create message
        msg_data = {
            "conversation_id": message.conversation_id,
            "sender_id": user_id,
            "message_text": message.message_text,
            "message_type": message.message_type
        }

        result = supabase.table("messages").insert(msg_data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to send message")

        message_data = result.data[0]

        # Get other participants to send real-time notification
        participants = supabase.table("conversation_participants")\
            .select("user_id")\
            .eq("conversation_id", message.conversation_id)\
            .neq("user_id", user_id)\
            .execute()

        # Send WebSocket event to other participants
        if participants.data:
            for participant in participants.data:
                await send_message_event(participant["user_id"], {
                    "conversation_id": message.conversation_id,
                    "message_id": message_data["id"],
                    "sender_id": user_id,
                    "message_text": message.message_text,
                    "created_at": message_data["created_at"]
                })

        return message_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get messages in a conversation"""
    try:
        user_id = current_user["id"]

        # Check if user is participant
        participant_check = supabase.table("conversation_participants")\
            .select("id")\
            .eq("conversation_id", conversation_id)\
            .eq("user_id", user_id)\
            .execute()

        if not participant_check.data:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        # Get messages
        result = supabase.table("messages")\
            .select("*")\
            .eq("conversation_id", conversation_id)\
            .eq("is_deleted", False)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        return result.data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting messages: {str(e)}")


@router.patch("/conversations/{conversation_id}/read")
async def mark_conversation_as_read(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Mark all messages in a conversation as read"""
    try:
        user_id = current_user["id"]

        # Use the helper function
        supabase.rpc("mark_conversation_as_read", {
            "p_conversation_id": conversation_id,
            "p_user_id": user_id
        }).execute()

        return {"success": True, "message": "Conversation marked as read"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking as read: {str(e)}")


@router.get("/stats", response_model=MessageStats)
async def get_message_stats(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get messaging statistics for current user"""
    try:
        user_id = current_user["id"]

        # Get total messages (where user is participant)
        participant_convs = supabase.table("conversation_participants")\
            .select("conversation_id")\
            .eq("user_id", user_id)\
            .execute()

        conv_ids = [p["conversation_id"] for p in participant_convs.data] if participant_convs.data else []

        if not conv_ids:
            return MessageStats(
                total_messages=0,
                unread_messages=0,
                messages_today=0,
                messages_this_week=0
            )

        # Total messages
        total = supabase.table("messages")\
            .select("id", count="exact")\
            .in_("conversation_id", conv_ids)\
            .execute()

        # Unread messages
        unread = supabase.table("messages")\
            .select("id", count="exact")\
            .in_("conversation_id", conv_ids)\
            .eq("is_read", False)\
            .neq("sender_id", user_id)\
            .execute()

        # Messages today
        today = datetime.now().date().isoformat()
        today_msgs = supabase.table("messages")\
            .select("id", count="exact")\
            .in_("conversation_id", conv_ids)\
            .gte("created_at", today)\
            .execute()

        return MessageStats(
            total_messages=total.count or 0,
            unread_messages=unread.count or 0,
            messages_today=today_msgs.count or 0,
            messages_this_week=0  # TODO: Calculate
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")
