/**
 * Messaging API Client
 * In-app messaging between guests and staff
 */

import api from './axios';

export interface Conversation {
  id: string;
  type: 'guest_staff' | 'staff_staff' | 'guest_guest';
  subject?: string;
  status: 'active' | 'archived' | 'closed';
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: string;
  participants?: Array<{ user_id: string }>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'system' | 'automated';
  is_read: boolean;
  read_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  sender_info?: any;
}

export interface MessageStats {
  total_messages: number;
  unread_messages: number;
  messages_today: number;
  messages_this_week: number;
}

class MessagingService {
  // Conversations
  async createConversation(data: {
    type: string;
    subject?: string;
    participant_ids: string[];
  }): Promise<Conversation> {
    const response = await api.post<Conversation>('/messages/conversations', data);
    return response.data;
  }

  async getConversations(params?: {
    status?: string;
    limit?: number;
  }): Promise<Conversation[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<Conversation[]>(
      `/messages/conversations?${queryParams.toString()}`
    );
    return response.data;
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get<Conversation>(`/messages/conversations/${conversationId}`);
    return response.data;
  }

  async updateConversation(
    conversationId: string,
    data: { subject?: string; status?: string }
  ): Promise<Conversation> {
    const response = await api.patch<Conversation>(
      `/messages/conversations/${conversationId}`,
      data
    );
    return response.data;
  }

  // Messages
  async sendMessage(data: {
    conversation_id: string;
    message_text: string;
    message_type?: string;
  }): Promise<Message> {
    const response = await api.post<Message>('/messages/messages', data);
    return response.data;
  }

  async getMessages(
    conversationId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<Message[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<Message[]>(
      `/messages/conversations/${conversationId}/messages?${queryParams.toString()}`
    );
    return response.data;
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    await api.patch(`/messages/conversations/${conversationId}/read`);
  }

  // Stats
  async getStats(): Promise<MessageStats> {
    const response = await api.get<MessageStats>('/messages/stats');
    return response.data;
  }
}

export const messagingService = new MessagingService();
