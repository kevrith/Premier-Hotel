-- ============================================
-- Disable RLS on menu_items and rooms tables
-- We're using API-level authorization instead
-- ============================================

-- Disable RLS on menu_items
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on rooms
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('menu_items', 'rooms');

-- Should show rowsecurity = false for both tables
