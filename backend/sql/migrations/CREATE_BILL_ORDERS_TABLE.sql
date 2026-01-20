-- Create ONLY the bill_orders table
-- Run this after bills table is created

CREATE TABLE IF NOT EXISTS bill_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL,
    order_id UUID NOT NULL,
    waiter_id UUID NOT NULL,
    order_amount DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_order_per_bill UNIQUE(order_id)
);

SELECT 'Bill orders table created!' as status;
