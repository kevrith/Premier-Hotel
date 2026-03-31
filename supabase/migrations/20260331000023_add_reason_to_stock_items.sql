-- Add reason code column to daily_stock_items for enterprise discrepancy tracking
ALTER TABLE daily_stock_items ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT NULL;
