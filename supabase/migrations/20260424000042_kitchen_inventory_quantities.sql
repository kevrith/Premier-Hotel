-- Add quantity tracking to kitchen_stock_items
-- current_quantity: live count (adjusted in real time)
-- min_stock: low-stock threshold
-- category: optional grouping

ALTER TABLE kitchen_stock_items
    ADD COLUMN IF NOT EXISTS current_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS min_stock        NUMERIC(12, 3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS category         TEXT NOT NULL DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS notes            TEXT;

-- Seed reasonable categories for existing items
UPDATE kitchen_stock_items SET category = 'Protein'  WHERE name IN ('Chicken', 'Goat Meat', 'Beef', 'Sausage');
UPDATE kitchen_stock_items SET category = 'Dairy'    WHERE name IN ('Eggs', 'Milk');
UPDATE kitchen_stock_items SET category = 'Grains'   WHERE name IN ('Rice', 'Ugali', 'Chapati', 'Mukimo', 'Njahi', 'Githeri');
UPDATE kitchen_stock_items SET category = 'Snacks'   WHERE name IN ('Samosa');

-- Quantity adjustment log (for audit trail)
CREATE TABLE IF NOT EXISTS kitchen_stock_adjustments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id        UUID NOT NULL REFERENCES kitchen_stock_items(id) ON DELETE CASCADE,
    adjusted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    before_qty     NUMERIC(12, 3) NOT NULL,
    after_qty      NUMERIC(12, 3) NOT NULL,
    delta          NUMERIC(12, 3) NOT NULL,
    reason         TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_adj_item ON kitchen_stock_adjustments (item_id, created_at DESC);

-- RLS for adjustments
ALTER TABLE kitchen_stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kitchen_adj_read" ON kitchen_stock_adjustments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','manager','owner','chef'))
    );

CREATE POLICY "kitchen_adj_write" ON kitchen_stock_adjustments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','manager','chef'))
    );
