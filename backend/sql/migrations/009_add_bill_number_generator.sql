-- Migration 009: Add Bill Number Generator Function
-- Run this after 006 is successful
-- This creates the function to generate unique bill numbers

CREATE OR REPLACE FUNCTION generate_bill_number(
    p_location_type VARCHAR,
    p_location VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR;
    today_date VARCHAR;
    sequence_num INTEGER;
BEGIN
    -- Determine prefix based on location type
    IF p_location_type = 'table' THEN
        prefix := 'BILL-T' || p_location;
    ELSIF p_location_type = 'room' THEN
        prefix := 'BILL-R' || p_location;
    ELSE
        prefix := 'BILL';
    END IF;

    -- Get today's date
    today_date := TO_CHAR(NOW(), 'YYYYMMDD');

    -- Find next sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM bills
    WHERE bill_number LIKE prefix || '-' || today_date || '-%';

    -- Return formatted bill number
    RETURN prefix || '-' || today_date || '-' || LPAD(sequence_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

SELECT 'Bill number generator function created!' as status;
