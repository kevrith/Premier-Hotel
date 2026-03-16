-- Add stock_department column to menu_items
-- Values: 'kitchen', 'bar', 'both', NULL (auto-detect from category)
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS stock_department VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN menu_items.stock_department IS
  'Which stock-take sheet this item belongs to: kitchen, bar, both, or NULL (auto from category)';
