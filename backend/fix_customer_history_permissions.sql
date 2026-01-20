-- Fix RLS Permissions for customer_history table
-- Run this if you're getting "permission denied" errors

-- Drop existing policies first
DROP POLICY IF EXISTS customer_history_read_policy ON customer_history;
DROP POLICY IF EXISTS customer_history_write_policy ON customer_history;
DROP POLICY IF EXISTS customer_history_insert_policy ON customer_history;
DROP POLICY IF EXISTS customer_history_update_policy ON customer_history;
DROP POLICY IF EXISTS customer_history_service_role_policy ON customer_history;

-- Recreate functions with SECURITY DEFINER (allows them to run with elevated privileges)
CREATE OR REPLACE FUNCTION upsert_customer_history(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_order_amount DECIMAL DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_customer_id UUID;
BEGIN
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
        CASE
            WHEN LOWER(ch.customer_name) = LOWER(p_search_term) THEN 0
            WHEN LOWER(ch.customer_name) LIKE LOWER(p_search_term || '%') THEN 1
            ELSE 2
        END
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create new policies with proper permissions
-- Policy 1: Allow ALL operations for service role (backend API)
CREATE POLICY customer_history_service_role_policy ON customer_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy 2: Allow SELECT for authenticated users
CREATE POLICY customer_history_read_policy ON customer_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 3: Allow INSERT for authenticated users
CREATE POLICY customer_history_insert_policy ON customer_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy 4: Allow UPDATE for authenticated users
CREATE POLICY customer_history_update_policy ON customer_history
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant all necessary permissions to roles
GRANT SELECT, INSERT, UPDATE ON customer_history TO authenticated;
GRANT ALL ON customer_history TO service_role;
GRANT SELECT ON customer_history TO anon;

-- Grant function execution permissions to all roles
GRANT EXECUTE ON FUNCTION upsert_customer_history(VARCHAR, VARCHAR, DECIMAL) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION search_customers_by_name(VARCHAR, INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_customer_by_phone(VARCHAR) TO authenticated, service_role, anon;

-- Verify the setup
SELECT 'Permissions fixed successfully! ✅' as status;
