"""
Messaging System Schemas
Pydantic models for conversations and messages
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# Conversation Schemas
class ConversationBase(BaseModel):
    type: str  # 'guest_staff', 'staff_staff', 'guest_guest'
    subject: Optional[str] = None
    status: str = 'active'  # 'active', 'archived', 'closed'


class ConversationCreate(ConversationBase):
    participant_ids: List[str]  # List of user IDs to add to conversation


class ConversationUpdate(BaseModel):
    subject: Optional[str] = None
    status: Optional[str] = None


class ConversationResponse(ConversationBase):
    id: str
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    unread_count: Optional[int] = 0
    last_message: Optional[str] = None
    participants: Optional[List[dict]] = []

    model_config = ConfigDict(from_attributes=True)


# Conversation Participant Schemas
class ParticipantBase(BaseModel):
    conversation_id: str
    user_id: str
    role: str = 'participant'  # 'owner', 'participant', 'staff'


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantResponse(ParticipantBase):
    id: str
    last_read_at: Optional[datetime] = None
    is_muted: bool = False
    created_at: datetime
    user_info: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


# Message Schemas
class MessageBase(BaseModel):
    message_text: str
    message_type: str = 'text'  # 'text', 'system', 'automated'


class MessageCreate(MessageBase):
    conversation_id: str


class MessageUpdate(BaseModel):
    message_text: Optional[str] = None
    is_read: Optional[bool] = None
    is_deleted: Optional[bool] = None


class MessageResponse(MessageBase):
    id: str
    conversation_id: str
    sender_id: str
    is_read: bool = False
    read_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    sender_info: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


# Message Attachment Schemas
class AttachmentBase(BaseModel):
    message_id: str
    file_name: str
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class AttachmentCreate(AttachmentBase):
    pass


class AttachmentResponse(AttachmentBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Stats and Summary Schemas
class ConversationStats(BaseModel):
    total_conversations: int
    active_conversations: int
    unread_messages: int
    archived_conversations: int


class MessageStats(BaseModel):
    total_messages: int
    unread_messages: int
    messages_today: int
    messages_this_week: int
