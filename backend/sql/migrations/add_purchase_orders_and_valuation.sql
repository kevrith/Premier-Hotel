-- =====================================================
-- Enhanced Inventory System - Purchase Orders & Valuation
-- =====================================================
-- Adds purchase order management and inventory valuation tracking
-- =====================================================

-- =====================================================
-- 1. SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),

    -- Contact Details
    phone VARCHAR(50),
    email VARCHAR(200),
    address TEXT,

    -- Business Info
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100), -- Net 30, Net 60, COD, etc.
    credit_limit DECIMAL(12, 2),

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, blocked
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID
);

-- =====================================================
-- 2. PURCHASE ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Order Info
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, confirmed, received, cancelled

    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_cost DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Payment
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid
    payment_due_date DATE,
    amount_paid DECIMAL(12, 2) DEFAULT 0,

    -- Additional Info
    notes TEXT,
    terms TEXT,

    -- Tracking
    created_by_user_id UUID,
    approved_by_user_id UUID,
    received_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. PURCHASE ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

    -- Ordered
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,

    -- Received
    quantity_received DECIMAL(10, 2) DEFAULT 0,
    quantity_pending DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

    -- Amounts
    line_subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    line_total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost - discount_amount) STORED,

    -- Quality
    quality_status VARCHAR(50), -- good, damaged, rejected
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. GOODS RECEIVED NOTES (GRN) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by_user_id UUID,

    -- Quality Check
    inspection_status VARCHAR(50), -- passed, failed, partial
    quality_notes TEXT,

    -- Damages/Issues
    total_items_ordered INTEGER,
    total_items_received INTEGER,
    total_items_damaged INTEGER,
    total_items_rejected INTEGER,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. INVENTORY VALUATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Valuation Info
    valuation_date DATE NOT NULL,
    valuation_type VARCHAR(50) NOT NULL, -- monthly_closing, quarterly, annual, audit

    -- Summary
    total_items INTEGER NOT NULL DEFAULT 0,
    total_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,

    -- Period Calculations
    opening_stock_value DECIMAL(15, 2),
    purchases_value DECIMAL(15, 2),
    closing_stock_value DECIMAL(15, 2),
    cogs DECIMAL(15, 2), -- Cost of Goods Sold

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, finalized, approved
    notes TEXT,

    -- Tracking
    created_by_user_id UUID,
    approved_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_valuation_date UNIQUE(valuation_date, valuation_type)
);

-- =====================================================
-- 6. INVENTORY VALUATION ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_valuation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    valuation_id UUID NOT NULL REFERENCES inventory_valuations(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

    -- Quantity and Cost
    quantity DECIMAL(10, 2) NOT NULL,
    cost_per_unit DECIMAL(10, 2) NOT NULL,
    total_value DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,

    -- Category for grouping
    category_name VARCHAR(200),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. STOCK AUDIT RESULTS TABLE (Enhanced)
-- =====================================================
-- Already exists from previous migration, but add if missing
CREATE TABLE IF NOT EXISTS stock_audit_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES stock_audits(id) ON DELETE CASCADE,

    -- Summary
    total_value_before DECIMAL(15, 2),
    total_value_after DECIMAL(15, 2),
    total_discrepancy_value DECIMAL(15, 2),

    -- Action Taken
    adjustment_applied BOOLEAN DEFAULT false,
    adjustment_applied_at TIMESTAMP WITH TIME ZONE,
    adjustment_applied_by_user_id UUID,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);

-- Purchase Orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

-- Purchase Order Items
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_inventory ON purchase_order_items(inventory_item_id);

-- GRN
CREATE INDEX IF NOT EXISTS idx_grn_number ON goods_received_notes(grn_number);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_received_notes(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_date ON goods_received_notes(receipt_date);

-- Valuations
CREATE INDEX IF NOT EXISTS idx_valuations_date ON inventory_valuations(valuation_date);
CREATE INDEX IF NOT EXISTS idx_valuations_type ON inventory_valuations(valuation_type);
CREATE INDEX IF NOT EXISTS idx_valuations_status ON inventory_valuations(status);

-- Valuation Items
CREATE INDEX IF NOT EXISTS idx_valuation_items_valuation ON inventory_valuation_items(valuation_id);
CREATE INDEX IF NOT EXISTS idx_valuation_items_inventory ON inventory_valuation_items(inventory_item_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update PO total when items change
CREATE OR REPLACE FUNCTION update_po_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    ),
    total = (
        SELECT COALESCE(SUM(line_total), 0) + COALESCE(tax_amount, 0) + COALESCE(shipping_cost, 0) - COALESCE(discount_amount, 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE id = NEW.po_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_total
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_total();

-- Update supplier table timestamp
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- Update PO timestamp
CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_orders_updated_at();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate PO Number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    po_num VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    po_num := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
    RETURN po_num;
END;
$$ LANGUAGE plpgsql;

-- Generate GRN Number
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    grn_num VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(grn_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_num
    FROM goods_received_notes
    WHERE grn_number LIKE 'GRN-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    grn_num := 'GRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
    RETURN grn_num;
END;
$$ LANGUAGE plpgsql;

-- Calculate Inventory Valuation
CREATE OR REPLACE FUNCTION calculate_inventory_valuation(valuation_date_param DATE)
RETURNS TABLE(
    item_id UUID,
    item_name VARCHAR,
    category_name VARCHAR,
    quantity DECIMAL,
    cost_per_unit DECIMAL,
    total_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ii.id,
        ii.name,
        ic.name,
        ii.current_stock,
        ii.cost_per_unit,
        (ii.current_stock * ii.cost_per_unit)
    FROM inventory_items ii
    LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
    WHERE ii.status = 'active'
    ORDER BY ic.name, ii.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_valuation_items ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on suppliers"
    ON suppliers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on purchase_orders"
    ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on purchase_order_items"
    ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on goods_received_notes"
    ON goods_received_notes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on inventory_valuations"
    ON inventory_valuations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on inventory_valuation_items"
    ON inventory_valuation_items FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Sample suppliers
INSERT INTO suppliers (code, name, contact_person, phone, email, status) VALUES
    ('SUP-001', 'Kenya Bottlers Ltd', 'John Mwangi', '+254712345678', 'sales@kenyabottlers.co.ke', 'active'),
    ('SUP-002', 'Nairobi Linen Supply', 'Mary Wanjiru', '+254723456789', 'orders@nairobilien.co.ke', 'active'),
    ('SUP-003', 'Fresh Foods Ltd', 'Peter Kamau', '+254734567890', 'info@freshfoods.co.ke', 'active'),
    ('SUP-004', 'Cleaning Supplies Co', 'Jane Akinyi', '+254745678901', 'sales@cleaningsupplies.co.ke', 'active'),
    ('SUP-005', 'East Africa Breweries', 'David Omondi', '+254756789012', 'orders@eabl.co.ke', 'active')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE suppliers IS 'Supplier/vendor information';
COMMENT ON TABLE purchase_orders IS 'Purchase orders to suppliers';
COMMENT ON TABLE purchase_order_items IS 'Line items in purchase orders';
COMMENT ON TABLE goods_received_notes IS 'Receipt confirmation when goods delivered';
COMMENT ON TABLE inventory_valuations IS 'Periodic inventory valuation snapshots';
COMMENT ON TABLE inventory_valuation_items IS 'Item-level details for valuations';
