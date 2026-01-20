/**
 * Bills and Payments TypeScript Types
 * Matches backend Pydantic schemas
 */

export interface OrderInBill {
  order_id: string;
  order_number: string;
  waiter_id: string;
  waiter_name: string;
  items: OrderItem[];
  amount: number;
  created_at: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

export interface UnpaidOrdersResponse {
  location: string;
  location_type: 'table' | 'room';
  orders: OrderInBill[];
  total_amount: number;
  tax_included: number;
  subtotal: number;
  order_count: number;
}

export interface BillCreate {
  location_type: 'table' | 'room';
  location: string;
  customer_name?: string;
  customer_phone?: string;
}

export interface BillResponse {
  id: string;
  bill_number: string;
  table_number?: string;
  room_number?: string;
  location_type: string;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  settled_by_waiter_id?: string;
  qr_code_data?: string;
  created_at: string;
  paid_at?: string;
  orders: OrderInBill[];
  payments: PaymentResponse[];
}

export interface PaymentCreate {
  bill_id: string;
  amount: number;
  payment_method: 'cash' | 'mpesa' | 'card' | 'room_charge';
  mpesa_phone?: string;
  card_transaction_ref?: string;
  room_charge_ref?: string;
  notes?: string;
}

export interface PaymentResponse {
  id: string;
  payment_number: string;
  bill_id: string;
  amount: number;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed';
  mpesa_code?: string;
  mpesa_phone?: string;
  card_transaction_ref?: string;
  room_charge_ref?: string;
  processed_by_waiter_id: string;
  notes?: string;
  created_at: string;
  completed_at?: string;
}

export interface MPesaCallbackData {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  Amount?: number;
  MpesaReceiptNumber?: string;
  TransactionDate?: string;
  PhoneNumber?: string;
}

export interface BillListParams {
  payment_status?: 'unpaid' | 'partial' | 'paid';
  location_type?: 'table' | 'room';
  location?: string;
  limit?: number;
  offset?: number;
}
