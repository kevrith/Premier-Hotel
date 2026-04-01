-- Fix menu_items table to match application schema
-- 1. Add missing 'popular' column
-- 2. Expand category constraint to match Pydantic schema

-- Add popular column if missing
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS popular BOOLEAN DEFAULT FALSE;

-- Drop old category constraint and replace with updated one
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_category_check
  CHECK (category IN ('appetizers', 'starters', 'mains', 'desserts', 'drinks', 'beverages', 'breakfast', 'snacks'));
