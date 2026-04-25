-- Utensil/Cutlery Stock: catalogue + daily count takes with lost/broken tracking

CREATE TABLE IF NOT EXISTS utensil_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'General',
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utensil_stock_takes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utensil_id      UUID NOT NULL REFERENCES utensil_items(id) ON DELETE CASCADE,
    stock_date      DATE NOT NULL,
    branch_id       UUID REFERENCES branches(id),
    opening_count   INT NOT NULL DEFAULT 0,
    closing_count   INT NOT NULL DEFAULT 0,
    broken          INT NOT NULL DEFAULT 0,
    lost            INT NOT NULL DEFAULT 0,   -- auto-calculated: opening - closing - broken
    notes           TEXT,
    submitted_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (utensil_id, stock_date, branch_id)
);

ALTER TABLE utensil_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE utensil_stock_takes ENABLE ROW LEVEL SECURITY;

-- Permissive: anyone with an active staff role can read; writes gated by app logic + permission
CREATE POLICY "utensil_items_all" ON utensil_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin','manager','owner','chef','waiter','cleaner','housekeeping')
              AND status = 'active'
        )
    );

CREATE POLICY "utensil_stock_takes_all" ON utensil_stock_takes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin','manager','owner','chef','waiter','cleaner','housekeeping')
              AND status = 'active'
        )
    );

-- Seed common utensil items
INSERT INTO utensil_items (id, name, category, sort_order) VALUES
    (gen_random_uuid(), 'Cups (Tea/Coffee)',   'Crockery',   1),
    (gen_random_uuid(), 'Saucers',             'Crockery',   2),
    (gen_random_uuid(), 'Dinner Plates',       'Crockery',   3),
    (gen_random_uuid(), 'Side Plates',         'Crockery',   4),
    (gen_random_uuid(), 'Soup Bowls',          'Crockery',   5),
    (gen_random_uuid(), 'Serving Bowls',       'Crockery',   6),
    (gen_random_uuid(), 'Water Glasses',       'Glassware',  7),
    (gen_random_uuid(), 'Juice Glasses',       'Glassware',  8),
    (gen_random_uuid(), 'Wine Glasses',        'Glassware',  9),
    (gen_random_uuid(), 'Forks',              'Cutlery',   10),
    (gen_random_uuid(), 'Table Knives',        'Cutlery',   11),
    (gen_random_uuid(), 'Tablespoons',         'Cutlery',   12),
    (gen_random_uuid(), 'Teaspoons',           'Cutlery',   13),
    (gen_random_uuid(), 'Dessert Spoons',      'Cutlery',   14),
    (gen_random_uuid(), 'Serving Spoons',      'Cutlery',   15),
    (gen_random_uuid(), 'Ladles',              'Cutlery',   16),
    (gen_random_uuid(), 'Serving Trays',       'Equipment', 17),
    (gen_random_uuid(), 'Chopping Boards',     'Equipment', 18),
    (gen_random_uuid(), 'Salt & Pepper Sets',  'Table',     19),
    (gen_random_uuid(), 'Sugar Bowls',         'Table',     20),
    (gen_random_uuid(), 'Napkin Holders',      'Table',     21),
    (gen_random_uuid(), 'Flower Vases',        'Table',     22)
ON CONFLICT DO NOTHING;
