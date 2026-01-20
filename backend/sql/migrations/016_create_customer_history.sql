-- Migration: Create customer history table for tracking frequent customers
-- This enables auto-population and smart suggestions in food ordering

-- Create customer_history table
CREATE TABLE IF NOT EXISTS customer_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    total_orders INTEGER DEFAULT 1,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    first_order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferred_table VARCHAR(50),
    dietary_preferences JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_phone)
);

-- Create index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_customer_history_phone ON customer_history(customer_phone);

-- Create index for name search with case-insensitive matching
CREATE INDEX IF NOT EXISTS idx_customer_history_name ON customer_history(LOWER(customer_name));

-- Create index for frequent customers (sorted by order count)
CREATE INDEX IF NOT EXISTS idx_customer_history_orders ON customer_history(total_orders DESC, last_order_date DESC);

-- Function to update or insert customer history
CREATE OR REPLACE FUNCTION upsert_customer_history(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_order_amount DECIMAL DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Insert or update customer history
    INSERT INTO customer_history (
        customer_name,
        customer_phone,
        total_orders,
        total_spent,
        last_order_date,
        first_order_date
    ) VALUES (
        p_customer_name,
        p_customer_phone,
        1,
        p_order_amount,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (customer_phone) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        total_orders = customer_history.total_orders + 1,
        total_spent = customer_history.total_spent + p_order_amount,
        last_order_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_customer_id;

    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search customers by name (fuzzy matching)
CREATE OR REPLACE FUNCTION search_customers_by_name(
    p_search_term VARCHAR,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    total_orders INTEGER,
    last_order_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.id,
        ch.customer_name,
        ch.customer_phone,
        ch.total_orders,
        ch.last_order_date
    FROM customer_history ch
    WHERE LOWER(ch.customer_name) LIKE LOWER('%' || p_search_term || '%')
    ORDER BY
        ch.total_orders DESC,
        ch.last_order_date DESC,
        -- Prioritize exact matches
        CASE
            WHEN LOWER(ch.customer_name) = LOWER(p_search_term) THEN 0
            WHEN LOWER(ch.customer_name) LIKE LOWER(p_search_term || '%') THEN 1
            ELSE 2
        END
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer by phone
CREATE OR REPLACE FUNCTION get_customer_by_phone(
    p_phone VARCHAR
)
RETURNS TABLE (
    id UUID,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    total_orders INTEGER,
    last_order_date TIMESTAMP WITH TIME ZONE,
    preferred_table VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.id,
        ch.customer_name,
        ch.customer_phone,
        ch.total_orders,
        ch.last_order_date,
        ch.preferred_table
    FROM customer_history ch
    WHERE ch.customer_phone = p_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE customer_history ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Allow service role to bypass RLS (for backend API calls)
-- This allows the backend to access customer_history using the service key
CREATE POLICY customer_history_service_role_policy ON customer_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to read customer history
CREATE POLICY customer_history_read_policy ON customer_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert/update customer history
CREATE POLICY customer_history_write_policy ON customer_history
    FOR INSERT, UPDATE
    TO authenticated
    WITH CHECK (true);

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON customer_history TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_customer_history(VARCHAR, VARCHAR, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION search_customers_by_name(VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_by_phone(VARCHAR) TO authenticated;

-- Grant permissions to service role (for backend API)
GRANT ALL ON customer_history TO service_role;
GRANT EXECUTE ON FUNCTION upsert_customer_history(VARCHAR, VARCHAR, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION search_customers_by_name(VARCHAR, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_by_phone(VARCHAR) TO service_role;

-- Grant permissions to anon role (for public access if needed)
GRANT SELECT ON customer_history TO anon;
GRANT EXECUTE ON FUNCTION search_customers_by_name(VARCHAR, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_customer_by_phone(VARCHAR) TO anon;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_history_updated_at
    BEFORE UPDATE ON customer_history
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_history_timestamp();
