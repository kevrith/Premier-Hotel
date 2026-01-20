-- ====================================================================
-- PREMIER HOTEL DATABASE MIGRATIONS
-- Run this complete file in Supabase SQL Editor
-- ====================================================================

-- ====================================================================
-- MIGRATION 0: Disable Row-Level Security (RLS)
-- Required because the app uses custom JWT authentication
-- ====================================================================

ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
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

-- ====================================================================
-- MIGRATION 1: Add Essential Tracking Columns
-- These columns are critical for hotel operations
-- ====================================================================

-- Add total_guests to bookings (essential for occupancy tracking)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 1 CHECK (total_guests >= 1);

COMMENT ON COLUMN bookings.total_guests IS 'Number of guests for this booking - important for occupancy tracking and reporting';

-- Add estimated_ready_time to orders (customer experience feature)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS estimated_ready_time TIMESTAMPTZ;

COMMENT ON COLUMN orders.estimated_ready_time IS 'Estimated time when the order will be ready - calculated based on preparation times';

-- Add actual_ready_time for kitchen performance metrics
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS actual_ready_time TIMESTAMPTZ;

COMMENT ON COLUMN orders.actual_ready_time IS 'Actual time when order was marked as ready - used for kitchen performance metrics';

-- ====================================================================
-- MIGRATION 2: Add Check-In/Check-Out Tracking Columns
-- Essential for front desk operations and audit trail
-- ====================================================================

-- Check-in columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_by UUID;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

-- Check-out columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_out_by UUID;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_out_notes TEXT;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS damages TEXT;

-- Add documentation comments
COMMENT ON COLUMN bookings.checked_in_at IS 'Timestamp when guest checked in';
COMMENT ON COLUMN bookings.checked_in_by IS 'Staff member who performed check-in';
COMMENT ON COLUMN bookings.check_in_notes IS 'Notes recorded during check-in';
COMMENT ON COLUMN bookings.checked_out_at IS 'Timestamp when guest checked out';
COMMENT ON COLUMN bookings.checked_out_by IS 'Staff member who performed check-out';
COMMENT ON COLUMN bookings.check_out_notes IS 'Notes recorded during check-out';
COMMENT ON COLUMN bookings.damages IS 'Description of any room damages found during check-out';

-- ====================================================================
-- Verification
-- ====================================================================

SELECT 'All migrations completed successfully!' as status;
