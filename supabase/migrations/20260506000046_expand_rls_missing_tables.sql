-- =============================================================================
-- EXPAND RLS TO ALL REMAINING TABLES
-- Run this ONCE in Supabase SQL Editor AFTER enable_rls_all_tables.sql.
--
-- The first migration covered 35 core tables. This migration covers every other
-- table that exists (auth tables, loyalty, staff, inventory, stock, reviews,
-- messaging, housekeeping, service requests, quickbooks, etc.).
--
-- Same pattern: RLS enabled + deny-all for anon/authenticated.
-- service_role (used by the FastAPI backend) bypasses RLS entirely.
-- =============================================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    -- Auth & user management
    'email_verifications',
    'phone_verifications',
    'refresh_tokens',
    'password_resets',
    'social_auth_providers',
    'auth_audit_log',
    'auth_logs',
    'balance_sheet_adjustments',

    -- Check-in / check-out
    'guest_registrations',
    'checkins',
    'checkouts',
    'checkin_checkout_requests',

    -- Expense tracking
    'budgets',
    'budget_allocations',
    'expense_payments',
    'expense_approvals',

    -- Housekeeping
    'room_inspections',
    'housekeeping_supplies',
    'supply_usage',
    'housekeeping_schedules',

    -- Inventory & suppliers
    'suppliers',
    'inventory_categories',
    'inventory_items',
    'stock_movements',
    'stock_alerts',
    'stock_takes',
    'stock_take_items',
    'stock_receipts',
    'stock_receipt_items',
    'stock_adjustments',
    'stock_transfers',
    'inventory_batches',
    'goods_received_notes',

    -- Kitchen stock
    'kitchen_stock_items',
    'kitchen_stock_adjustments',
    'kitchen_daily_stock',
    'kitchen_ingredients',
    'kitchen_ingredient_stock_takes',
    'kitchen_ingredients_stock',
    'office_stock_items',
    'office_stock_takes',
    'utensil_items',
    'utensil_stock_takes',
    'daily_stock_sessions',
    'daily_stock_items',

    -- Loyalty & rewards
    'loyalty_tiers',
    'loyalty_accounts',
    'rewards_catalog',
    'reward_redemptions',
    'referrals',
    'points_expiry_rules',

    -- Messaging & notifications
    'conversations',
    'conversation_participants',
    'message_attachments',
    'notification_templates',
    'notification_preferences',
    'notification_delivery_log',
    'notification_groups',
    'sms_queue',

    -- Orders & billing
    'order_modifications',
    'order_reversals',
    'bill_orders',
    'void_log',

    -- Reviews
    'review_categories',
    'review_responses',
    'review_helpfulness',
    'review_images',
    'review_reports',

    -- Service requests
    'service_request_types',
    'service_request_status_history',
    'service_request_attachments',
    'service_request_comments',

    -- Staff
    'staff',
    'staff_shifts',
    'staff_attendance',
    'staff_performance',
    'staff_leaves',

    -- Locations
    'locations',
    'linen_movements',
    'room_linen_inventory',
    'lost_and_found',

    -- QuickBooks sync
    'quickbooks_config',
    'quickbooks_sync_log',
    'quickbooks_item_mapping',
    'quickbooks_customer_mapping',

    -- Other
    'special_offers',
    'user_audit_log',
    'audit_log',
    'password_reset_tokens',
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

      -- Drop any existing permissive default policies
      EXECUTE format(
        'DROP POLICY IF EXISTS "Enable read access for all users" ON %I;
         DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON %I;
         DROP POLICY IF EXISTS "Enable update for users based on email" ON %I;',
        t, t, t
      );

      -- Deny-all for anon + authenticated; service_role bypasses RLS
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
      RAISE NOTICE 'RLS + deny-all applied: %', t;
    ELSE
      RAISE NOTICE 'Skipped (not found): %', t;
    END IF;
  END LOOP;
END;
$$;


-- ─── VERIFY: all tables with RLS status ───────────────────────────────────────
SELECT
  t.table_name,
  c.relrowsecurity   AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.schemaname = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, c.relrowsecurity
ORDER BY rls_enabled, t.table_name;
