-- Add fingerprint column to notifications table for deduplication
-- Migration: Add fingerprint support for enterprise deduplication

-- Add fingerprint column
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64);

-- Create index for fast fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_notifications_fingerprint
ON notifications(fingerprint);

-- Create composite index for deduplication queries (fingerprint + created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_fingerprint_created
ON notifications(fingerprint, created_at DESC);

-- Add comment
COMMENT ON COLUMN notifications.fingerprint IS 'SHA256 hash for deduplication (user_id + type + title + message + data)';
