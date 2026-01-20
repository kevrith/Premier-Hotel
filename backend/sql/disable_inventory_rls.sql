-- Temporarily disable RLS for inventory tables (for development/testing)
-- WARNING: This removes security restrictions on inventory data!
-- Only use in development environment!

-- Disable RLS on inventory tables
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_takes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_take_items DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'Row Level Security (RLS) has been DISABLED for inventory tables!';
    RAISE NOTICE '⚠️  SECURITY WARNING: Inventory data is now publicly accessible!';
    RAISE NOTICE 'Remember to re-enable RLS before deploying to production!';
END $$;
