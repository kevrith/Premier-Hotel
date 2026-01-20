-- =====================================================
-- AUTHENTICATION SYSTEM DATABASE MIGRATION
-- Phase 1: Complete Authentication Infrastructure
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CREATE OR UPDATE USERS TABLE
-- Create users table if it doesn't exist, or add columns if it does
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to support multi-method auth (safe to run even if columns exist)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS auth_providers TEXT[] DEFAULT ARRAY['local'],
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- 2. EMAIL VERIFICATION TOKENS TABLE
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent multiple active verification tokens per user
    CONSTRAINT unique_active_email_verification UNIQUE(user_id, email, verified)
);

-- Indexes for email verifications
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Auto-delete expired email verification tokens
CREATE OR REPLACE FUNCTION delete_expired_email_verifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM email_verifications
    WHERE expires_at < NOW() AND verified = FALSE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_email_verifications
AFTER INSERT ON email_verifications
EXECUTE FUNCTION delete_expired_email_verifications();

-- 3. PHONE OTP VERIFICATION TABLE
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent multiple active OTP codes per user
    CONSTRAINT unique_active_phone_verification UNIQUE(user_id, phone, verified)
);

-- Indexes for phone verifications
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Auto-delete expired phone OTP codes
CREATE OR REPLACE FUNCTION delete_expired_phone_verifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM phone_verifications
    WHERE expires_at < NOW() AND verified = FALSE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_phone_verifications
AFTER INSERT ON phone_verifications
EXECUTE FUNCTION delete_expired_phone_verifications();

-- 4. REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Auto-delete expired refresh tokens
CREATE OR REPLACE FUNCTION delete_expired_refresh_tokens()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR revoked = TRUE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_refresh_tokens
AFTER INSERT ON refresh_tokens
EXECUTE FUNCTION delete_expired_refresh_tokens();

-- 5. PASSWORD RESET TOKENS TABLE
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address TEXT
);

-- Indexes for password resets
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- Auto-delete expired password reset tokens
CREATE OR REPLACE FUNCTION delete_expired_password_resets()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM password_resets
    WHERE expires_at < NOW() AND used = FALSE;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_password_resets
AFTER INSERT ON password_resets
EXECUTE FUNCTION delete_expired_password_resets();

-- 6. SOCIAL AUTH PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS social_auth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'whatsapp', 'apple')),
    provider_user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    profile_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each user can only link one account per provider
    CONSTRAINT unique_user_provider UNIQUE(user_id, provider),
    -- Each provider account can only be linked to one user
    CONSTRAINT unique_provider_account UNIQUE(provider, provider_user_id)
);

-- Indexes for social auth providers
CREATE INDEX IF NOT EXISTS idx_social_auth_user_id ON social_auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_social_auth_provider ON social_auth_providers(provider);
CREATE INDEX IF NOT EXISTS idx_social_auth_provider_user_id ON social_auth_providers(provider_user_id);

-- Update timestamp on social auth changes
CREATE OR REPLACE FUNCTION update_social_auth_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_social_auth_timestamp
BEFORE UPDATE ON social_auth_providers
FOR EACH ROW
EXECUTE FUNCTION update_social_auth_timestamp();

-- 7. GUEST USERS SUPPORT
-- Mark users as guest users with role
-- Guest users have minimal profile data and can be converted later
-- (is_guest column already added in section 1)

CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);

-- 8. AUDIT LOG FOR AUTHENTICATION EVENTS
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'register', 'login', 'logout', 'password_reset',
        'email_verified', 'phone_verified', 'social_login',
        'guest_created', 'guest_converted', 'failed_login'
    )),
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON auth_audit_log(created_at);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES

-- Email verifications: Users can only see their own
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_verifications_user_policy ON email_verifications
    FOR ALL
    USING (user_id = auth.uid());

-- Phone verifications: Users can only see their own
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY phone_verifications_user_policy ON phone_verifications
    FOR ALL
    USING (user_id = auth.uid());

-- Refresh tokens: Users can only see their own
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY refresh_tokens_user_policy ON refresh_tokens
    FOR ALL
    USING (user_id = auth.uid());

-- Password resets: Users can only see their own
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY password_resets_user_policy ON password_resets
    FOR ALL
    USING (user_id = auth.uid());

-- Social auth providers: Users can only see their own
ALTER TABLE social_auth_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_auth_providers_user_policy ON social_auth_providers
    FOR ALL
    USING (user_id = auth.uid());

-- Audit log: Users can only read their own events
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_audit_log_user_policy ON auth_audit_log
    FOR SELECT
    USING (user_id = auth.uid());

-- 10. HELPER FUNCTIONS

-- Function to mark email as verified
CREATE OR REPLACE FUNCTION verify_user_email(p_user_id UUID, p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users
    SET email_verified = TRUE,
        is_verified = (phone_verified = TRUE OR phone IS NULL),
        updated_at = NOW()
    WHERE id = p_user_id AND email = p_email;

    UPDATE email_verifications
    SET verified = TRUE
    WHERE user_id = p_user_id AND email = p_email;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark phone as verified
CREATE OR REPLACE FUNCTION verify_user_phone(p_user_id UUID, p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users
    SET phone_verified = TRUE,
        is_verified = (email_verified = TRUE OR email IS NULL),
        updated_at = NOW()
    WHERE id = p_user_id AND phone = p_phone;

    UPDATE phone_verifications
    SET verified = TRUE
    WHERE user_id = p_user_id AND phone = p_phone;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert guest to registered user
CREATE OR REPLACE FUNCTION convert_guest_to_user(
    p_user_id UUID,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_password_hash TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users
    SET
        is_guest = FALSE,
        email = COALESCE(p_email, email),
        phone = COALESCE(p_phone, phone),
        password_hash = COALESCE(p_password_hash, password_hash),
        full_name = COALESCE(p_full_name, full_name),
        updated_at = NOW()
    WHERE id = p_user_id AND is_guest = TRUE;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. GRANT PERMISSIONS
-- Grant necessary permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON email_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON phone_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON password_resets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON social_auth_providers TO authenticated;
GRANT SELECT, INSERT ON auth_audit_log TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN (
    'email_verifications',
    'phone_verifications',
    'refresh_tokens',
    'password_resets',
    'social_auth_providers',
    'auth_audit_log'
)
ORDER BY tablename;
