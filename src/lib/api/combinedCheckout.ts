/**
 * Combined Checkout API Client
 * Handles payment for both room and F&B charges together
 */

import { api } from './client';

export interface CheckoutItem {
  type: 'room' | 'food';
  id: string;
  description: string;
  amount: number;
}

export interface RoomFolioResponse {
  success: boolean;
  room_number: string;
  booking_id: string | null;
  room_charge: number;
  food_charge: number;
  total_amount: number;
  items: CheckoutItem[];
}

export interface CombinedCheckoutRequest {
  room_number: string;
  payment_method: 'cash' | 'mpesa' | 'card';
  mpesa_phone?: string;
  card_reference?: string;
  notes?: string;
}

export interface CombinedCheckoutResponse {
  success: boolean;
  message: string;
  total_amount: number;
  room_charge: number;
  food_charge: number;
  items: CheckoutItem[];
  booking_id: string | null;
  waiter_id: string | null;
}

export const combinedCheckoutApi = {
  /**
   * Get all charges for a room (booking + unpaid F&B bills)
   */
  getRoomFolio: async (roomNumber: string): Promise<RoomFolioResponse> => {
    const response = await api.get<RoomFolioResponse>(`/checkout/room-folio/${roomNumber}`);
    return response.data;
  },

  /**
   * Process payment for both room and F&B charges together
   */
  processCombinedCheckout: async (checkoutData: CombinedCheckoutRequest): Promise<CombinedCheckoutResponse> => {
    const response = await api.post<CombinedCheckoutResponse>('/checkout/combined-checkout', checkoutData);
    return response.data;
  }
};

export default combinedCheckoutApi;
