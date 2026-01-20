-- =============================================
-- Migration 014: Add Payment Idempotency
-- =============================================
-- Prevents duplicate payments from network retries
-- or duplicate form submissions
-- =============================================

-- Add idempotency_key column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Create unique index to enforce idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
ON payments(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add created_by column to track who initiated the payment
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_created_by
ON payments(created_by)
WHERE created_by IS NOT NULL;

-- Add comment
COMMENT ON COLUMN payments.idempotency_key IS 'Unique key to prevent duplicate payment processing from retries';
COMMENT ON INDEX idx_payments_idempotency_key IS 'Ensures each idempotency key is used only once';
