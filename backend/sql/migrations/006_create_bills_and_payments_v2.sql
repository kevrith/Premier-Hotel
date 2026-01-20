-- Migration 006: Create Bills and Payments System (Version 2 - No Foreign Keys)
-- This enables unified bill aggregation where multiple orders from different waiters
-- can be paid together in a single transaction with automatic attribution
--
-- NOTE: This version DOES NOT use foreign keys to avoid constraint issues
-- The application layer will handle referential integrity

-- ============================================================================
-- STEP 1: CREATE BILLS TABLE
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bills_table_number ON bills(table_number);
CREATE INDEX IF NOT EXISTS idx_bills_room_number ON bills(room_number);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);

-- ============================================================================
-- STEP 2: CREATE BILL_ORDERS JUNCTION TABLE
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_orders_bill_id ON bill_orders(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_orders_order_id ON bill_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_bill_orders_waiter_id ON bill_orders(waiter_id);

-- ============================================================================
-- STEP 3: CREATE PAYMENTS TABLE
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_code ON payments(mpesa_code);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- ============================================================================
-- STEP 4: ADD COLUMNS TO EXISTING ORDERS TABLE (MUST BE BEFORE FUNCTIONS)
-- ============================================================================

-- Add payment_status column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';

-- Add bill_id column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS bill_id UUID;

-- Add paid_at timestamp
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_bill_id ON orders(bill_id);

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTIONS (AFTER columns exist)
-- ============================================================================

-- Function to generate unique bill numbers
-- This function only uses the bills table, so it's safe
CREATE OR REPLACE FUNCTION generate_bill_number(
    p_location_type VARCHAR,
    p_location VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR;
    today_date VARCHAR;
    sequence_num INTEGER;
    bill_num VARCHAR;
BEGIN
    -- Determine prefix based on location type
    IF p_location_type = 'table' THEN
        prefix := 'BILL-T' || p_location;
    ELSIF p_location_type = 'room' THEN
        prefix := 'BILL-R' || p_location;
    ELSE
        prefix := 'BILL';
    END IF;

    -- Get today's date in YYYYMMDD format
    today_date := TO_CHAR(NOW(), 'YYYYMMDD');

    -- Find the next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM bills
    WHERE bill_number LIKE prefix || '-' || today_date || '-%';

    -- Generate final bill number with zero-padded sequence
    bill_num := prefix || '-' || today_date || '-' || LPAD(sequence_num::TEXT, 3, '0');

    RETURN bill_num;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate bill totals from associated orders
-- Uses bill_orders junction table, so doesn't directly reference orders.bill_id
CREATE OR REPLACE FUNCTION calculate_bill_totals(p_bill_id UUID)
RETURNS TABLE(subtotal DECIMAL, tax DECIMAL, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(o.subtotal), 0)::DECIMAL as subtotal,
        COALESCE(SUM(o.tax), 0)::DECIMAL as tax,
        COALESCE(SUM(o.total_amount), 0)::DECIMAL as total
    FROM bill_orders bo
    INNER JOIN orders o ON bo.order_id = o.id
    WHERE bo.bill_id = p_bill_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE bills IS 'Consolidated bills that can contain multiple orders from different waiters';
COMMENT ON TABLE bill_orders IS 'Junction table linking orders to bills with waiter attribution';
COMMENT ON TABLE payments IS 'Payment records for bills supporting multiple payment methods';

COMMENT ON COLUMN orders.payment_status IS 'Payment status: unpaid, paid, partially_paid';
COMMENT ON COLUMN orders.bill_id IS 'Reference to the bill this order belongs to (if any)';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when the order was paid';

-- ============================================================================
-- SUCCESS VERIFICATION
-- ============================================================================
SELECT 'Bills and Payments system created successfully!' as status;
