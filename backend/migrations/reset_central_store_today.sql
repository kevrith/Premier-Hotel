-- =============================================================================
-- Reset Central Store — run in Supabase SQL Editor
-- Effect:
--   1. Reverses every un-reversed stock transfer made TODAY from the central store
--      (stock goes back to central store, removed from destination bars/locations)
--   2. Deletes ALL remaining location_stock rows for the central store
--   3. Re-populates central store from today's purchase-order receipts
-- =============================================================================

-- ── Step 0: identify the central store ───────────────────────────────────────
-- If you have more than one store location, add AND name ILIKE '%central%' below.
DO $$
DECLARE
  v_store_id UUID;
  v_today    DATE := CURRENT_DATE;
BEGIN

  SELECT id INTO v_store_id
  FROM locations
  WHERE type = 'store' AND is_active = TRUE
  ORDER BY name
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No active store location found. Create one first.';
  END IF;

  RAISE NOTICE 'Central store id: %', v_store_id;

  -- ── Step 1: reverse today's outbound transfers ──────────────────────────────
  -- Add quantities back to central store
  UPDATE location_stock ls
  SET    quantity   = ls.quantity + st.quantity,
         updated_at = NOW()
  FROM   stock_transfers st
  WHERE  st.from_location_id = v_store_id
    AND  st.transfer_date    = v_today
    AND  (st.reversed IS NULL OR st.reversed = FALSE)
    AND  ls.location_id      = st.from_location_id
    AND  ls.menu_item_id     = st.menu_item_id;

  -- Remove quantities from destination locations
  UPDATE location_stock ls
  SET    quantity   = GREATEST(0, ls.quantity - st.quantity),
         updated_at = NOW()
  FROM   stock_transfers st
  WHERE  st.from_location_id = v_store_id
    AND  st.transfer_date    = v_today
    AND  (st.reversed IS NULL OR st.reversed = FALSE)
    AND  ls.location_id      = st.to_location_id
    AND  ls.menu_item_id     = st.menu_item_id;

  -- Mark transfers as reversed
  UPDATE stock_transfers
  SET    reversed    = TRUE,
         reversed_at = NOW(),
         notes       = COALESCE(notes, '') || ' [REVERSED — daily reset ' || v_today::TEXT || ']'
  WHERE  from_location_id = v_store_id
    AND  transfer_date    = v_today
    AND  (reversed IS NULL OR reversed = FALSE);

  RAISE NOTICE 'Step 1 done: today''s transfers reversed';

  -- ── Step 2: clear central store completely ───────────────────────────────────
  DELETE FROM location_stock
  WHERE  location_id = v_store_id;

  RAISE NOTICE 'Step 2 done: central store cleared';

  -- ── Step 3: re-populate from today's received purchase orders ───────────────
  -- Aggregates multiple receipts of the same item on the same day.
  INSERT INTO location_stock
    (location_id, menu_item_id, item_name, category, quantity, cost_price, updated_at)
  SELECT
    v_store_id                             AS location_id,
    poi.menu_item_id,
    mi.name                                AS item_name,
    COALESCE(mi.category, '')              AS category,
    SUM(poi.quantity)                      AS quantity,
    -- weighted-average cost price across today's receipts
    SUM(poi.quantity * poi.unit_cost)
      / NULLIF(SUM(poi.quantity), 0)       AS cost_price,
    NOW()                                  AS updated_at
  FROM   purchase_order_items poi
  JOIN   purchase_orders      po  ON po.id  = poi.purchase_order_id
  JOIN   menu_items           mi  ON mi.id  = poi.menu_item_id
  WHERE  DATE(po.created_at AT TIME ZONE 'Africa/Nairobi') = v_today
    AND  po.status IN ('received', 'completed', 'partial')
    AND  poi.menu_item_id IS NOT NULL
  GROUP  BY poi.menu_item_id, mi.name, mi.category;

  RAISE NOTICE 'Step 3 done: central store repopulated from today''s receipts';
  RAISE NOTICE 'Run: SELECT SUM(quantity * cost_price) FROM location_stock WHERE location_id = ''%'';', v_store_id;
END;
$$;
