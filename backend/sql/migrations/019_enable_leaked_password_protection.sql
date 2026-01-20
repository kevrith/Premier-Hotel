-- =============================================
-- Migration 019: Enable Leaked Password Protection
-- =============================================
-- Enables Supabase's leaked password protection
-- Prevents users from using compromised passwords
-- =============================================

-- ===== ENABLE LEAKED PASSWORD PROTECTION =====

-- This requires enabling the feature in Supabase Auth settings
-- The SQL command to enable it:

ALTER ROLE authenticator SET app.settings.leaked_password_protection TO 'on';

-- Alternative: Set it at database level
ALTER DATABASE postgres SET app.settings.leaked_password_protection TO 'on';

-- Reload configuration
SELECT pg_reload_conf();

-- Add comment
COMMENT ON DATABASE postgres IS 'Premier Hotel Management System Database with leaked password protection enabled';
