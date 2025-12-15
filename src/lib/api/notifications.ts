/**
 * Notification System API Client
 */

import api from './axios';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  event_type?: string;
  reference_type?: string;
  reference_id?: string;
  data?: any;
  status: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  booking_confirmations: boolean;
  booking_reminders: boolean;
  payment_receipts: boolean;
  promotional_offers: boolean;
  loyalty_updates: boolean;
  service_updates: boolean;
  email_address?: string;
  phone_number?: string;
  preferred_language: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  by_type: Record<string, number>;
  recent_notifications: Notification[];
}

class NotificationService {
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  }

  async updatePreferences(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put<NotificationPreferences>('/notifications/preferences', data);
    return response.data;
  }

  async getNotifications(params?: {
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> {
    const queryParams = new URLSearchParams();
    if (params?.unread_only !== undefined) queryParams.append('unread_only', params.unread_only.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<Notification[]>(`/notifications?${queryParams.toString()}`);
    return response.data;
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.patch<Notification>(`/notifications/${notificationId}/read`, {});
    return response.data;
  }

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/mark-all-read', {});
  }

  async getStats(): Promise<NotificationStats> {
    const response = await api.get<NotificationStats>('/notifications/stats');
    return response.data;
  }
}

export const notificationService = new NotificationService();
