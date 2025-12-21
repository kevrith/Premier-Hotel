-- =====================================================
-- Fix Function Search Path Security Warnings
-- This migration adds explicit search_path to all functions
-- to prevent search_path manipulation attacks
-- =====================================================

-- Fix: update_payments_updated_at
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix: update_service_request_types_updated_at
CREATE OR REPLACE FUNCTION public.update_service_request_types_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix: update_service_requests_updated_at
CREATE OR REPLACE FUNCTION public.update_service_requests_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix: log_service_request_status_change
CREATE OR REPLACE FUNCTION public.log_service_request_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.service_request_status_history (
            request_id,
            old_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.assigned_by,
            CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Fix: update_service_request_comments_updated_at
CREATE OR REPLACE FUNCTION public.update_service_request_comments_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix: update_updated_at_column (generic function used by staff tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix: check_room_availability
CREATE OR REPLACE FUNCTION public.check_room_availability(
    p_room_id UUID,
    p_check_in DATE,
    p_check_out DATE
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_available BOOLEAN;
BEGIN
    -- Check if room has any overlapping bookings
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.bookings
        WHERE room_id = p_room_id
        AND status NOT IN ('cancelled', 'rejected')
        AND (
            (check_in_date <= p_check_in AND check_out_date > p_check_in)
            OR (check_in_date < p_check_out AND check_out_date >= p_check_out)
            OR (check_in_date >= p_check_in AND check_out_date <= p_check_out)
        )
    ) INTO v_is_available;

    RETURN v_is_available;
END;
$$;

-- Fix: generate_booking_reference
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_reference TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate reference: BK-YYYYMMDD-XXXX (e.g., BK-20240115-1234)
        v_reference := 'BK-' ||
                      TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

        -- Check if reference already exists
        SELECT EXISTS(
            SELECT 1 FROM public.bookings WHERE booking_reference = v_reference
        ) INTO v_exists;

        -- Exit loop if unique reference found
        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_reference;
END;
$$;

-- Fix: generate_order_number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_number TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate order number: ORD-YYYYMMDD-XXXX (e.g., ORD-20240115-1234)
        v_order_number := 'ORD-' ||
                         TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                         LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

        -- Check if order number already exists
        SELECT EXISTS(
            SELECT 1 FROM public.orders WHERE order_number = v_order_number
        ) INTO v_exists;

        -- Exit loop if unique order number found
        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_order_number;
END;
$$;

-- =====================================================
-- Verification
-- =====================================================

-- You can verify the fixes by running:
-- SELECT
--     routine_name,
--     routine_type,
--     security_type,
--     specific_name
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN (
--     'update_payments_updated_at',
--     'update_service_request_types_updated_at',
--     'update_service_requests_updated_at',
--     'log_service_request_status_change',
--     'update_service_request_comments_updated_at',
--     'update_updated_at_column',
--     'check_room_availability',
--     'generate_booking_reference',
--     'generate_order_number'
-- );

-- Expected output should show:
-- - security_type = 'DEFINER' for all functions

COMMENT ON FUNCTION public.update_payments_updated_at() IS 'Trigger function to update updated_at timestamp on payments table. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.update_service_request_types_updated_at() IS 'Trigger function to update updated_at timestamp on service_request_types table. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.update_service_requests_updated_at() IS 'Trigger function to update updated_at timestamp on service_requests table. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.log_service_request_status_change() IS 'Trigger function to log status changes to service_request_status_history. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.update_service_request_comments_updated_at() IS 'Trigger function to update updated_at timestamp on service_request_comments table. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Generic trigger function to update updated_at timestamp. Used by staff tables. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.check_room_availability(UUID, DATE, DATE) IS 'Checks if a room is available for the given date range. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.generate_booking_reference() IS 'Generates a unique booking reference number. SECURITY DEFINER with explicit search_path.';
COMMENT ON FUNCTION public.generate_order_number() IS 'Generates a unique order number. SECURITY DEFINER with explicit search_path.';
