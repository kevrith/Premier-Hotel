-- Kitchen Stock: standalone items + daily log (not linked to menu_items or orders)

-- 1. Standalone kitchen stock item catalogue
CREATE TABLE IF NOT EXISTS kitchen_stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 13 kitchen items
INSERT INTO kitchen_stock_items (name, unit, sort_order) VALUES
  ('Chicken',    'kg',     1),
  ('Goat Meat',  'kg',     2),
  ('Beef',       'kg',     3),
  ('Eggs',       'pieces', 4),
  ('Milk',       'litres', 5),
  ('Rice',       'kg',     6),
  ('Ugali',      'kg',     7),
  ('Chapati',    'pieces', 8),
  ('Sausage',    'pieces', 9),
  ('Samosa',     'pieces', 10),
  ('Mukimo',     'kg',     11),
  ('Njahi',      'kg',     12),
  ('Githeri',    'kg',     13)
ON CONFLICT DO NOTHING;

-- 2. Daily kitchen stock log
CREATE TABLE IF NOT EXISTS kitchen_daily_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES kitchen_stock_items(id) ON DELETE CASCADE,
    stock_date DATE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    opening_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    purchases    NUMERIC(12, 3) NOT NULL DEFAULT 0,
    closing_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    notes TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (item_id, stock_date, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_daily_stock_date ON kitchen_daily_stock (stock_date, branch_id);

-- 3. Remove the 13 kitchen items that were added to menu_items as a workaround
DELETE FROM menu_items WHERE stock_department = 'kitchen';
