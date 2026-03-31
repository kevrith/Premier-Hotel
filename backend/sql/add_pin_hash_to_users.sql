-- Add PIN hash column to users table for fast staff login
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT NULL;

-- Index for quick lookup (optional, lookups are by user_id which is already PK)
COMMENT ON COLUMN users.pin_hash IS 'Bcrypt-hashed 4-6 digit PIN for fast staff login at POS';
