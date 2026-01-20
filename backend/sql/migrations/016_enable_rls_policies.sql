-- =============================================
-- Migration 016: Enable Row Level Security (RLS)
-- =============================================
-- Enables RLS on all public tables
-- Adds comprehensive security policies
-- =============================================

-- ===== DROP EXISTING POLICIES (Idempotent) =====

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ===== ENABLE RLS ON ALL TABLES =====

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_and_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on housekeeping tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_tasks') THEN
        ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ===== USERS TABLE POLICIES =====

-- Admins can do everything with users
CREATE POLICY "Admins have full access to users"
ON public.users
FOR ALL
TO authenticated
USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Users can read their own data
CREATE POLICY "Users can read their own data"
ON public.users
FOR SELECT
TO authenticated
USING (
    auth.uid()::text = id::text
);

-- Users can update their own data
CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
TO authenticated
USING (
    auth.uid()::text = id::text
);

-- Staff can read other staff members
CREATE POLICY "Staff can read other staff"
ON public.users
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter', 'chef', 'cleaner')
);

-- ===== ROOMS TABLE POLICIES =====

-- Anyone authenticated can view rooms
CREATE POLICY "Authenticated users can view rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (true);

-- Only admins and managers can modify rooms
CREATE POLICY "Admins and managers can modify rooms"
ON public.rooms
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
);

-- ===== BOOKINGS TABLE POLICIES =====

-- Customers can view their own bookings
CREATE POLICY "Customers can view their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    customer_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist')
);

-- Customers can create their own bookings
CREATE POLICY "Customers can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    customer_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist')
);

-- Staff can manage bookings
CREATE POLICY "Staff can manage bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist')
);

-- ===== ORDERS TABLE POLICIES =====

-- Customers can view their own orders
CREATE POLICY "Customers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
    customer_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter', 'chef')
);

-- Customers can create orders
CREATE POLICY "Customers can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
    customer_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- Staff can manage orders
CREATE POLICY "Staff can manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter', 'chef')
);

-- ===== MENU_ITEMS TABLE POLICIES =====

-- Anyone can view menu items
CREATE POLICY "Anyone can view menu items"
ON public.menu_items
FOR SELECT
TO authenticated
USING (true);

-- Only admins, managers, and chefs can modify menu
CREATE POLICY "Staff can modify menu items"
ON public.menu_items
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'chef')
);

-- ===== PAYMENTS TABLE POLICIES =====

-- Customers can view their own payments (via bill -> bill_orders -> orders)
CREATE POLICY "Customers can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.bill_orders bo
        JOIN public.orders o ON o.id = bo.order_id
        WHERE bo.bill_id = payments.bill_id
        AND o.customer_id::text = auth.uid()::text
    )
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- Staff can manage payments
CREATE POLICY "Staff can manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- ===== BILLS TABLE POLICIES =====

-- Customers can view their own bills (via bill_orders -> orders)
CREATE POLICY "Customers can view their own bills"
ON public.bills
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.bill_orders bo
        JOIN public.orders o ON o.id = bo.order_id
        WHERE bo.bill_id = bills.id
        AND o.customer_id::text = auth.uid()::text
    )
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- Staff can manage bills
CREATE POLICY "Staff can manage bills"
ON public.bills
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- ===== BILL_ORDERS TABLE POLICIES =====

-- Customers can view their bill orders (via orders)
CREATE POLICY "Customers can view their bill orders"
ON public.bill_orders
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = bill_orders.order_id
        AND orders.customer_id::text = auth.uid()::text
    )
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- Staff can manage bill orders
CREATE POLICY "Staff can manage bill orders"
ON public.bill_orders
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'waiter')
);

-- ===== REVIEWS TABLE POLICIES =====

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);

-- Customers can create reviews
CREATE POLICY "Customers can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
    user_id::text = auth.uid()::text
);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
    user_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
);

-- ===== DEPARTMENTS TABLE POLICIES =====

-- Everyone can view departments
CREATE POLICY "Everyone can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify departments
CREATE POLICY "Admins can modify departments"
ON public.departments
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text = 'admin'
);

-- ===== DEPARTMENT_BUDGETS TABLE POLICIES =====

-- Managers and admins can view budgets
CREATE POLICY "Managers and admins can view budgets"
ON public.department_budgets
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
);

-- Only admins can modify budgets
CREATE POLICY "Admins can modify budgets"
ON public.department_budgets
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text = 'admin'
);

