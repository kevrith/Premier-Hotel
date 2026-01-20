-- =====================================================
-- Inventory Management System Migration (FIXED)
-- =====================================================
-- Creates tables for inventory tracking, stock management,
-- and menu-inventory relationships
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to dependencies)
DROP TABLE IF EXISTS stock_audit_items CASCADE;
DROP TABLE IF EXISTS stock_audits CASCADE;
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS menu_inventory_mapping CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;

-- =====================================================
-- 1. INVENTORY CATEGORIES TABLE
-- =====================================================
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INVENTORY ITEMS TABLE
-- =====================================================
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,

    -- Basic Info
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),

    -- Stock Information
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50) NOT NULL,
    minimum_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    maximum_stock DECIMAL(10, 2),
    reorder_point DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reorder_quantity DECIMAL(10, 2),

    -- Pricing
    cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
    selling_price_per_unit DECIMAL(10, 2),

    -- Supplier Information
    supplier_name VARCHAR(200),
    supplier_contact VARCHAR(100),
    supplier_email VARCHAR(200),

    -- Storage Information
    storage_location VARCHAR(100),
    shelf_life_days INTEGER,

    -- Status
    status VARCHAR(50) DEFAULT 'active',
    is_perishable BOOLEAN DEFAULT false,

    -- Tracking
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    last_restocked_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID,

    CONSTRAINT check_stock_positive CHECK (current_stock >= 0),
    CONSTRAINT check_minimum_stock CHECK (minimum_stock >= 0),
    CONSTRAINT check_reorder_point CHECK (reorder_point >= 0)
);

-- =====================================================
-- 3. INVENTORY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),

    -- Stock Levels
    stock_before DECIMAL(10, 2) NOT NULL,
    stock_after DECIMAL(10, 2) NOT NULL,

    -- Reference Information
    reference_type VARCHAR(50),
    reference_id UUID,

    -- Additional Info
    notes TEXT,
    reason VARCHAR(200),

    -- Tracking
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. MENU ITEM - INVENTORY MAPPING TABLE
-- =====================================================
CREATE TABLE menu_inventory_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

    -- Quantity needed per menu item serving
    quantity_required DECIMAL(10, 2) NOT NULL,
    unit_of_measure VARCHAR(50) NOT NULL,

    -- Optional: Cost allocation
    cost_percentage DECIMAL(5, 2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_menu_inventory UNIQUE(menu_item_id, inventory_item_id),
    CONSTRAINT check_quantity_positive CHECK (quantity_required > 0)
);

-- =====================================================
-- 5. INVENTORY ALERTS TABLE
-- =====================================================
CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

    -- Alert Information
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    message TEXT NOT NULL,

    -- Status
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by_user_id UUID,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. STOCK AUDITS TABLE
-- =====================================================
CREATE TABLE stock_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Audit Info
    audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    audit_type VARCHAR(50) DEFAULT 'manual',
    status VARCHAR(50) DEFAULT 'in_progress',

    -- Summary
    total_items_counted INTEGER DEFAULT 0,
    discrepancies_found INTEGER DEFAULT 0,
    total_value_adjustment DECIMAL(10, 2) DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Tracking
    conducted_by_user_id UUID,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. STOCK AUDIT ITEMS TABLE
