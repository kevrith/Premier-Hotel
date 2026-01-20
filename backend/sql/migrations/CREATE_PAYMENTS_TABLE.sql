-- Create ONLY the payments table
-- Run this after bills and bill_orders tables are created

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    bill_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    mpesa_code VARCHAR(20),
    mpesa_phone VARCHAR(20),
    card_transaction_ref VARCHAR(100),
    room_charge_ref VARCHAR(50),
    processed_by_waiter_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

SELECT 'Payments table created!' as status;
