-- Migration 006: Create Bills and Payments System - MINIMAL VERSION
-- This version creates ONLY the new tables without touching orders table
-- You can add orders columns manually later if needed

-- ============================================================================
-- CREATE BILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
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

CREATE INDEX IF NOT EXISTS idx_bills_table_number ON bills(table_number);
CREATE INDEX IF NOT EXISTS idx_bills_room_number ON bills(room_number);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);

-- ============================================================================
-- CREATE BILL_ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bill_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL,
    order_id UUID NOT NULL,
    waiter_id UUID NOT NULL,
    order_amount DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_order_per_bill UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_orders_bill_id ON bill_orders(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_orders_order_id ON bill_orders(order_id);

-- ============================================================================
-- CREATE PAYMENTS TABLE
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

-- ============================================================================
-- HELPER FUNCTION - Bill Number Generator
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_bill_number(
    p_location_type VARCHAR,
    p_location VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR;
    today_date VARCHAR;
    sequence_num INTEGER;
BEGIN
    IF p_location_type = 'table' THEN
        prefix := 'BILL-T' || p_location;
    ELSIF p_location_type = 'room' THEN
        prefix := 'BILL-R' || p_location;
    ELSE
        prefix := 'BILL';
    END IF;

    today_date := TO_CHAR(NOW(), 'YYYYMMDD');

    SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM bills
    WHERE bill_number LIKE prefix || '-' || today_date || '-%';

    RETURN prefix || '-' || today_date || '-' || LPAD(sequence_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

SELECT 'Bills and Payments tables created successfully!' as status;
