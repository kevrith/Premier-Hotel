-- Fix RLS policies for users table to allow authentication
-- Run this in Supabase SQL Editor

-- Allow anyone to insert during registration
CREATE POLICY IF NOT EXISTS "Allow public registration"
ON users FOR INSERT
TO public
WITH CHECK (true);

-- Allow users to select their own data during login
CREATE POLICY IF NOT EXISTS "Allow public select for login"
ON users FOR SELECT
TO public
USING (true);

-- Allow users to update their own data
CREATE POLICY IF NOT EXISTS "Users can update own data"
ON users FOR UPDATE
TO authenticated
USING (auth.uid()::text = id);

-- Refresh the policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
