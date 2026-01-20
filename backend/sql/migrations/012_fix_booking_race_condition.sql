-- =============================================
-- Migration 012: Fix Booking Race Condition
-- =============================================
-- Prevents double-booking by using atomic transaction
-- with row-level locking
-- =============================================

-- Create atomic booking function with proper locking
CREATE OR REPLACE FUNCTION create_booking_atomically(
    p_room_id UUID,
    p_customer_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_total_amount DECIMAL,
    p_guests INTEGER DEFAULT 1
) RETURNS JSON AS $$
DECLARE
    v_booking_id UUID;
    v_is_available BOOLEAN;
    v_room_capacity INTEGER;
    v_result JSON;
BEGIN
    -- 1. Lock the room row to prevent concurrent booking checks
    SELECT capacity INTO v_room_capacity
    FROM rooms
    WHERE id = p_room_id
    FOR UPDATE;  -- Row-level lock - other transactions must wait

    -- Check if room exists
    IF v_room_capacity IS NULL THEN
        RAISE EXCEPTION 'Room not found';
    END IF;

    -- Check guest capacity
    IF p_guests > v_room_capacity THEN
        RAISE EXCEPTION 'Number of guests exceeds room capacity';
    END IF;

    -- 2. Check availability within the locked transaction
    SELECT NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = p_room_id
        AND status NOT IN ('cancelled', 'checked_out', 'no_show')
        AND (
            -- Check for any date overlap
            (check_in_date <= p_check_in AND check_out_date > p_check_in)
            OR (check_in_date < p_check_out AND check_out_date >= p_check_out)
            OR (check_in_date >= p_check_in AND check_out_date <= p_check_out)
        )
    ) INTO v_is_available;

    -- 3. If not available, rollback
    IF NOT v_is_available THEN
        RAISE EXCEPTION 'Room not available for selected dates';
    END IF;

    -- 4. Validate dates
    IF p_check_in >= p_check_out THEN
        RAISE EXCEPTION 'Check-out date must be after check-in date';
    END IF;

    IF p_check_in < CURRENT_DATE THEN
        RAISE EXCEPTION 'Check-in date cannot be in the past';
    END IF;

    IF (p_check_out - p_check_in) > 365 THEN
        RAISE EXCEPTION 'Maximum booking duration is 365 days';
    END IF;

    -- 5. Create booking atomically
    INSERT INTO bookings (
        room_id,
        customer_id,
        check_in_date,
        check_out_date,
        total_amount,
        guests,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_room_id,
        p_customer_id,
        p_check_in,
        p_check_out,
        p_total_amount,
        p_guests,
        'pending',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_booking_id;

    -- 6. Return booking details as JSON
    SELECT json_build_object(
        'id', id,
        'room_id', room_id,
        'customer_id', customer_id,
        'check_in_date', check_in_date,
        'check_out_date', check_out_date,
        'total_amount', total_amount,
        'guests', guests,
        'status', status,
        'created_at', created_at
    ) INTO v_result
    FROM bookings
    WHERE id = v_booking_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION create_booking_atomically IS 'Creates a booking with atomic transaction and row-level locking to prevent race conditions and double-booking';

-- Create index to speed up availability checks
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates_status
ON bookings(room_id, check_in_date, check_out_date, status);

-- Add check constraint to prevent invalid dates at database level
ALTER TABLE bookings
ADD CONSTRAINT check_valid_dates
CHECK (check_out_date > check_in_date);

-- Add check constraint for reasonable booking duration
ALTER TABLE bookings
ADD CONSTRAINT check_max_duration
CHECK ((check_out_date - check_in_date) <= 365);

-- Add check constraint for non-negative amounts
ALTER TABLE bookings
ADD CONSTRAINT check_positive_amount
CHECK (total_amount >= 0);
