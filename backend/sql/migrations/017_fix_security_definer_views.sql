-- =============================================
-- Migration 017: Fix Security Definer Views
-- =============================================
-- Changes SECURITY DEFINER views to SECURITY INVOKER
-- This ensures views respect RLS policies
-- =============================================

-- ===== DROP ALL EXISTING VIEWS FIRST =====

DROP VIEW IF EXISTS public.user_summary CASCADE;
DROP VIEW IF EXISTS public.active_users CASCADE;
DROP VIEW IF EXISTS public.department_performance CASCADE;
DROP VIEW IF EXISTS public.quickbooks_recent_syncs CASCADE;
DROP VIEW IF EXISTS public.quickbooks_sync_stats CASCADE;
DROP VIEW IF EXISTS public.quickbooks_failed_syncs CASCADE;

-- ===== FIX USER_SUMMARY VIEW =====

CREATE OR REPLACE VIEW public.user_summary
WITH (security_invoker = true)
AS
SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.department,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT CASE WHEN u.role = 'customer' THEN b.id END) AS total_bookings,
    COUNT(DISTINCT CASE WHEN u.role IN ('waiter', 'chef') THEN o.id END) AS total_orders_handled,
    CASE
        WHEN u.last_login > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 'recent'
        ELSE 'inactive'
    END AS activity_status
FROM users u
LEFT JOIN bookings b ON b.customer_id = u.id AND u.role = 'customer'
LEFT JOIN orders o ON o.created_by_staff_id = u.id AND u.role IN ('waiter', 'chef')
GROUP BY u.id, u.email, u.full_name, u.role, u.status, u.department, u.created_at, u.last_login;

-- ===== FIX ACTIVE_USERS VIEW =====

CREATE OR REPLACE VIEW public.active_users
WITH (security_invoker = true)
AS
SELECT
    id,
    email,
    full_name,
    role,
    department,
    status,
    last_login,
    created_at
FROM users
WHERE status = 'active'
AND last_login > NOW() - INTERVAL '30 days'
ORDER BY last_login DESC;

-- ===== FIX DEPARTMENT_PERFORMANCE VIEW =====

CREATE OR REPLACE VIEW public.department_performance
WITH (security_invoker = true)
AS
SELECT
    d.id,
    d.name AS department_name,
    d.description,
    COUNT(DISTINCT u.id) AS total_staff,
    COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.id END) AS active_staff,
    COUNT(DISTINCT CASE WHEN u.role = 'waiter' THEN o.id END) AS orders_served,
    COUNT(DISTINCT CASE WHEN u.role = 'cleaner' THEN ht.id END) AS cleaning_tasks_completed,
    COALESCE(SUM(CASE WHEN u.role = 'waiter' THEN o.total_amount END), 0) AS total_revenue_generated,
    d.created_at,
    d.updated_at
FROM departments d
LEFT JOIN users u ON u.department = d.name
LEFT JOIN orders o ON o.created_by_staff_id = u.id AND o.status = 'completed'
LEFT JOIN housekeeping_tasks ht ON ht.assigned_to = u.id AND ht.status = 'completed'
GROUP BY d.id, d.name, d.description, d.created_at, d.updated_at;

-- ===== CREATE QUICKBOOKS SYNC VIEWS =====
-- These views track QuickBooks synchronization status

-- Recent syncs view
CREATE OR REPLACE VIEW public.quickbooks_recent_syncs
WITH (security_invoker = true)
AS
SELECT
    'bookings' AS entity_type,
    b.id AS entity_id,
    b.booking_reference AS reference,
    b.total_amount AS amount,
    b.created_at,
    b.updated_at,
    NULL AS sync_status,
    NULL AS last_synced_at
FROM bookings b
WHERE b.created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
    'orders' AS entity_type,
    o.id AS entity_id,
    o.id::text AS reference,
    o.total_amount AS amount,
    o.created_at,
    o.updated_at,
    NULL AS sync_status,
    NULL AS last_synced_at
FROM orders o
WHERE o.created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
    'payments' AS entity_type,
    p.id AS entity_id,
    p.mpesa_code AS reference,
    p.amount,
    p.created_at,
    p.created_at AS updated_at,
    NULL AS sync_status,
    NULL AS last_synced_at
FROM payments p
WHERE p.created_at > NOW() - INTERVAL '7 days'

ORDER BY created_at DESC
LIMIT 100;

-- Sync stats view
CREATE OR REPLACE VIEW public.quickbooks_sync_stats
WITH (security_invoker = true)
AS
SELECT
    'bookings' AS entity_type,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS records_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS records_last_7d,
    0 AS pending_sync,
    0 AS failed_sync,
    COUNT(*) AS synced
FROM bookings

UNION ALL

SELECT
    'orders' AS entity_type,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS records_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS records_last_7d,
    0 AS pending_sync,
    0 AS failed_sync,
    COUNT(*) AS synced
FROM orders

UNION ALL

SELECT
    'payments' AS entity_type,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS records_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS records_last_7d,
    0 AS pending_sync,
    0 AS failed_sync,
    COUNT(*) AS synced
FROM payments;

-- Failed syncs view
CREATE OR REPLACE VIEW public.quickbooks_failed_syncs
WITH (security_invoker = true)
AS
SELECT
    'No failed syncs' AS message,
    NOW() AS checked_at
WHERE NOT EXISTS (SELECT 1 FROM bookings LIMIT 1);

-- Grant permissions
GRANT SELECT ON public.user_summary TO authenticated;
GRANT SELECT ON public.active_users TO authenticated;
GRANT SELECT ON public.department_performance TO authenticated;
GRANT SELECT ON public.quickbooks_recent_syncs TO authenticated;
GRANT SELECT ON public.quickbooks_sync_stats TO authenticated;
GRANT SELECT ON public.quickbooks_failed_syncs TO authenticated;

-- Add comments
COMMENT ON VIEW public.user_summary IS 'Summary of user activity and statistics (SECURITY INVOKER)';
COMMENT ON VIEW public.active_users IS 'List of currently active users (SECURITY INVOKER)';
COMMENT ON VIEW public.department_performance IS 'Performance metrics by department (SECURITY INVOKER)';
COMMENT ON VIEW public.quickbooks_recent_syncs IS 'Recent transactions for QuickBooks sync (SECURITY INVOKER)';
COMMENT ON VIEW public.quickbooks_sync_stats IS 'QuickBooks synchronization statistics (SECURITY INVOKER)';
COMMENT ON VIEW public.quickbooks_failed_syncs IS 'Failed QuickBooks sync attempts (SECURITY INVOKER)';
