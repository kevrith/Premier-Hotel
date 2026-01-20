-- Drop and recreate tables to ensure correct structure
-- WARNING: This will delete any existing data in these tables!

-- Drop existing tables (in correct order due to dependencies)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bill_orders CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- Recreate bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    table_number VARCHAR(10),
    room_number VARCHAR(10),
    location_type VARCHAR(20),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    settled_by_waiter_id UUID,
    qr_code_data TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

-- Recreate bill_orders table
CREATE TABLE bill_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL,
    order_id UUID NOT NULL,
    waiter_id UUID NOT NULL,
    order_amount DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_order_per_bill UNIQUE(order_id)
);

-- Recreate payments table
CREATE TABLE payments (
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

-- Add all indexes
CREATE INDEX idx_bills_table_number ON bills(table_number);
CREATE INDEX idx_bills_room_number ON bills(room_number);
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bill_orders_bill_id ON bill_orders(bill_id);
CREATE INDEX idx_bill_orders_order_id ON bill_orders(order_id);
CREATE INDEX idx_bill_orders_waiter_id ON bill_orders(waiter_id);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_payment_status ON payments(payment_status);

SELECT 'All tables recreated with correct structure!' as status;