-- ===== EXPENSES TABLE POLICIES =====

-- Staff can view expenses
CREATE POLICY "Staff can view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
);

-- Admins can manage expenses
CREATE POLICY "Admins can manage expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text = 'admin'
);

-- ===== SERVICE_REQUESTS TABLE POLICIES =====

-- Customers can view their own requests
CREATE POLICY "Customers can view their own service requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
    guest_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist')
);

-- Customers can create requests
CREATE POLICY "Customers can create service requests"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (
    guest_id::text = auth.uid()::text
);

-- Staff can manage requests
CREATE POLICY "Staff can manage service requests"
ON public.service_requests
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist')
);

-- ===== LOST_AND_FOUND TABLE POLICIES =====

-- Staff can view lost and found
CREATE POLICY "Staff can view lost and found"
ON public.lost_and_found
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist', 'cleaner')
);

-- Staff can manage lost and found
CREATE POLICY "Staff can manage lost and found"
ON public.lost_and_found
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager', 'receptionist')
);

-- ===== NOTIFICATION_PREFERENCES TABLE POLICIES =====

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (
    user_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text = 'admin'
);

-- ===== AUDIT LOGS (Read-only for security) =====

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.user_audit_log
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text = 'admin'
);

-- ===== DEPARTMENT_CHANGE_LOG (Read-only for security) =====

-- Admins and managers can view change log
CREATE POLICY "Admins and managers can view change log"
ON public.department_change_log
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
);

-- ===== EMAIL_VERIFICATIONS TABLE POLICIES =====

-- Users can view their own verifications
CREATE POLICY "Users can view their own email verifications"
ON public.email_verifications
FOR SELECT
TO authenticated
USING (
    user_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text = 'admin'
);

-- System can insert verifications
CREATE POLICY "System can create email verifications"
ON public.email_verifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ===== PHONE_VERIFICATIONS TABLE POLICIES =====

-- Users can view their own verifications
CREATE POLICY "Users can view their own phone verifications"
ON public.phone_verifications
FOR SELECT
TO authenticated
USING (
    user_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'role')::text = 'admin'
);

-- System can insert verifications
CREATE POLICY "System can create phone verifications"
ON public.phone_verifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ===== OPTIONAL TABLES =====

-- Housekeeping tasks
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_tasks') THEN
        -- Cleaners can view their assigned tasks
        EXECUTE 'CREATE POLICY "Cleaners can view their tasks"
        ON public.housekeeping_tasks
        FOR SELECT
        TO authenticated
        USING (
            assigned_to::text = auth.uid()::text
            OR (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';

        -- Managers can manage tasks
        EXECUTE 'CREATE POLICY "Managers can manage housekeeping tasks"
        ON public.housekeeping_tasks
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';
    END IF;
END $$;

-- Notifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Users can view their own notifications
        EXECUTE 'CREATE POLICY "Users can view their own notifications"
        ON public.notifications
        FOR SELECT
        TO authenticated
        USING (
            user_id::text = auth.uid()::text
        )';

        -- System can create notifications
        EXECUTE 'CREATE POLICY "System can create notifications"
        ON public.notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true)';

        -- Users can update their own notifications (mark as read)
        EXECUTE 'CREATE POLICY "Users can update their own notifications"
        ON public.notifications
        FOR UPDATE
        TO authenticated
        USING (
            user_id::text = auth.uid()::text
        )';
    END IF;
END $$;

-- Order items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        -- Customers can view their order items
        EXECUTE 'CREATE POLICY "Customers can view their order items"
        ON public.order_items
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.orders
                WHERE orders.id = order_items.order_id
                AND orders.customer_id::text = auth.uid()::text
            )
            OR (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''waiter'', ''chef'')
        )';

        -- Staff can manage order items
        EXECUTE 'CREATE POLICY "Staff can manage order items"
        ON public.order_items
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''waiter'', ''chef'')
        )';
    END IF;
END $$;

-- ===== ADDITIONAL TABLES (New Tables from Screenshot) =====

-- Profiles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "Users can view their own profile"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (
            id::text = auth.uid()::text
            OR (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';

        EXECUTE 'CREATE POLICY "Users can update their own profile"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (
            id::text = auth.uid()::text
        )';

        EXECUTE 'CREATE POLICY "Admins can manage profiles"
        ON public.profiles
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text = ''admin''
        )';
    END IF;
