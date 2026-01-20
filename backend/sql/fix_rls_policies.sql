-- ============================================
-- Fix RLS Policies for Menu and Room Management
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- MENU ITEMS RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admins to insert menu items" ON menu_items;
DROP POLICY IF EXISTS "Allow admins to update menu items" ON menu_items;
DROP POLICY IF EXISTS "Allow admins to delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Allow everyone to read menu items" ON menu_items;

-- Allow everyone to read menu items (public endpoint)
CREATE POLICY "Allow everyone to read menu items"
ON menu_items
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow admin users to insert menu items
CREATE POLICY "Allow admins to insert menu items"
ON menu_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow admin users to update menu items
CREATE POLICY "Allow admins to update menu items"
ON menu_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow admin users to delete menu items
CREATE POLICY "Allow admins to delete menu items"
ON menu_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- ============================================
-- ROOMS RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admins to insert rooms" ON rooms;
DROP POLICY IF EXISTS "Allow admins to update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow admins to delete rooms" ON rooms;
DROP POLICY IF EXISTS "Allow everyone to read rooms" ON rooms;

-- Allow everyone to read rooms (public endpoint)
CREATE POLICY "Allow everyone to read rooms"
ON rooms
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow admin users to insert rooms
CREATE POLICY "Allow admins to insert rooms"
ON rooms
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow admin users to update rooms
CREATE POLICY "Allow admins to update rooms"
ON rooms
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow admin users to delete rooms
CREATE POLICY "Allow admins to delete rooms"
ON rooms
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check menu_items policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'menu_items'
ORDER BY policyname;

-- Check rooms policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'rooms'
ORDER BY policyname;

-- Test that admin can insert (replace with your actual admin user ID)
-- SELECT auth.uid(); -- Run this first to get your user ID
