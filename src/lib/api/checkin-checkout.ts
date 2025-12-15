/**
 * Check-in/Check-out API Client
 */

import api from './axios';

// Types
export interface GuestRegistration {
  id: string;
  booking_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  id_type?: string;
  id_number?: string;
  id_verified: boolean;
  status: string;
  created_at: string;
}

export interface Checkin {
  id: string;
  booking_id: string;
  checkin_type: string;
  scheduled_checkin?: string;
  actual_checkin?: string;
  room_id?: string;
  key_card_number?: string;
  key_card_issued: boolean;
  deposit_amount: number;
  deposit_paid: boolean;
  status: string;
  terms_accepted: boolean;
  created_at: string;
}

export interface Checkout {
  id: string;
  booking_id: string;
  checkout_type: string;
  scheduled_checkout?: string;
  actual_checkout?: string;
  room_id?: string;
  room_condition?: string;
  damages_found: boolean;
  damage_charges: number;
  key_card_returned: boolean;
  total_charges: number;
  deposit_refund: number;
  payment_settled: boolean;
  status: string;
  checkout_rating?: number;
  created_at: string;
}

export interface CheckinCheckoutRequest {
  id: string;
  booking_id: string;
  request_type: 'early_checkin' | 'late_checkout';
  requested_time: string;
  reason?: string;
  additional_charge: number;
  status: string;
  processed_by?: string;
  created_at: string;
}

// Service
class CheckinCheckoutService {
  // Registrations
  async createRegistration(data: any): Promise<GuestRegistration> {
    const response = await api.post<GuestRegistration>('/checkin-checkout/registrations', data);
    return response.data;
  }

  async getRegistration(registrationId: string): Promise<GuestRegistration> {
    const response = await api.get<GuestRegistration>(`/checkin-checkout/registrations/${registrationId}`);
    return response.data;
  }

  // Check-ins
  async createCheckin(data: any): Promise<Checkin> {
    const response = await api.post<Checkin>('/checkin-checkout/checkins', data);
    return response.data;
  }

  async getCheckins(params?: { status?: string; booking_id?: string }): Promise<Checkin[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.booking_id) queryParams.append('booking_id', params.booking_id);

    const response = await api.get<Checkin[]>(`/checkin-checkout/checkins?${queryParams.toString()}`);
    return response.data;
  }

  async processCheckin(checkinId: string, data: any): Promise<Checkin> {
    const response = await api.patch<Checkin>(`/checkin-checkout/checkins/${checkinId}/process`, data);
    return response.data;
  }

  async completeCheckin(checkinId: string, data: any): Promise<Checkin> {
    const response = await api.patch<Checkin>(`/checkin-checkout/checkins/${checkinId}/complete`, data);
    return response.data;
  }

  // Check-outs
  async createCheckout(data: any): Promise<Checkout> {
    const response = await api.post<Checkout>('/checkin-checkout/checkouts', data);
    return response.data;
  }

  async getCheckouts(params?: { status?: string; booking_id?: string }): Promise<Checkout[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.booking_id) queryParams.append('booking_id', params.booking_id);

    const response = await api.get<Checkout[]>(`/checkin-checkout/checkouts?${queryParams.toString()}`);
    return response.data;
  }

  async processCheckout(checkoutId: string, data: any): Promise<Checkout> {
    const response = await api.patch<Checkout>(`/checkin-checkout/checkouts/${checkoutId}/process`, data);
    return response.data;
  }

  async completeCheckout(checkoutId: string, data: any): Promise<Checkout> {
    const response = await api.patch<Checkout>(`/checkin-checkout/checkouts/${checkoutId}/complete`, data);
    return response.data;
  }

  // Requests
  async createRequest(data: any): Promise<CheckinCheckoutRequest> {
    const response = await api.post<CheckinCheckoutRequest>('/checkin-checkout/requests', data);
    return response.data;
  }

  async getRequests(params?: { status?: string; request_type?: string }): Promise<CheckinCheckoutRequest[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.request_type) queryParams.append('request_type', params.request_type);

    const response = await api.get<CheckinCheckoutRequest[]>(`/checkin-checkout/requests?${queryParams.toString()}`);
    return response.data;
  }

  async processRequest(requestId: string, data: any): Promise<CheckinCheckoutRequest> {
    const response = await api.patch<CheckinCheckoutRequest>(`/checkin-checkout/requests/${requestId}/process`, data);
    return response.data;
  }
}

export const checkinCheckoutService = new CheckinCheckoutService();
