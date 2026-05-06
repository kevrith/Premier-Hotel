-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL BUSINESS TABLES
-- Run this ONCE in Supabase SQL Editor.
--
-- HOW THIS WORKS WITH YOUR ARCHITECTURE:
--   • Your FastAPI backend uses the service_role key → bypasses RLS entirely.
--     Nothing changes for the API.
--   • The anon / authenticated keys (not used in production frontend) are now
--     blocked from reading or writing any table directly.
--   • If anyone ever gets your Supabase URL + anon key, they still cannot
--     read or modify any data.
--
-- WHAT TO DO AFTER RUNNING:
--   1. Test the API — everything should work exactly as before.
--   2. Set BACKUP_EMAIL_RECIPIENT in your Render dashboard.
--   3. Deploy the updated render.yaml to activate the daily cron backup.
-- =============================================================================


-- ─── 1. ENABLE RLS ON ALL TABLES ─────────────────────────────────────────────

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'menu_items',
    'rooms',
    'bookings',
    'orders',
    'order_items',
    'bills',
    'bill_items',
    'payments',
    'users',
    'location_stock',
    'kitchen_stock',
    'ingredients_stock',
    'utensils_stock',
    'office_stock',
    'expenses',
    'expense_categories',
    'restaurant_tables',
    'hotel_settings',
    'discounts',
    'discount_items',
    'recipes',
    'recipe_ingredients',
    'housekeeping_tasks',
    'service_requests',
    'reviews',
    'notifications',
    'messages',
    'customers',
    'purchase_orders',
    'purchase_order_items',
    'loyalty_points',
    'loyalty_transactions',
    'maintenance_flags',
    'petty_cash_transactions',
    'data_snapshots',
    'email_queue'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      RAISE NOTICE 'RLS enabled: %', t;
    ELSE
      RAISE NOTICE 'Skipped (table not found): %', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── 2. DENY-ALL POLICY FOR ANON AND AUTHENTICATED ROLES ─────────────────────
-- By default, enabling RLS with no policies blocks everyone.
-- We add explicit DENY policies so the intent is clear and documented.
-- service_role bypasses RLS and is unaffected.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'menu_items', 'rooms', 'bookings', 'orders', 'order_items',
    'bills', 'bill_items', 'payments', 'users',
    'location_stock', 'kitchen_stock', 'ingredients_stock',
    'utensils_stock', 'office_stock',
    'expenses', 'expense_categories',
    'restaurant_tables', 'hotel_settings',
    'discounts', 'discount_items',
    'recipes', 'recipe_ingredients',
    'housekeeping_tasks', 'service_requests', 'reviews',
    'notifications', 'messages',
    'customers', 'purchase_orders', 'purchase_order_items',
    'loyalty_points', 'loyalty_transactions',
    'maintenance_flags', 'petty_cash_transactions',
    'data_snapshots', 'email_queue'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Drop old permissive policies if any exist (from Supabase defaults)
      EXECUTE format(
        'DROP POLICY IF EXISTS "Enable read access for all users" ON %I;
         DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON %I;
         DROP POLICY IF EXISTS "Enable update for users based on email" ON %I;',
        t, t, t
      );

      -- Explicit deny-all for anon and authenticated (belt + suspenders)
      EXECUTE format(
        'DROP POLICY IF EXISTS deny_anon ON %I;
         CREATE POLICY deny_anon ON %I
           AS RESTRICTIVE
           FOR ALL
           TO anon, authenticated
           USING (false)
           WITH CHECK (false);',
        t, t
      );
      RAISE NOTICE 'Deny-all policy set: %', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── 3. VERIFY ────────────────────────────────────────────────────────────────
-- Run this SELECT after the block above to confirm RLS is on everywhere.

SELECT
  t.table_name,
  c.relrowsecurity   AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COUNT(p.policyname) AS policy_count
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.schemaname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, c.relrowsecurity, c.relforcerowsecurity
ORDER BY t.table_name;
