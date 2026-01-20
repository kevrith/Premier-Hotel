-- Disable Row Level Security on all application tables
-- RLS is incompatible with custom JWT authentication
-- API-level authorization is enforced via middleware (require_admin, require_staff, get_current_user)

-- Core tables
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms DISABLE ROW LEVEL SECURITY;

-- User and profile tables (keep auth tables protected)
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Additional feature tables
ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenance_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS housekeeping_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS phone_verifications DISABLE ROW LEVEL SECURITY;

-- Note: auth_audit_log intentionally keeps RLS for security auditing