END $$;

-- Maintenance issues table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_issues') THEN
        ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "Staff can view maintenance issues"
        ON public.maintenance_issues
        FOR SELECT
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'', ''receptionist'')
        )';

        EXECUTE 'CREATE POLICY "Staff can create maintenance issues"
        ON public.maintenance_issues
        FOR INSERT
        TO authenticated
        WITH CHECK (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'', ''receptionist'')
        )';

        EXECUTE 'CREATE POLICY "Managers can manage maintenance issues"
        ON public.maintenance_issues
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';
    END IF;
END $$;

-- Room inspections table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_inspections') THEN
        ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "Staff can view room inspections"
        ON public.room_inspections
        FOR SELECT
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'')
        )';

        EXECUTE 'CREATE POLICY "Cleaners and managers can create inspections"
        ON public.room_inspections
        FOR INSERT
        TO authenticated
        WITH CHECK (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'')
        )';

        EXECUTE 'CREATE POLICY "Managers can manage inspections"
        ON public.room_inspections
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';
    END IF;
END $$;

-- Housekeeping supplies table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_supplies') THEN
        ALTER TABLE public.housekeeping_supplies ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "Staff can view housekeeping supplies"
        ON public.housekeeping_supplies
        FOR SELECT
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'')
        )';

        EXECUTE 'CREATE POLICY "Managers can manage housekeeping supplies"
        ON public.housekeeping_supplies
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';
    END IF;
END $$;

-- Supply usage table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supply_usage') THEN
        ALTER TABLE public.supply_usage ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "Staff can view supply usage"
        ON public.supply_usage
        FOR SELECT
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'')
        )';

        EXECUTE 'CREATE POLICY "Cleaners can record supply usage"
        ON public.supply_usage
        FOR INSERT
        TO authenticated
        WITH CHECK (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'', ''cleaner'')
        )';

        EXECUTE 'CREATE POLICY "Managers can manage supply usage"
        ON public.supply_usage
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';
    END IF;
END $$;

-- Housekeeping schedules table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'housekeeping_schedules') THEN
        ALTER TABLE public.housekeeping_schedules ENABLE ROW LEVEL SECURITY;

        EXECUTE 'CREATE POLICY "Cleaners can view their schedules"
        ON public.housekeeping_schedules
        FOR SELECT
        TO authenticated
        USING (
            assigned_to::text = auth.uid()::text
            OR (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';

        EXECUTE 'CREATE POLICY "Managers can manage schedules"
        ON public.housekeeping_schedules
        FOR ALL
        TO authenticated
        USING (
            (auth.jwt() ->> ''role'')::text IN (''admin'', ''manager'')
        )';
    END IF;
END $$;

-- ===== VIEWS (Security Definer Views) =====
-- Views inherit RLS from underlying tables, but we need to grant access

-- Grant access to views for authenticated users
DO $$
BEGIN
    -- QuickBooks sync views
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'quickbooks_recent_syncs') THEN
        EXECUTE 'GRANT SELECT ON public.quickbooks_recent_syncs TO authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'quickbooks_sync_stats') THEN
        EXECUTE 'GRANT SELECT ON public.quickbooks_sync_stats TO authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'quickbooks_failed_syncs') THEN
        EXECUTE 'GRANT SELECT ON public.quickbooks_failed_syncs TO authenticated';
    END IF;

    -- User summary views
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_summary') THEN
        EXECUTE 'GRANT SELECT ON public.user_summary TO authenticated';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_users') THEN
        EXECUTE 'GRANT SELECT ON public.active_users TO authenticated';
    END IF;

    -- Department performance view
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'department_performance') THEN
        EXECUTE 'GRANT SELECT ON public.department_performance TO authenticated';
    END IF;
END $$;

-- Add comments
COMMENT ON POLICY "Admins have full access to users" ON public.users IS 'Admins can perform all operations on users table';
COMMENT ON POLICY "Users can read their own data" ON public.users IS 'Users can view their own profile';
COMMENT ON POLICY "Authenticated users can view rooms" ON public.rooms IS 'All logged-in users can browse available rooms';
COMMENT ON POLICY "Customers can view their own bookings" ON public.bookings IS 'Customers can only see their own booking history';

-- Analyze tables
ANALYZE public.users;
ANALYZE public.rooms;
ANALYZE public.bookings;
ANALYZE public.orders;
ANALYZE public.payments;
ANALYZE public.bills;
