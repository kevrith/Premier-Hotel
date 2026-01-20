-- =============================================
-- Migration 018: Fix Function Search Path
-- =============================================
-- Sets search_path on all functions for security
-- Prevents schema injection attacks
-- =============================================

-- ===== SET SEARCH PATH ON ALL EXISTING FUNCTIONS =====

DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
BEGIN
    -- Loop through ALL functions in public schema and set search_path
    FOR func_record IN
        SELECT
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS args,
            n.nspname AS schema_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- Only functions, not procedures
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
                func_record.schema_name,
                func_record.function_name,
                func_record.args
            );
            func_count := func_count + 1;
            RAISE NOTICE 'Set search_path for function: %.%(%)',
                func_record.schema_name,
                func_record.function_name,
                func_record.args;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not set search_path for %.%: %',
                    func_record.schema_name,
                    func_record.function_name,
                    SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Successfully set search_path on % functions', func_count;
END $$;

-- Add comments for functions that exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_room_availability') THEN
        COMMENT ON FUNCTION public.check_room_availability IS 'Checks if room is available for booking period (SECURE)';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_bill_number') THEN
        COMMENT ON FUNCTION public.generate_bill_number IS 'Generates unique bill number (SECURE)';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_bill_totals') THEN
        COMMENT ON FUNCTION public.calculate_bill_totals IS 'Calculates bill totals from orders (SECURE)';
    END IF;
END $$;
