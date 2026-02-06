/**
 * Order Payments API Client
 * Simple payment processing for served orders
 */

import { api } from './client';

export interface OrderPaymentRequest {
  order_id: string;
  payment_method: 'cash' | 'mpesa' | 'card' | 'room_charge';
  amount: number;
  mpesa_phone?: string;
  card_reference?: string;
  notes?: string;
  room_number?: string; // For room_charge method
}

export interface OrderPaymentResponse {
  success: boolean;
  message: string;
  payment_id?: string;
  order_status: string;
}

export const orderPaymentsApi = {
  /**
   * Process payment for a served order
   */
  processPayment: async (paymentData: OrderPaymentRequest): Promise<OrderPaymentResponse> => {
    const response = await api.post<OrderPaymentResponse>('/order-billing/order-payment', paymentData);
    return response.data;
  }
};

export default orderPaymentsApi;