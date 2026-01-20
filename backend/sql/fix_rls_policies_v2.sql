-- ============================================
-- Fix RLS Policies for Service Role Access
-- Since we're using custom JWT auth (not Supabase Auth),
-- we need to allow service role to bypass RLS
-- ============================================

-- ============================================
-- MENU ITEMS - Allow service role full access
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admins to insert menu items" ON menu_items;
DROP POLICY IF EXISTS "Allow admins to update menu items" ON menu_items;
DROP POLICY IF EXISTS "Allow admins to delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Allow everyone to read menu items" ON menu_items;
DROP POLICY IF EXISTS "Service role has full access to menu_items" ON menu_items;

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (this is what the backend uses)
CREATE POLICY "Service role has full access to menu_items"
ON menu_items
TO service_role
USING (true)
WITH CHECK (true);

-- Allow public read access
CREATE POLICY "Public read access to menu_items"
ON menu_items
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- ROOMS - Allow service role full access
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admins to insert rooms" ON rooms;
DROP POLICY IF EXISTS "Allow admins to update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow admins to delete rooms" ON rooms;
DROP POLICY IF EXISTS "Allow everyone to read rooms" ON rooms;
DROP POLICY IF EXISTS "Service role has full access to rooms" ON rooms;

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to rooms"
ON rooms
TO service_role
USING (true)
WITH CHECK (true);

-- Allow public read access
CREATE POLICY "Public read access to rooms"
ON rooms
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check menu_items policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'menu_items'
ORDER BY policyname;

-- Check rooms policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'rooms'
ORDER BY policyname;
