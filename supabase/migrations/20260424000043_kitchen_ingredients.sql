-- Kitchen Ingredients: raw ingredient catalogue + daily stock takes

CREATE TABLE IF NOT EXISTS kitchen_ingredients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    unit        TEXT NOT NULL DEFAULT 'kg',
    category    TEXT NOT NULL DEFAULT 'General',
    current_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
    min_stock   NUMERIC(12,3) NOT NULL DEFAULT 0,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kitchen_ingredient_stock_takes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id   UUID NOT NULL REFERENCES kitchen_ingredients(id) ON DELETE CASCADE,
    stock_date      DATE NOT NULL,
    branch_id       UUID REFERENCES branches(id),
    opening_stock   NUMERIC(12,3) NOT NULL DEFAULT 0,
    purchases       NUMERIC(12,3) NOT NULL DEFAULT 0,
    used            NUMERIC(12,3) NOT NULL DEFAULT 0,
    waste           NUMERIC(12,3) NOT NULL DEFAULT 0,
    closing_stock   NUMERIC(12,3) NOT NULL DEFAULT 0,
    notes           TEXT,
    submitted_by    UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ingredient_id, stock_date, branch_id)
);

ALTER TABLE kitchen_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ingredient_stock_takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kitchen_ingredients_all" ON kitchen_ingredients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin','manager','owner','chef')
              AND status = 'active'
        )
    );

CREATE POLICY "kitchen_ingredient_stock_takes_all" ON kitchen_ingredient_stock_takes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin','manager','owner','chef')
              AND status = 'active'
        )
    );

-- Seed common raw ingredients
INSERT INTO kitchen_ingredients (id, name, unit, category, sort_order) VALUES
    (gen_random_uuid(), 'Spinach',              'kg',      'Vegetables',    1),
    (gen_random_uuid(), 'Onions',               'kg',      'Vegetables',    2),
    (gen_random_uuid(), 'Tomatoes',             'kg',      'Vegetables',    3),
    (gen_random_uuid(), 'Garlic',               'kg',      'Vegetables',    4),
    (gen_random_uuid(), 'Ginger',               'kg',      'Vegetables',    5),
    (gen_random_uuid(), 'Carrots',              'kg',      'Vegetables',    6),
    (gen_random_uuid(), 'Cabbage',              'kg',      'Vegetables',    7),
    (gen_random_uuid(), 'Potatoes',             'kg',      'Vegetables',    8),
    (gen_random_uuid(), 'Capsicum / Peppers',   'kg',      'Vegetables',    9),
    (gen_random_uuid(), 'Lemon / Lime',         'pieces',  'Vegetables',   10),
    (gen_random_uuid(), 'Coriander (Dhania)',   'bunches', 'Vegetables',   11),
    (gen_random_uuid(), 'Cooking Oil',          'litres',  'Oils & Spices',12),
    (gen_random_uuid(), 'Salt',                 'kg',      'Oils & Spices',13),
    (gen_random_uuid(), 'Sugar',                'kg',      'Oils & Spices',14),
    (gen_random_uuid(), 'Black Pepper',         'grams',   'Oils & Spices',15),
    (gen_random_uuid(), 'Cumin',                'grams',   'Oils & Spices',16),
    (gen_random_uuid(), 'Turmeric',             'grams',   'Oils & Spices',17),
    (gen_random_uuid(), 'Stock Cubes',          'pieces',  'Oils & Spices',18),
    (gen_random_uuid(), 'Flour',                'kg',      'Dry Goods',    19),
    (gen_random_uuid(), 'Bread',                'loaves',  'Dry Goods',    20),
    (gen_random_uuid(), 'Butter',               'kg',      'Dairy & Fats', 21),
    (gen_random_uuid(), 'Cream',                'litres',  'Dairy & Fats', 22)
ON CONFLICT DO NOTHING;
