-- Create a dedicated sequence for order numbers to prevent duplicate key errors
-- Run this once in your Supabase SQL editor

-- 1. Create the sequence, starting after the current max order number
DO $$
DECLARE
    max_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CASE
            WHEN order_number ~ '^PH-[0-9]+$'
            THEN CAST(SPLIT_PART(order_number, '-', 2) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_num FROM orders;

    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH %s INCREMENT BY 1', max_num + 1);
END $$;

-- 2. Replace the order number generator with a sequence-based one
CREATE OR REPLACE FUNCTION next_order_number()
RETURNS TEXT AS $$
DECLARE
    next_val INTEGER;
BEGIN
    next_val := nextval('order_number_seq');
    IF next_val <= 999 THEN
        RETURN 'PH-' || LPAD(next_val::TEXT, 3, '0');
    ELSE
        RETURN 'PH-' || next_val::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;
