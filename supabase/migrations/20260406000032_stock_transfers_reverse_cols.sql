-- Add reversal tracking columns to stock_transfers
ALTER TABLE stock_transfers
  ADD COLUMN IF NOT EXISTS reversed      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at   TIMESTAMPTZ;
