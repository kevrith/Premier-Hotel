-- Add PIN lockout tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_attempts  INTEGER   DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN users.pin_attempts      IS 'Failed PIN login attempts since last success';
COMMENT ON COLUMN users.pin_locked_until  IS 'Locked until this timestamp after too many wrong PINs';
