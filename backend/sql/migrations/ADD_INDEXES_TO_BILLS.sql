-- Add indexes to all bills-related tables
-- Run this after all three tables are created

-- Bills table indexes
CREATE INDEX IF NOT EXISTS idx_bills_table_number ON bills(table_number);
CREATE INDEX IF NOT EXISTS idx_bills_room_number ON bills(room_number);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);

-- Bill orders table indexes
CREATE INDEX IF NOT EXISTS idx_bill_orders_bill_id ON bill_orders(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_orders_order_id ON bill_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_bill_orders_waiter_id ON bill_orders(waiter_id);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_code ON payments(mpesa_code);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

SELECT 'All indexes created!' as status;
