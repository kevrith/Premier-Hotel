-- =============================================================================
-- EXPAND SNAPSHOT TRIGGERS TO ALL CRITICAL TABLES
-- Run this ONCE in Supabase SQL Editor AFTER production_safety_guards.sql.
--
-- The first safety guards only added snapshot-on-delete to:
--   menu_items, rooms, location_stock
--
-- This migration adds snapshot triggers to every other table whose loss would
-- cripple the business, and also adds TRUNCATE protection to tables that were
-- missed in the first guard.
-- =============================================================================


-- ─── 1. ENSURE snapshot_row_before_delete FUNCTION EXISTS ────────────────────
-- (already created by production_safety_guards.sql, but safe to re-create)

CREATE OR REPLACE FUNCTION snapshot_row_before_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO data_snapshots (table_name, operation, row_data)
  VALUES (TG_TABLE_NAME, 'DELETE', to_jsonb(OLD));
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_truncate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'TRUNCATE on "%" is disabled for safety. '
    'Use DELETE with an explicit WHERE clause.',
    TG_TABLE_NAME;
  RETURN NULL;
END;
$$;


-- ─── 2. ADD TRUNCATE PROTECTION TO ADDITIONAL TABLES ─────────────────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bookings', 'bills', 'bill_items', 'payments',
    'expenses', 'purchase_orders', 'purchase_order_items',
    'restaurant_tables', 'hotel_settings',
    'discounts', 'discount_items', 'recipes', 'recipe_ingredients',
    'housekeeping_tasks', 'service_requests', 'reviews',
    'notifications', 'messages', 'customers',
    'loyalty_points', 'loyalty_transactions',
    'petty_cash_transactions', 'order_items', 'orders'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS no_truncate ON %I;
         CREATE TRIGGER no_truncate
           BEFORE TRUNCATE ON %I
           FOR EACH STATEMENT EXECUTE FUNCTION prevent_truncate();',
        t, t
      );
      RAISE NOTICE 'TRUNCATE protection added: %', t;
    ELSE
      RAISE NOTICE 'Skipped (not found): %', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── 3. ADD SNAPSHOT-ON-DELETE TRIGGERS TO ALL CRITICAL TABLES ───────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- Core business data
    'orders', 'order_items',
    'bookings',
    'bills', 'bill_items',
    'payments',
    'users',
    -- Stock
    'kitchen_stock', 'ingredients_stock', 'utensils_stock', 'office_stock',
    -- Finance
    'expenses', 'expense_categories',
    'purchase_orders', 'purchase_order_items',
    'petty_cash_transactions',
    -- Menu & config
    'menu_items', 'recipes', 'recipe_ingredients',
    'hotel_settings', 'discounts', 'discount_items',
    -- Rooms & guests
    'rooms', 'customers', 'bookings',
    'restaurant_tables',
    -- Other
    'reviews', 'loyalty_points', 'loyalty_transactions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS auto_snapshot_on_delete ON %I;
         CREATE TRIGGER auto_snapshot_on_delete
           BEFORE DELETE ON %I
           FOR EACH ROW EXECUTE FUNCTION snapshot_row_before_delete();',
        t, t
      );
      RAISE NOTICE 'Snapshot trigger added: %', t;
    ELSE
      RAISE NOTICE 'Skipped (not found): %', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── 4. VERIFY ────────────────────────────────────────────────────────────────
SELECT
  trigger_name,
  event_object_table  AS protected_table,
  event_manipulation  AS blocked_operation
FROM information_schema.triggers
WHERE trigger_name IN ('no_truncate', 'auto_snapshot_on_delete')
  AND trigger_schema = 'public'
ORDER BY event_object_table, blocked_operation;
