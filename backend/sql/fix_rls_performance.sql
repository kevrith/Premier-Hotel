-- =====================================================
-- Fix RLS Performance Warnings
-- This migration optimizes RLS policies by wrapping auth functions
-- in SELECT subqueries to prevent per-row re-evaluation
-- =====================================================

-- The fix: Replace auth.uid() with (select auth.uid())
-- This ensures the function is evaluated once per query, not per row

-- =====================================================
-- PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (user_id = (select auth.uid()));

-- =====================================================
-- BOOKINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
    ON public.bookings FOR SELECT
    USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- ORDERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- REVIEWS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own payments" ON public.payments;
CREATE POLICY "Users can create own payments"
    ON public.payments FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own pending payments" ON public.payments;
CREATE POLICY "Users can update own pending payments"
    ON public.payments FOR UPDATE
    USING (user_id = (select auth.uid()) AND status = 'pending')
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Service role full access" ON public.payments;
CREATE POLICY "Service role full access"
    ON public.payments FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- HOUSEKEEPING_TASKS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Cleaners can view assigned tasks" ON public.housekeeping_tasks;
CREATE POLICY "Cleaners can view assigned tasks"
    ON public.housekeeping_tasks FOR SELECT
    USING (
        assigned_to = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Cleaners can update assigned tasks" ON public.housekeeping_tasks;
CREATE POLICY "Cleaners can update assigned tasks"
    ON public.housekeeping_tasks FOR UPDATE
    USING (
        assigned_to = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Admin and managers can create tasks" ON public.housekeeping_tasks;
CREATE POLICY "Admin and managers can create tasks"
    ON public.housekeeping_tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Admin and managers can delete tasks" ON public.housekeeping_tasks;
CREATE POLICY "Admin and managers can delete tasks"
    ON public.housekeeping_tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Service role full access to tasks" ON public.housekeeping_tasks;
CREATE POLICY "Service role full access to tasks"
    ON public.housekeeping_tasks FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- ROOM_INSPECTIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Staff can view inspections" ON public.room_inspections;
CREATE POLICY "Staff can view inspections"
    ON public.room_inspections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Managers can create inspections" ON public.room_inspections;
CREATE POLICY "Managers can create inspections"
    ON public.room_inspections FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Service role full access to inspections" ON public.room_inspections;
CREATE POLICY "Service role full access to inspections"
    ON public.room_inspections FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- HOUSEKEEPING_SUPPLIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Staff can view supplies" ON public.housekeeping_supplies;
CREATE POLICY "Staff can view supplies"
    ON public.housekeeping_supplies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Managers can manage supplies" ON public.housekeeping_supplies;
CREATE POLICY "Managers can manage supplies"
    ON public.housekeeping_supplies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Service role full access to supplies" ON public.housekeeping_supplies;
CREATE POLICY "Service role full access to supplies"
    ON public.housekeeping_supplies FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- SUPPLY_USAGE TABLE
-- =====================================================

DROP POLICY IF EXISTS "Staff can view usage logs" ON public.supply_usage;
CREATE POLICY "Staff can view usage logs"
    ON public.supply_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Staff can log usage" ON public.supply_usage;
CREATE POLICY "Staff can log usage"
    ON public.supply_usage FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Service role full access to usage" ON public.supply_usage;
CREATE POLICY "Service role full access to usage"
    ON public.supply_usage FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- HOUSEKEEPING_SCHEDULES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Staff can view schedules" ON public.housekeeping_schedules;
CREATE POLICY "Staff can view schedules"
    ON public.housekeeping_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Managers can manage schedules" ON public.housekeeping_schedules;
CREATE POLICY "Managers can manage schedules"
    ON public.housekeeping_schedules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Service role full access to schedules" ON public.housekeeping_schedules;
CREATE POLICY "Service role full access to schedules"
    ON public.housekeeping_schedules FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- LOST_AND_FOUND TABLE
-- =====================================================

DROP POLICY IF EXISTS "Staff can view lost and found" ON public.lost_and_found;
CREATE POLICY "Staff can view lost and found"
    ON public.lost_and_found FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Staff can create lost and found entries" ON public.lost_and_found;
CREATE POLICY "Staff can create lost and found entries"
    ON public.lost_and_found FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'cleaner')
        )
    );

DROP POLICY IF EXISTS "Managers can update lost and found" ON public.lost_and_found;
CREATE POLICY "Managers can update lost and found"
    ON public.lost_and_found FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE users.id = (select auth.uid())
            AND users.raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "Service role full access to lost and found" ON public.lost_and_found;
