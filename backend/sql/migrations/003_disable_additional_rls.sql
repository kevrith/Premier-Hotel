-- Disable RLS on additional tables discovered during testing
-- These tables need RLS disabled because the app uses custom JWT authentication

ALTER TABLE IF EXISTS notification_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS room_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS housekeeping_supplies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS supply_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS housekeeping_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lost_and_found DISABLE ROW LEVEL SECURITY;

SELECT 'Additional RLS policies disabled successfully!' as status;