-- =====================================================
CREATE TABLE stock_audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES stock_audits(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

    -- Count Information
    system_count DECIMAL(10, 2) NOT NULL,
    actual_count DECIMAL(10, 2) NOT NULL,
    discrepancy DECIMAL(10, 2) GENERATED ALWAYS AS (actual_count - system_count) STORED,

    -- Value
    unit_cost DECIMAL(10, 2),
    value_adjustment DECIMAL(10, 2) GENERATED ALWAYS AS ((actual_count - system_count) * unit_cost) STORED,

    -- Notes
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Inventory Items
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_stock ON inventory_items(current_stock);

-- Inventory Transactions
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- Menu Inventory Mapping
CREATE INDEX idx_menu_inventory_menu ON menu_inventory_mapping(menu_item_id);
CREATE INDEX idx_menu_inventory_inventory ON menu_inventory_mapping(inventory_item_id);

-- Inventory Alerts
CREATE INDEX idx_inventory_alerts_item ON inventory_alerts(inventory_item_id);
CREATE INDEX idx_inventory_alerts_unresolved ON inventory_alerts(is_resolved, created_at);
CREATE INDEX idx_inventory_alerts_type ON inventory_alerts(alert_type);

-- Stock Audits
CREATE INDEX idx_stock_audits_date ON stock_audits(audit_date);
CREATE INDEX idx_stock_audits_status ON stock_audits(status);

-- Stock Audit Items
CREATE INDEX idx_stock_audit_items_audit ON stock_audit_items(audit_id);
CREATE INDEX idx_stock_audit_items_inventory ON stock_audit_items(inventory_item_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Update updated_at timestamp on inventory_items
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_items_updated_at();

-- Update updated_at timestamp on inventory_categories
CREATE OR REPLACE FUNCTION update_inventory_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_categories_updated_at
    BEFORE UPDATE ON inventory_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_categories_updated_at();

-- =====================================================
-- FUNCTION: Generate Low Stock Alerts
-- =====================================================
CREATE OR REPLACE FUNCTION generate_low_stock_alerts()
RETURNS void AS $$
BEGIN
    -- Insert alerts for items below reorder point
    INSERT INTO inventory_alerts (inventory_item_id, alert_type, severity, message)
    SELECT
        id,
        CASE
            WHEN current_stock = 0 THEN 'out_of_stock'
            ELSE 'low_stock'
        END,
        CASE
            WHEN current_stock = 0 THEN 'critical'
            WHEN current_stock < (reorder_point * 0.5) THEN 'high'
            ELSE 'medium'
        END,
        CASE
            WHEN current_stock = 0 THEN name || ' is out of stock'
            ELSE name || ' is running low. Current stock: ' || current_stock || ' ' || unit_of_measure
        END
    FROM inventory_items
    WHERE status = 'active'
        AND current_stock <= reorder_point
        AND NOT EXISTS (
            SELECT 1 FROM inventory_alerts
            WHERE inventory_alerts.inventory_item_id = inventory_items.id
                AND inventory_alerts.is_resolved = false
                AND inventory_alerts.alert_type IN ('low_stock', 'out_of_stock')
        );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA: Default Categories
-- =====================================================
INSERT INTO inventory_categories (name, description, icon) VALUES
    ('Beverages', 'All drinks including soft drinks, juices, and alcoholic beverages', 'wine'),
    ('Food - Dry Goods', 'Rice, pasta, flour, and other dry food items', 'package'),
    ('Food - Fresh Produce', 'Fruits, vegetables, and fresh ingredients', 'apple'),
    ('Food - Meat & Seafood', 'Fresh and frozen meat, poultry, and seafood', 'beef'),
    ('Food - Dairy', 'Milk, cheese, butter, yogurt, and dairy products', 'milk'),
    ('Cleaning Supplies', 'Detergents, disinfectants, and cleaning materials', 'spray-can'),
    ('Linens & Textiles', 'Bed sheets, towels, tablecloths', 'bed'),
    ('Toiletries', 'Guest amenities, soaps, shampoos', 'bath'),
    ('Kitchen Supplies', 'Cooking utensils, plates, cutlery', 'utensils'),
    ('Office Supplies', 'Paper, pens, and office materials', 'file-text')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_inventory_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_audit_items ENABLE ROW LEVEL SECURITY;

-- Service role full access (bypass RLS)
CREATE POLICY "Service role full access on inventory_categories"
    ON inventory_categories FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on inventory_items"
    ON inventory_items FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on inventory_transactions"
    ON inventory_transactions FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on menu_inventory_mapping"
    ON menu_inventory_mapping FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on inventory_alerts"
    ON inventory_alerts FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on stock_audits"
    ON stock_audits FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on stock_audit_items"
    ON stock_audit_items FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE inventory_categories IS 'Categories for organizing inventory items';
COMMENT ON TABLE inventory_items IS 'Main inventory tracking table with stock levels and reorder points';
COMMENT ON TABLE inventory_transactions IS 'Audit trail of all inventory movements';
COMMENT ON TABLE menu_inventory_mapping IS 'Links menu items to required inventory ingredients';
COMMENT ON TABLE inventory_alerts IS 'Automated alerts for low stock and expiring items';
COMMENT ON TABLE stock_audits IS 'Physical inventory count audits';
COMMENT ON TABLE stock_audit_items IS 'Individual item counts within an audit';