CREATE POLICY "Service role full access to lost and found"
    ON public.lost_and_found FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- STAFF_SHIFTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to shifts" ON public.staff_shifts;
CREATE POLICY "Service role full access to shifts"
    ON public.staff_shifts FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- STAFF_ATTENDANCE TABLE
-- =====================================================

DROP POLICY IF EXISTS "Staff can view own attendance" ON public.staff_attendance;
CREATE POLICY "Staff can view own attendance"
    ON public.staff_attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE staff.id = staff_attendance.staff_id
            AND staff.user_id = (select auth.uid())
        )
    );

-- =====================================================
-- SERVICE_REQUEST_TYPES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage request types" ON public.service_request_types;
CREATE POLICY "Admins can manage request types"
    ON public.service_request_types FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- =====================================================
-- SERVICE_REQUESTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Guests can view their own requests" ON public.service_requests;
CREATE POLICY "Guests can view their own requests"
    ON public.service_requests FOR SELECT
    USING (guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Guests can create their own requests" ON public.service_requests;
CREATE POLICY "Guests can create their own requests"
    ON public.service_requests FOR INSERT
    WITH CHECK (guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Guests can update their own pending requests" ON public.service_requests;
CREATE POLICY "Guests can update their own pending requests"
    ON public.service_requests FOR UPDATE
    USING (guest_id = (select auth.uid()) AND status = 'pending')
    WITH CHECK (guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Staff can view all requests" ON public.service_requests;
CREATE POLICY "Staff can view all requests"
    ON public.service_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Staff can update assigned requests" ON public.service_requests;
CREATE POLICY "Staff can update assigned requests"
    ON public.service_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Admins can manage all requests" ON public.service_requests;
CREATE POLICY "Admins can manage all requests"
    ON public.service_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- =====================================================
-- SERVICE_REQUEST_STATUS_HISTORY TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view status history for their requests" ON public.service_request_status_history;
CREATE POLICY "Users can view status history for their requests"
    ON public.service_request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = service_request_status_history.request_id
            AND guest_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Staff can view all status history" ON public.service_request_status_history;
CREATE POLICY "Staff can view all status history"
    ON public.service_request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- =====================================================
-- SERVICE_REQUEST_ATTACHMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view attachments for their requests" ON public.service_request_attachments;
CREATE POLICY "Users can view attachments for their requests"
    ON public.service_request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = service_request_attachments.request_id
            AND guest_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can upload attachments to their requests" ON public.service_request_attachments;
CREATE POLICY "Users can upload attachments to their requests"
    ON public.service_request_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = request_id
            AND guest_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Staff can view all attachments" ON public.service_request_attachments;
CREATE POLICY "Staff can view all attachments"
    ON public.service_request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- =====================================================
-- SERVICE_REQUEST_COMMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view comments on their requests" ON public.service_request_comments;
CREATE POLICY "Users can view comments on their requests"
    ON public.service_request_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = service_request_comments.request_id
            AND guest_id = (select auth.uid())
        )
        AND is_internal = false
    );

DROP POLICY IF EXISTS "Users can add comments to their requests" ON public.service_request_comments;
CREATE POLICY "Users can add comments to their requests"
    ON public.service_request_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = request_id
            AND guest_id = (select auth.uid())
        )
        AND user_id = (select auth.uid())
    );

DROP POLICY IF EXISTS "Staff can view all comments" ON public.service_request_comments;
CREATE POLICY "Staff can view all comments"
    ON public.service_request_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

DROP POLICY IF EXISTS "Staff can add comments" ON public.service_request_comments;
CREATE POLICY "Staff can add comments"
    ON public.service_request_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
        AND user_id = (select auth.uid())
    );

-- =====================================================
-- Verification Query
-- =====================================================

-- Run this to verify the policies are updated:
-- SELECT
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Optimized RLS: Users can update their own profile. Uses (select auth.uid()) for performance.';
COMMENT ON POLICY "Users can view own bookings" ON public.bookings IS 'Optimized RLS: Users can view their own bookings. Uses (select auth.uid()) for performance.';
COMMENT ON POLICY "Users can create bookings" ON public.bookings IS 'Optimized RLS: Users can create bookings. Uses (select auth.uid()) for performance.';
COMMENT ON POLICY "Users can view own orders" ON public.orders IS 'Optimized RLS: Users can view their own orders. Uses (select auth.uid()) for performance.';
COMMENT ON POLICY "Users can create orders" ON public.orders IS 'Optimized RLS: Users can create orders. Uses (select auth.uid()) for performance.';
