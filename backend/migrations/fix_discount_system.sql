-- Fix discount system: correct FK references from profiles → users
-- Run this if discount_configs table doesn't exist or has wrong FK

-- Create discount_configs if it doesn't exist (with correct FK to users)
CREATE TABLE IF NOT EXISTS public.discount_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    requires_pin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create discount_audit if it doesn't exist (with correct FK to users)
CREATE TABLE IF NOT EXISTS public.discount_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number TEXT,
    discount_config_id UUID REFERENCES public.discount_configs(id) ON DELETE SET NULL,
    discount_type TEXT NOT NULL,
    discount_value DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    reason TEXT,
    scope TEXT NOT NULL DEFAULT 'order',
    item_name TEXT,
    applied_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add discount columns to orders if they don't exist
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_reason TEXT,
    ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_configs_active ON public.discount_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_audit_order ON public.discount_audit(order_id);

-- RLS
ALTER TABLE public.discount_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_audit ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies in case they exist from old migration
DROP POLICY IF EXISTS "Staff can read discount configs" ON public.discount_configs;
DROP POLICY IF EXISTS "Anyone authenticated can insert discount configs" ON public.discount_configs;
DROP POLICY IF EXISTS "Anyone authenticated can update discount configs" ON public.discount_configs;
DROP POLICY IF EXISTS "Staff can read discount audit" ON public.discount_audit;
DROP POLICY IF EXISTS "Staff can insert discount audit" ON public.discount_audit;

CREATE POLICY "Staff can read discount configs"
    ON public.discount_configs FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can insert discount configs"
    ON public.discount_configs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can update discount configs"
    ON public.discount_configs FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can read discount audit"
    ON public.discount_audit FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert discount audit"
    ON public.discount_audit FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Seed preset discounts (skip if already exist)
INSERT INTO public.discount_configs (name, discount_type, discount_value, requires_pin, is_active)
VALUES
    ('Complimentary', 'percentage', 100, FALSE, TRUE),
    ('Staff Meal (50%)', 'percentage', 50, FALSE, TRUE),
    ('Loyalty 10%', 'percentage', 10, FALSE, TRUE),
    ('Manager Special', 'percentage', 20, FALSE, TRUE),
    ('Damaged / Incorrect Item', 'percentage', 100, FALSE, TRUE)
ON CONFLICT DO NOTHING;
