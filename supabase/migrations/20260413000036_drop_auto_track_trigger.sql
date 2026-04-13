-- Drop the trigger that was silently re-enabling track_inventory on items
-- the user had explicitly turned off.
-- The trigger fired whenever stock_quantity > 0 AND track_inventory = false,
-- which meant every daily stock take or stock receipt submission undid the
-- user's explicit choice to stop tracking an item.
-- The stock receipt endpoint (stock.py) already sets track_inventory=True
-- explicitly when new stock is received, so the trigger is not needed.

DROP TRIGGER IF EXISTS trg_auto_track_inventory ON menu_items;
DROP FUNCTION IF EXISTS auto_enable_inventory_tracking();
