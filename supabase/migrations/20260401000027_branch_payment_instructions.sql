-- Add flexible payment instructions to branches table
-- Replaces the rigid paybill_no/account_no approach with a free-text field
-- that supports any payment method: Paybill, Till No, Bank, etc.

ALTER TABLE branches ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS paybill_no TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS account_no TEXT;
