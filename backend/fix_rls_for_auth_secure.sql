-- ============================================================
-- FIX RLS POLICIES FOR AUTH_SECURE AUTHENTICATION
-- ============================================================
-- This script adds RLS policies to allow public access to the users table
-- for authentication operations (login and registration)
--
-- CRITICAL: Run this in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/njhjpxfozgpoiqwksple/sql
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public select for login" ON users;
DROP POLICY IF EXISTS "Allow public registration" ON users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON users;

-- Policy 1: Allow public SELECT for login authentication
-- This allows the login endpoint to query users by email/phone
CREATE POLICY "Allow public select for login"
ON users FOR SELECT
TO public
USING (true);

-- Policy 2: Allow public INSERT for registration
-- This allows new users to register
CREATE POLICY "Allow public registration"
ON users FOR INSERT
TO public
WITH CHECK (true);

-- Policy 3: Allow authenticated users to update their own data
-- This allows users to update their profile (but not others')
CREATE POLICY "Allow users to update their own data"
ON users FOR UPDATE
TO public
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to confirm policies are created:

-- 1. List all policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- 2. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- Expected results:
-- - 3 policies should be listed
-- - rowsecurity should be 't' (true)
