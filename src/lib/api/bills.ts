/**
 * Bills and Payments API Client
 * Provides methods to interact with the bills and payments backend
 */

import { api } from './client';
import type {
  UnpaidOrdersResponse,
  BillCreate,
  BillResponse,
  PaymentCreate,
  PaymentResponse,
  BillListParams,
} from '@/types/bills';

/**
 * Bills API endpoints
 */
export const billsApi = {
  /**
   * Get all unpaid orders for a specific table or room
   * @param locationType - 'table' or 'room'
   * @param location - Table number or room number
   * @returns Unpaid orders with totals
   */
  getUnpaidOrders: async (
    locationType: 'table' | 'room',
    location: string
  ): Promise<UnpaidOrdersResponse> => {
    const response = await api.get<UnpaidOrdersResponse>(
      `/bills/unpaid/${locationType}/${location}`
    );
    return response.data;
  },

  /**
   * Create a new bill from unpaid orders
   * @param billData - Bill creation data
   * @returns Created bill with details
   */
  createBill: async (billData: BillCreate): Promise<BillResponse> => {
    const response = await api.post<BillResponse>('/bills/', billData);
    return response.data;
  },

  /**
   * Get bill by ID
   * @param billId - Bill UUID
   * @returns Bill details with orders and payments
   */
  getBillById: async (billId: string): Promise<BillResponse> => {
    const response = await api.get<BillResponse>(`/bills/${billId}`);
    return response.data;
  },

  /**
   * Get bill by bill number
   * @param billNumber - Formatted bill number (e.g., "BILL-001")
   * @returns Bill details
   */
  getBillByNumber: async (billNumber: string): Promise<BillResponse> => {
    const response = await api.get<BillResponse>(`/bills/number/${billNumber}`);
    return response.data;
  },

  /**
   * List all bills with optional filters
   * @param params - Filter parameters
   * @returns List of bills
   */
  listBills: async (params?: BillListParams): Promise<BillResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.payment_status) queryParams.append('payment_status', params.payment_status);
    if (params?.location_type) queryParams.append('location_type', params.location_type);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/bills/?${queryString}` : '/bills/';

    const response = await api.get<BillResponse[]>(url);
    return response.data;
  },

  /**
   * Process payment for a bill
   * @param paymentData - Payment details
   * @returns Payment record
   */
  processPayment: async (paymentData: PaymentCreate): Promise<PaymentResponse> => {
    const response = await api.post<PaymentResponse>('/bills/payments', paymentData);
    return response.data;
  },

  /**
   * Get payment by ID
   * @param paymentId - Payment UUID
   * @returns Payment details
   */
  getPaymentById: async (paymentId: string): Promise<PaymentResponse> => {
    const response = await api.get<PaymentResponse>(`/bills/payments/${paymentId}`);
    return response.data;
  },

  /**
   * List all payments for a bill
   * @param billId - Bill UUID
   * @returns List of payments
   */
  getBillPayments: async (billId: string): Promise<PaymentResponse[]> => {
    const response = await api.get<PaymentResponse[]>(`/bills/${billId}/payments`);
    return response.data;
  },

  /**
   * Void/cancel a bill (admin only)
   * @param billId - Bill UUID
   * @returns Updated bill
   */
  voidBill: async (billId: string): Promise<BillResponse> => {
    const response = await api.post<BillResponse>(`/bills/${billId}/void`);
    return response.data;
  },
};

export default billsApi;
