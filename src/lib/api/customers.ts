/**
 * Customer History and Lookup API
 * Provides customer search, autocomplete, and history tracking
 */

import apiClient from './client';

export interface CustomerSearchResult {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_orders: number;
  last_order_date: string;
  preferred_table?: string;
}

export interface CustomerDetail {
  id: string;
  customer_name: string;
  customer_phone: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  first_order_date: string;
  preferred_table?: string;
  dietary_preferences: string[];
  notes?: string;
}

export interface CustomerUpsertRequest {
  customer_name: string;
  customer_phone: string;
  order_amount?: number;
}

/**
 * Search for customers by name or phone number
 */
export async function searchCustomers(
  query: string,
  limit: number = 10
): Promise<CustomerSearchResult[]> {
  try {
    const response = await apiClient.get('/customers/search', {
      params: { q: query, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching customers:', error);
    return [];
  }
}

/**
 * Get customer details by phone number
 */
export async function getCustomerByPhone(
  phone: string
): Promise<CustomerDetail | null> {
  try {
    const response = await apiClient.get(`/customers/phone/${encodeURIComponent(phone)}`);
    return response.data;
  } catch (error) {
    console.error('Error getting customer by phone:', error);
    return null;
  }
}

/**
 * Get frequent customers (sorted by total orders)
 */
export async function getFrequentCustomers(
  limit: number = 20
): Promise<CustomerSearchResult[]> {
  try {
    const response = await apiClient.get('/customers/frequent', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting frequent customers:', error);
    return [];
  }
}

/**
 * Create or update customer history
 * Called when an order is placed
 */
export async function upsertCustomer(
  data: CustomerUpsertRequest
): Promise<{ success: boolean; customer_id: string }> {
  try {
    const response = await apiClient.post('/customers/upsert', data);
    return response.data;
  } catch (error) {
    console.error('Error upserting customer:', error);
    throw error;
  }
}

/**
 * Get detailed customer information by ID
 */
export async function getCustomerDetails(
  customerId: string
): Promise<CustomerDetail> {
  try {
    const response = await apiClient.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting customer details:', error);
    throw error;
  }
}

const customersApi = {
  searchCustomers,
  getCustomerByPhone,
  getFrequentCustomers,
  upsertCustomer,
  getCustomerDetails
};

export default customersApi;
