-- Remove the redundant profiles table.
-- All user data is stored in the custom `users` table.
-- The `profiles` table was a leftover from an earlier Supabase auth setup
-- and had only 5 references in backend code, all now pointing to `users`.

DROP TABLE IF EXISTS public.profiles CASCADE;
