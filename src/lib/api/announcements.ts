/**
 * Announcements API Client
 */

import api from './axios';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'event' | 'alert' | 'promotion' | 'policy';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  target_audience: 'all_guests' | 'current_guests' | 'staff' | 'specific_roles' | 'specific_departments' | 'specific_rooms';
  target_roles?: string[];
  target_departments?: string[];
  target_rooms?: string[];
  status: 'draft' | 'scheduled' | 'active' | 'expired' | 'cancelled';
  scheduled_at?: string;
  published_at?: string;
  expires_at?: string;
  is_pinned: boolean;
  require_acknowledgment: boolean;
  acknowledgment_count: number;
  total_recipients: number;
  send_push: boolean;
  send_email: boolean;
  send_sms: boolean;
  attachments?: string[];
  created_by: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'general' | 'maintenance' | 'event' | 'alert' | 'promotion' | 'policy';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementAcknowledgment {
  id: string;
  announcement_id: string;
  user_id: string;
  user_name: string;
  acknowledged_at: string;
}

export interface AnnouncementStats {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_acknowledged: number;
  delivery_rate: number;
  read_rate: number;
  acknowledgment_rate: number;
}

class AnnouncementService {
  // ----- ANNOUNCEMENTS -----

  async getAnnouncements(params?: {
    status?: string;
    type?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<Announcement[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<Announcement[]>(`/announcements?${queryParams.toString()}`);
    return response.data;
  }

  async getAnnouncement(announcementId: string): Promise<Announcement> {
    const response = await api.get<Announcement>(`/announcements/${announcementId}`);
    return response.data;
  }

  async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    const response = await api.post<Announcement>('/announcements', data);
    return response.data;
  }

  async updateAnnouncement(announcementId: string, data: Partial<Announcement>): Promise<Announcement> {
    const response = await api.patch<Announcement>(`/announcements/${announcementId}`, data);
    return response.data;
  }

  async deleteAnnouncement(announcementId: string): Promise<void> {
    await api.delete(`/announcements/${announcementId}`);
  }

  async publishAnnouncement(announcementId: string): Promise<Announcement> {
    const response = await api.post<Announcement>(`/announcements/${announcementId}/publish`, {});
    return response.data;
  }

  async cancelAnnouncement(announcementId: string): Promise<Announcement> {
    const response = await api.post<Announcement>(`/announcements/${announcementId}/cancel`, {});
    return response.data;
  }

  async pinAnnouncement(announcementId: string, pinned: boolean): Promise<Announcement> {
    const response = await api.patch<Announcement>(`/announcements/${announcementId}/pin`, { is_pinned: pinned });
    return response.data;
  }

  // ----- ACKNOWLEDGMENTS -----

  async acknowledgeAnnouncement(announcementId: string): Promise<AnnouncementAcknowledgment> {
    const response = await api.post<AnnouncementAcknowledgment>(
      `/announcements/${announcementId}/acknowledge`,
      {}
    );
    return response.data;
  }

  async getAcknowledgments(announcementId: string): Promise<AnnouncementAcknowledgment[]> {
    const response = await api.get<AnnouncementAcknowledgment[]>(
      `/announcements/${announcementId}/acknowledgments`
    );
    return response.data;
  }

  // ----- TEMPLATES -----

  async getTemplates(): Promise<AnnouncementTemplate[]> {
    const response = await api.get<AnnouncementTemplate[]>('/announcements/templates');
    return response.data;
  }

  async getTemplate(templateId: string): Promise<AnnouncementTemplate> {
    const response = await api.get<AnnouncementTemplate>(`/announcements/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(data: Partial<AnnouncementTemplate>): Promise<AnnouncementTemplate> {
    const response = await api.post<AnnouncementTemplate>('/announcements/templates', data);
    return response.data;
  }

  async updateTemplate(templateId: string, data: Partial<AnnouncementTemplate>): Promise<AnnouncementTemplate> {
    const response = await api.patch<AnnouncementTemplate>(`/announcements/templates/${templateId}`, data);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await api.delete(`/announcements/templates/${templateId}`);
  }

  // ----- STATISTICS -----

  async getAnnouncementStats(announcementId: string): Promise<AnnouncementStats> {
    const response = await api.get<AnnouncementStats>(`/announcements/${announcementId}/stats`);
    return response.data;
  }

  // ----- ACTIVE ANNOUNCEMENTS (for guests) -----

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const response = await api.get<Announcement[]>('/announcements/active');
    return response.data;
  }
}

export const announcementService = new AnnouncementService();
