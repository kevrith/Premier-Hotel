-- Auto-enable inventory tracking for menu items that already have stock
-- Any item with stock_quantity > 0 should be tracked
UPDATE menu_items
SET track_inventory = true
WHERE stock_quantity > 0
  AND track_inventory = false;

-- Trigger: whenever stock_quantity is set > 0, auto-enable track_inventory
CREATE OR REPLACE FUNCTION auto_enable_inventory_tracking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity > 0 AND NEW.track_inventory = false THEN
    NEW.track_inventory := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_track_inventory ON menu_items;
CREATE TRIGGER trg_auto_track_inventory
  BEFORE INSERT OR UPDATE OF stock_quantity ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_enable_inventory_tracking();
