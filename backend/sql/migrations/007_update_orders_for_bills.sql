-- Migration 007: Update Orders Table for Bills System
-- Run this AFTER migration 006 is successful
-- This adds the bill-related columns to the orders table

-- Add payment_status column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';

-- Add bill_id column (reference to bills table)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS bill_id UUID;

-- Add paid_at timestamp
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_bill_id ON orders(bill_id);

-- Add helpful comments
COMMENT ON COLUMN orders.payment_status IS 'Payment status: unpaid, paid';
COMMENT ON COLUMN orders.bill_id IS 'Reference to the bill this order belongs to';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was completed';

SELECT 'Orders table updated for bills system!' as status;
