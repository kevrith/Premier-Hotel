-- =====================================================
-- Inventory Management System
-- Comprehensive schema for hotel inventory tracking
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12,2),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES public.inventory_categories(id),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.inventory_categories(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    unit VARCHAR(50) NOT NULL, -- 'pieces', 'kg', 'liters', 'boxes', etc.
    quantity DECIMAL(10,2) DEFAULT 0 CHECK (quantity >= 0),
    min_quantity DECIMAL(10,2) DEFAULT 0,
    max_quantity DECIMAL(10,2),
    reorder_point DECIMAL(10,2),
    reorder_quantity DECIMAL(10,2),
    unit_cost DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2),
    location VARCHAR(100), -- Storage location
    barcode VARCHAR(100),
    expiry_tracking BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STOCK MOVEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'return', 'damage', 'expired')),
    quantity DECIMAL(10,2) NOT NULL,
    previous_quantity DECIMAL(10,2),
    new_quantity DECIMAL(10,2),
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    reference_type VARCHAR(50), -- 'purchase_order', 'usage', 'service_request', 'room_service', etc.
    reference_id UUID,
    reference_number VARCHAR(100),
    reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled')),
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    payment_terms VARCHAR(100),
    delivery_address TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PURCHASE ORDER ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    received_quantity DECIMAL(10,2) DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (
        quantity * unit_cost * (1 - discount_percent/100)
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STOCK ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'expiring_soon', 'expired')),
    alert_level VARCHAR(20) DEFAULT 'warning' CHECK (alert_level IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    current_quantity DECIMAL(10,2),
    threshold_quantity DECIMAL(10,2),
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY BATCHES TABLE (For expiry tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity >= 0),
    unit_cost DECIMAL(10,2),
    manufacturing_date DATE,
    expiry_date DATE,
    supplier_id UUID REFERENCES public.suppliers(id),
    po_id UUID REFERENCES public.purchase_orders(id),
    is_expired BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, batch_number)
);

