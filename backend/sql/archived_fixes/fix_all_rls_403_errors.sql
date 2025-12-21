-- =====================================================
-- Fix All 403 Authorization Errors
-- Ensures service_role has full access to all tables
-- =====================================================

-- =====================================================
-- STAFF TABLES
-- =====================================================

-- Add service role policies for staff
DROP POLICY IF EXISTS "Service role full access to staff" ON public.staff;
CREATE POLICY "Service role full access to staff"
    ON public.staff FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to staff_shifts" ON public.staff_shifts;
CREATE POLICY "Service role full access to staff_shifts"
    ON public.staff_shifts FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to staff_attendance" ON public.staff_attendance;
CREATE POLICY "Service role full access to staff_attendance"
    ON public.staff_attendance FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to staff_performance" ON public.staff_performance;
CREATE POLICY "Service role full access to staff_performance"
    ON public.staff_performance FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to staff_leaves" ON public.staff_leaves;
CREATE POLICY "Service role full access to staff_leaves"
    ON public.staff_leaves FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- HOUSEKEEPING TABLES
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to housekeeping_tasks" ON public.housekeeping_tasks;
CREATE POLICY "Service role full access to housekeeping_tasks"
    ON public.housekeeping_tasks FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to room_inspections" ON public.room_inspections;
CREATE POLICY "Service role full access to room_inspections"
    ON public.room_inspections FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to housekeeping_supplies" ON public.housekeeping_supplies;
CREATE POLICY "Service role full access to housekeeping_supplies"
    ON public.housekeeping_supplies FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to supply_usage" ON public.supply_usage;
CREATE POLICY "Service role full access to supply_usage"
    ON public.supply_usage FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to housekeeping_schedules" ON public.housekeeping_schedules;
CREATE POLICY "Service role full access to housekeeping_schedules"
    ON public.housekeeping_schedules FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to lost_and_found" ON public.lost_and_found;
CREATE POLICY "Service role full access to lost_and_found"
    ON public.lost_and_found FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- SERVICE REQUESTS TABLES
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to service_request_types" ON public.service_request_types;
CREATE POLICY "Service role full access to service_request_types"
    ON public.service_request_types FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to service_requests" ON public.service_requests;
CREATE POLICY "Service role full access to service_requests"
    ON public.service_requests FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to service_request_status_history" ON public.service_request_status_history;
CREATE POLICY "Service role full access to service_request_status_history"
    ON public.service_request_status_history FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to service_request_attachments" ON public.service_request_attachments;
CREATE POLICY "Service role full access to service_request_attachments"
    ON public.service_request_attachments FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to service_request_comments" ON public.service_request_comments;
CREATE POLICY "Service role full access to service_request_comments"
    ON public.service_request_comments FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- EXISTING CORE TABLES (if not already added)
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to rooms" ON public.rooms;
CREATE POLICY "Service role full access to rooms"
    ON public.rooms FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to bookings" ON public.bookings;
CREATE POLICY "Service role full access to bookings"
    ON public.bookings FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to payments" ON public.payments;
CREATE POLICY "Service role full access to payments"
    ON public.payments FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to orders" ON public.orders;
CREATE POLICY "Service role full access to orders"
    ON public.orders FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to menu_items" ON public.menu_items;
CREATE POLICY "Service role full access to menu_items"
    ON public.menu_items FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
CREATE POLICY "Service role full access to profiles"
    ON public.profiles FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- ALTERNATIVE: If service_role policies don't work,
-- add anon access for read operations
-- =====================================================

-- Allow anonymous read access to public data (optional, uncomment if needed)
-- CREATE POLICY "Anon read access to menu_items"
--     ON public.menu_items FOR SELECT
--     USING (true);

-- CREATE POLICY "Anon read access to rooms"
--     ON public.rooms FOR SELECT
--     USING (is_available = true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Service role full access to staff" ON public.staff IS 'FastAPI backend uses service_role for full access';
COMMENT ON POLICY "Service role full access to service_requests" ON public.service_requests IS 'FastAPI backend uses service_role for full access';
