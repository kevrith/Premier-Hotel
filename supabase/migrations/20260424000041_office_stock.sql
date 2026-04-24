-- Office Stock: standalone items + date-based stock takes
-- Items like serviettes, tissues, pens, staplers, etc.

CREATE TABLE IF NOT EXISTS office_stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pieces',
    category TEXT NOT NULL DEFAULT 'General',
    min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default office items
INSERT INTO office_stock_items (name, unit, category, min_stock, sort_order) VALUES
  ('Serviettes',        'pieces', 'Dining',     100, 1),
  ('Tissues',           'boxes',  'General',     10,  2),
  ('Hand Soap',         'pieces', 'Hygiene',      5,  3),
  ('Toilet Paper',      'rolls',  'Hygiene',     20,  4),
  ('Pens',              'pieces', 'Stationery',  10,  5),
  ('Notebooks',         'pieces', 'Stationery',   5,  6),
  ('Staples',           'boxes',  'Stationery',   3,  7),
  ('Printer Paper',     'reams',  'Stationery',   2,  8),
  ('Rubber Bands',      'packets','Stationery',   2,  9),
  ('Correction Fluid',  'pieces', 'Stationery',   2, 10),
  ('Envelopes',         'pieces', 'Stationery',  20, 11),
  ('Paper Clips',       'boxes',  'Stationery',   3, 12),
  ('Scotch Tape',       'rolls',  'Stationery',   3, 13),
  ('Scissors',          'pieces', 'Tools',        2, 14),
  ('Stapler',           'pieces', 'Tools',        1, 15),
  ('Hole Punch',        'pieces', 'Tools',        1, 16),
  ('Dustbin Liners',    'rolls',  'Hygiene',      5, 17),
  ('Air Freshener',     'pieces', 'Hygiene',      3, 18)
ON CONFLICT DO NOTHING;

-- Date-based office stock takes
CREATE TABLE IF NOT EXISTS office_stock_takes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES office_stock_items(id) ON DELETE CASCADE,
    stock_date DATE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    opening_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    received NUMERIC(12, 2) NOT NULL DEFAULT 0,
    used NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (item_id, stock_date, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_office_stock_takes_date ON office_stock_takes (stock_date, branch_id);

-- RLS
ALTER TABLE office_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_stock_takes ENABLE ROW LEVEL SECURITY;

-- office_stock_items: admin/manager/owner can read; admin/manager can write
CREATE POLICY "office_items_read" ON office_stock_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "office_items_write" ON office_stock_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- office_stock_takes: admin/manager/owner can read; admin/manager can write
CREATE POLICY "office_takes_read" ON office_stock_takes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'owner')
        )
    );

CREATE POLICY "office_takes_write" ON office_stock_takes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Also add RLS for kitchen tables (allow owner to read)
DROP POLICY IF EXISTS "kitchen_items_read" ON kitchen_stock_items;
CREATE POLICY "kitchen_items_read" ON kitchen_stock_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'owner', 'chef')
        )
    );

DROP POLICY IF EXISTS "kitchen_items_write" ON kitchen_stock_items;
CREATE POLICY "kitchen_items_write" ON kitchen_stock_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'chef')
        )
    );

DROP POLICY IF EXISTS "kitchen_daily_read" ON kitchen_daily_stock;
CREATE POLICY "kitchen_daily_read" ON kitchen_daily_stock
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'owner', 'chef')
        )
    );

DROP POLICY IF EXISTS "kitchen_daily_write" ON kitchen_daily_stock;
CREATE POLICY "kitchen_daily_write" ON kitchen_daily_stock
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'chef')
        )
    );
