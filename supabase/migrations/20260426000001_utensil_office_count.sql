-- Add office_count to utensil_stock_takes
-- Tracks items purchased and held in the office/store (admin/manager only).
-- These items are excluded from the "lost" calculation.

ALTER TABLE utensil_stock_takes
  ADD COLUMN IF NOT EXISTS office_count INTEGER NOT NULL DEFAULT 0;
