/**
 * Payment API Service
 */
import api from './client';

export interface PaymentInitiate {
  payment_method: 'mpesa' | 'cash' | 'card';
  amount: number;
  reference_type: 'booking' | 'order';
  reference_id: string;
  phone_number?: string; // Required for M-Pesa
  description?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  reference_type: 'booking' | 'order';
  reference_id: string;
  payment_method: 'mpesa' | 'cash' | 'card';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mpesa_checkout_request_id?: string;
  mpesa_transaction_id?: string;
  mpesa_phone_number?: string;
  card_last_four?: string;
  card_brand?: string;
  description?: string;
  metadata?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface PaymentStatusResponse extends Payment {}

class PaymentService {
  /**
   * Initiate a payment
   */
  async initiatePayment(data: PaymentInitiate): Promise<Payment> {
    const response = await api.post<Payment>('/payments/initiate', data);
    return response.data;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/status/${paymentId}`);
    return response.data;
  }

  /**
   * Get current user's payments
   */
  async getMyPayments(filters?: {
    reference_type?: 'booking' | 'order';
    payment_status?: string;
  }): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (filters?.reference_type) params.append('reference_type', filters.reference_type);
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);

    const response = await api.get<Payment[]>(`/payments/my-payments?${params.toString()}`);
    return response.data;
  }

  /**
   * Get all payments (staff only)
   */
  async getAllPayments(filters?: {
    reference_type?: 'booking' | 'order';
    payment_method?: 'mpesa' | 'cash' | 'card';
    payment_status?: string;
  }): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (filters?.reference_type) params.append('reference_type', filters.reference_type);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method);
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);

    const response = await api.get<Payment[]>(`/payments/all?${params.toString()}`);
    return response.data;
  }

  /**
   * Confirm a cash/card payment (staff only)
   */
  async confirmPayment(paymentId: string, transactionReference?: string): Promise<Payment> {
    const params = new URLSearchParams();
    if (transactionReference) params.append('transaction_reference', transactionReference);

    const response = await api.patch<Payment>(
      `/payments/${paymentId}/confirm?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string): Promise<Payment> {
    const response = await api.patch<Payment>(`/payments/${paymentId}/cancel`);
    return response.data;
  }

  /**
   * Poll payment status until completed or failed
   * @param paymentId - Payment ID to poll
   * @param interval - Polling interval in milliseconds (default: 3000)
   * @param maxAttempts - Maximum polling attempts (default: 40, which is 2 minutes)
   * @param onStatusUpdate - Callback for status updates
   */
  async pollPaymentStatus(
    paymentId: string,
    options?: {
      interval?: number;
      maxAttempts?: number;
      onStatusUpdate?: (payment: Payment) => void;
    }
  ): Promise<Payment> {
    const interval = options?.interval || 3000;
    const maxAttempts = options?.maxAttempts || 40;
    const onStatusUpdate = options?.onStatusUpdate;

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          attempts++;

          const payment = await this.getPaymentStatus(paymentId);

          if (onStatusUpdate) {
            onStatusUpdate(payment);
          }

          // Check if payment is in a final state
          if (payment.status === 'completed') {
            resolve(payment);
            return;
          }

          if (payment.status === 'failed' || payment.status === 'cancelled') {
            reject(new Error(payment.error_message || `Payment ${payment.status}`));
            return;
          }

          // Continue polling if not in final state and haven't exceeded max attempts
          if (attempts < maxAttempts) {
            setTimeout(poll, interval);
          } else {
            reject(new Error('Payment status check timeout'));
          }
        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }

  /**
   * Format phone number for M-Pesa (254XXXXXXXXX format)
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      // 0712345678 -> 254712345678
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
      cleaned = cleaned;
    } else if (cleaned.startsWith('+254')) {
      // +254712345678 -> 254712345678
      cleaned = cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // 712345678 -> 254712345678
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    // Must be 254 followed by 7 or 1, then 8 more digits
    return /^254[17]\d{8}$/.test(formatted);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
