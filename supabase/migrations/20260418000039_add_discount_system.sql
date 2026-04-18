-- ============================================
-- Discount System Migration
-- ============================================

-- Preset discount configurations (admin-defined named discounts)
CREATE TABLE IF NOT EXISTS public.discount_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                          -- e.g. "Staff Meal", "Complimentary", "Happy Hour"
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,      -- % (0-100) or fixed KES amount
    requires_pin BOOLEAN NOT NULL DEFAULT FALSE, -- if true, manager PIN required even for staff
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Discount audit log (tracks every discount applied)
CREATE TABLE IF NOT EXISTS public.discount_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number TEXT,
    discount_config_id UUID REFERENCES public.discount_configs(id) ON DELETE SET NULL,
    discount_type TEXT NOT NULL,          -- 'percentage' | 'fixed' | 'item'
    discount_value DECIMAL(10, 2),        -- original config value
    discount_amount DECIMAL(10, 2),       -- actual KES amount discounted
    reason TEXT,
    scope TEXT NOT NULL DEFAULT 'order',  -- 'order' | 'item'
    item_name TEXT,                       -- populated for item-level discounts
    applied_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),   -- manager who approved (if PIN used)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add discount columns to orders table
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_reason TEXT,
    ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES users(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_configs_active ON public.discount_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_audit_order ON public.discount_audit(order_id);

-- RLS
ALTER TABLE public.discount_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_audit ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read discount configs
CREATE POLICY "Staff can read discount configs"
    ON public.discount_configs FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admin/manager can manage discount configs (enforced at API level)
CREATE POLICY "Anyone authenticated can insert discount configs"
    ON public.discount_configs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can update discount configs"
    ON public.discount_configs FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Audit log: staff can insert, all staff can read
CREATE POLICY "Staff can read discount audit"
    ON public.discount_audit FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert discount audit"
    ON public.discount_audit FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Seed with some common preset discounts
INSERT INTO public.discount_configs (name, discount_type, discount_value, requires_pin, is_active)
VALUES
    ('Complimentary', 'percentage', 100, FALSE, TRUE),
    ('Staff Meal (50%)', 'percentage', 50, FALSE, TRUE),
    ('Loyalty 10%', 'percentage', 10, FALSE, TRUE),
    ('Manager Special', 'percentage', 20, FALSE, TRUE),
    ('Damaged / Incorrect Item', 'percentage', 100, FALSE, TRUE)
ON CONFLICT DO NOTHING;
