-- =====================================================
-- Add Missing Authentication Tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. SOCIAL AUTH PROVIDERS TABLE (if missing)
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

-- Timestamp trigger for social auth
CREATE OR REPLACE FUNCTION update_social_auth_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_social_auth_timestamp ON social_auth_providers;
CREATE TRIGGER trigger_update_social_auth_timestamp
BEFORE UPDATE ON social_auth_providers
FOR EACH ROW
EXECUTE FUNCTION update_social_auth_timestamp();

-- Enable RLS for social auth providers
ALTER TABLE social_auth_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_auth_providers_user_policy ON social_auth_providers;
CREATE POLICY social_auth_providers_user_policy ON social_auth_providers
    FOR ALL
    USING (user_id = auth.uid());

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Missing tables added successfully!';
END $$;
