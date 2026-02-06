-- Add permissions column to users table for granular access control

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN users.permissions IS 'Array of permission strings for granular access control';

-- Example permissions:
-- can_manage_staff, can_view_reports, can_manage_inventory, can_manage_rooms,
-- can_manage_bookings, can_manage_orders, can_process_payments, can_view_analytics,
-- can_manage_menu, can_manage_housekeeping, can_assign_tasks, can_manage_permissions
