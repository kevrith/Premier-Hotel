-- =====================================================
-- Fix Check-in/Check-out RLS Policies
-- Fixes "column user_id does not exist" error
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Users can create own registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Users can update own pending registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Staff can view all registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Staff can manage registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Service role full access to guest_registrations" ON public.guest_registrations;

DROP POLICY IF EXISTS "Users can view own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Staff can manage checkins" ON public.checkins;
DROP POLICY IF EXISTS "Service role full access to checkins" ON public.checkins;

DROP POLICY IF EXISTS "Users can view own checkouts" ON public.checkouts;
DROP POLICY IF EXISTS "Staff can manage checkouts" ON public.checkouts;
DROP POLICY IF EXISTS "Service role full access to checkouts" ON public.checkouts;

DROP POLICY IF EXISTS "Users can manage own requests" ON public.checkin_checkout_requests;
DROP POLICY IF EXISTS "Staff can view all requests" ON public.checkin_checkout_requests;
DROP POLICY IF EXISTS "Staff can process requests" ON public.checkin_checkout_requests;
DROP POLICY IF EXISTS "Service role full access to requests" ON public.checkin_checkout_requests;

-- =====================================================
-- Recreate Guest Registrations Policies with proper table qualifiers
-- =====================================================

CREATE POLICY "Users can view own registrations"
    ON public.guest_registrations FOR SELECT
    USING (guest_registrations.user_id = (select auth.uid()));

CREATE POLICY "Users can create own registrations"
    ON public.guest_registrations FOR INSERT
    WITH CHECK (guest_registrations.user_id = (select auth.uid()));

CREATE POLICY "Users can update own pending registrations"
    ON public.guest_registrations FOR UPDATE
    USING (guest_registrations.user_id = (select auth.uid()) AND guest_registrations.status = 'pending');

CREATE POLICY "Staff can view all registrations"
    ON public.guest_registrations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can manage registrations"
    ON public.guest_registrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- =====================================================
-- Recreate Check-ins Policies
-- =====================================================

CREATE POLICY "Users can view own checkins"
    ON public.checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = checkins.booking_id
            AND bookings.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Staff can manage checkins"
    ON public.checkins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- =====================================================
-- Recreate Check-outs Policies
-- =====================================================

CREATE POLICY "Users can view own checkouts"
    ON public.checkouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = checkouts.booking_id
            AND bookings.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Staff can manage checkouts"
    ON public.checkouts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- =====================================================
-- Recreate Requests Policies
-- =====================================================

CREATE POLICY "Users can manage own requests"
    ON public.checkin_checkout_requests FOR ALL
    USING (checkin_checkout_requests.user_id = (select auth.uid()))
    WITH CHECK (checkin_checkout_requests.user_id = (select auth.uid()));

CREATE POLICY "Staff can view all requests"
    ON public.checkin_checkout_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can process requests"
    ON public.checkin_checkout_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- =====================================================
-- Service role full access policies
-- =====================================================

CREATE POLICY "Service role full access to guest_registrations"
    ON public.guest_registrations FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to checkins"
    ON public.checkins FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to checkouts"
    ON public.checkouts FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to requests"
    ON public.checkin_checkout_requests FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');