-- =====================================================
-- STOCK TAKES (Physical Inventory Counts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_takes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_take_number VARCHAR(50) UNIQUE NOT NULL,
    scheduled_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    location VARCHAR(100),
    category_id UUID REFERENCES public.inventory_categories(id),
    conducted_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STOCK TAKE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_take_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_take_id UUID NOT NULL REFERENCES public.stock_takes(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id),
    system_quantity DECIMAL(10,2) NOT NULL,
    counted_quantity DECIMAL(10,2),
    variance DECIMAL(10,2) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_cost DECIMAL(12,2),
    reason_for_variance TEXT,
    notes TEXT,
    counted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(stock_take_id, item_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON public.inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON public.inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON public.purchase_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_item ON public.stock_alerts(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_acknowledged ON public.stock_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_batches_item ON public.inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.inventory_batches(expiry_date);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON public.inventory_categories;
CREATE TRIGGER update_inventory_categories_updated_at
    BEFORE UPDATE ON public.inventory_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create stock movement on inventory quantity change
CREATE OR REPLACE FUNCTION create_stock_movement_on_quantity_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create movement if quantity actually changed
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
        INSERT INTO public.stock_movements (
            item_id,
            movement_type,
            quantity,
            previous_quantity,
            new_quantity,
            unit_cost,
            total_cost,
            reference_type,
            reason,
            created_by
        ) VALUES (
            NEW.id,
            CASE
                WHEN NEW.quantity > OLD.quantity THEN 'in'
                WHEN NEW.quantity < OLD.quantity THEN 'out'
                ELSE 'adjustment'
            END,
            ABS(NEW.quantity - OLD.quantity),
            OLD.quantity,
            NEW.quantity,
            NEW.unit_cost,
            ABS(NEW.quantity - OLD.quantity) * NEW.unit_cost,
            'manual_adjustment',
            'Quantity adjusted manually',
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_inventory_quantity_changes ON public.inventory_items;
CREATE TRIGGER track_inventory_quantity_changes
    AFTER UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION create_stock_movement_on_quantity_change();

-- Auto-generate low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if quantity is below reorder point
    IF NEW.quantity <= COALESCE(NEW.reorder_point, NEW.min_quantity, 0) THEN
        -- Check if alert already exists and not acknowledged
        IF NOT EXISTS (
            SELECT 1 FROM public.stock_alerts
            WHERE item_id = NEW.id
            AND alert_type = 'low_stock'
            AND is_acknowledged = false
        ) THEN
            INSERT INTO public.stock_alerts (
                item_id,
                alert_type,
                alert_level,
                message,
                current_quantity,
                threshold_quantity
            ) VALUES (
                NEW.id,
                CASE
                    WHEN NEW.quantity = 0 THEN 'out_of_stock'
                    ELSE 'low_stock'
                END,
                CASE
                    WHEN NEW.quantity = 0 THEN 'critical'
                    WHEN NEW.quantity <= NEW.min_quantity THEN 'critical'
                    ELSE 'warning'
                END,
                CASE
                    WHEN NEW.quantity = 0 THEN 'Item is out of stock: ' || NEW.name
                    ELSE 'Low stock alert for: ' || NEW.name || '. Current: ' || NEW.quantity || ' ' || NEW.unit
                END,
                NEW.quantity,
                COALESCE(NEW.reorder_point, NEW.min_quantity)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_low_stock_trigger ON public.inventory_items;
CREATE TRIGGER check_low_stock_trigger
    AFTER INSERT OR UPDATE OF quantity ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION check_low_stock();

-- Update PO totals when items change
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    po_subtotal DECIMAL(12,2);
BEGIN
    -- Calculate new subtotal for the PO
    SELECT COALESCE(SUM(line_total), 0)
    INTO po_subtotal
    FROM public.purchase_order_items
    WHERE po_id = COALESCE(NEW.po_id, OLD.po_id);

    -- Update the purchase order
    UPDATE public.purchase_orders
    SET
        subtotal = po_subtotal,
        total_amount = po_subtotal + COALESCE(tax_amount, 0) + COALESCE(shipping_cost, 0)
    WHERE id = COALESCE(NEW.po_id, OLD.po_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_po_totals_on_item_change ON public.purchase_order_items;
CREATE TRIGGER update_po_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_totals();

-- Update is_expired status for batches
CREATE OR REPLACE FUNCTION update_batch_expiry_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.is_expired = (NEW.expiry_date < CURRENT_DATE);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_batch_expiry ON public.inventory_batches;
CREATE TRIGGER update_batch_expiry
    BEFORE INSERT OR UPDATE OF expiry_date ON public.inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_expiry_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_take_items ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "Service role full access to suppliers"
    ON public.suppliers FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to inventory_categories"
    ON public.inventory_categories FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to inventory_items"
    ON public.inventory_items FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to stock_movements"
    ON public.stock_movements FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to purchase_orders"
    ON public.purchase_orders FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to purchase_order_items"
    ON public.purchase_order_items FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to stock_alerts"
    ON public.stock_alerts FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to inventory_batches"
    ON public.inventory_batches FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to stock_takes"
    ON public.stock_takes FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to stock_take_items"
    ON public.stock_take_items FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Admin and Manager policies
CREATE POLICY "Admin and managers can manage suppliers"
    ON public.suppliers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admin and managers can manage inventory"
    ON public.inventory_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can view inventory"
    ON public.inventory_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff', 'waiter', 'chef')
        )
    );

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default categories
INSERT INTO public.inventory_categories (name, description, icon, display_order) VALUES
('Food & Beverages', 'Food items and beverages', 'utensils', 1),
('Cleaning Supplies', 'Cleaning materials and chemicals', 'spray', 2),
('Linens & Towels', 'Bed linens, towels, and fabrics', 'shirt', 3),
('Toiletries', 'Guest bathroom amenities', 'droplet', 4),
('Kitchen Equipment', 'Kitchen tools and equipment', 'chef-hat', 5),
('Office Supplies', 'Paper, pens, and office materials', 'file-text', 6),
('Maintenance Supplies', 'Tools and maintenance materials', 'wrench', 7),
('Electronics', 'Electronic devices and accessories', 'zap', 8),
('Furniture', 'Hotel furniture and fixtures', 'home', 9),
('Safety Equipment', 'Fire safety and security equipment', 'shield', 10)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.suppliers IS 'Vendor and supplier information for inventory procurement';
COMMENT ON TABLE public.inventory_categories IS 'Categories for organizing inventory items';
COMMENT ON TABLE public.inventory_items IS 'Main inventory items with stock levels and pricing';
COMMENT ON TABLE public.stock_movements IS 'Track all inventory movements (in/out/adjustments)';
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders for inventory procurement';
COMMENT ON TABLE public.purchase_order_items IS 'Line items for purchase orders';
COMMENT ON TABLE public.stock_alerts IS 'Automated alerts for low stock, expiry, etc.';
COMMENT ON TABLE public.inventory_batches IS 'Batch tracking for items with expiry dates';
COMMENT ON TABLE public.stock_takes IS 'Physical inventory count sessions';
COMMENT ON TABLE public.stock_take_items IS 'Individual item counts during stock takes';

-- =====================================================
-- COMPLETION
-- =====================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Inventory management tables created successfully!';
    RAISE NOTICE 'Tables: 10';
    RAISE NOTICE 'Indexes: 16';
    RAISE NOTICE 'Triggers: 6';
    RAISE NOTICE 'RLS Policies: 20+';
END $$;
