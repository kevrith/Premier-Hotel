-- ============================================================
-- Multi-Location Stock Management
-- Bars (A, B, …), Kitchen, and Central Store each hold their own stock.
-- ============================================================

-- Locations (bars, kitchen, central store)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL DEFAULT 'bar', -- 'bar', 'kitchen', 'store'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default locations
INSERT INTO locations (name, type, description) VALUES
  ('Central Store', 'store', 'Main stock holding area — manager controlled'),
  ('Bar A', 'bar', 'First bar location'),
  ('Bar B', 'bar', 'Second bar location'),
  ('Kitchen', 'kitchen', 'Main kitchen')
ON CONFLICT (name) DO NOTHING;

-- Per-location stock balance
CREATE TABLE IF NOT EXISTS location_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL,
    item_name VARCHAR(255),
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'piece',
    quantity DECIMAL(10,3) DEFAULT 0,
    reorder_level DECIMAL(10,3) DEFAULT 0,
    cost_price DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, menu_item_id)
);

-- Stock transfers (manager issues stock from store to bars)
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(50) UNIQUE,
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID NOT NULL REFERENCES locations(id),
    menu_item_id UUID NOT NULL,
    item_name VARCHAR(255),
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) DEFAULT 'piece',
    notes TEXT,
    transferred_by UUID,
    transfer_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assign staff to locations
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES locations(id);

-- Tag daily stock sessions with a location
ALTER TABLE daily_stock_sessions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Tag orders with which bar served them (for stock deduction)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bar_location_id UUID REFERENCES locations(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_stock_location ON location_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_item ON location_stock(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_date ON stock_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_users_assigned_location ON users(assigned_location_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_sessions_location ON daily_stock_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_bar_location ON orders(bar_location_id);
