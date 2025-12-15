-- =====================================================
-- Database Health Check
-- Verify all tables and policies are working correctly
-- =====================================================

-- Check all tables exist
SELECT
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as "Command",
    qual as "USING expression"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count records in each table
SELECT 'staff' as table_name, COUNT(*) as count FROM public.staff
UNION ALL
SELECT 'housekeeping_tasks', COUNT(*) FROM public.housekeeping_tasks
UNION ALL
SELECT 'service_requests', COUNT(*) FROM public.service_requests
UNION ALL
SELECT 'reviews', COUNT(*) FROM public.reviews
UNION ALL
SELECT 'bookings', COUNT(*) FROM public.bookings
UNION ALL
SELECT 'rooms', COUNT(*) FROM public.rooms
UNION ALL
SELECT 'menu_items', COUNT(*) FROM public.menu_items
ORDER BY table_name;

-- Check for any active triggers
SELECT
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_statement as function
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check service_role policies exist
SELECT
    tablename,
    COUNT(*) as policy_count,
    COUNT(*) FILTER (WHERE policyname LIKE '%service_role%') as service_role_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
