-- Daily Stock Taking Sessions
CREATE TABLE IF NOT EXISTS daily_stock_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL,
    session_type VARCHAR(20) DEFAULT 'all',
    status VARCHAR(20) DEFAULT 'draft',
    submitted_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stock_sessions_date_type
ON daily_stock_sessions(session_date, session_type);

-- Daily Stock Taking Items
CREATE TABLE IF NOT EXISTS daily_stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES daily_stock_sessions(id) ON DELETE CASCADE,
    menu_item_id UUID,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'piece',
    opening_stock DECIMAL(10,3) DEFAULT 0,
    purchases DECIMAL(10,3) DEFAULT 0,
    total_stock DECIMAL(10,3) GENERATED ALWAYS AS (opening_stock + purchases) STORED,
    system_sales DECIMAL(10,3) DEFAULT 0,
    physical_closing DECIMAL(10,3),
    lost DECIMAL(10,3) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
