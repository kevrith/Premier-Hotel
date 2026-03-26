-- Branch Isolation: add branch_id to rooms, orders, and bookings
-- This enables proper per-branch data scoping for managers and staff

-- ── 1. Add branch_id columns ─────────────────────────────────────────────────

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- ── 2. Seed existing data to the main branch ──────────────────────────────────

UPDATE rooms    SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE orders   SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE bookings SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;

-- ── 3. Trigger: auto-copy branch_id from room when a booking is created ───────
-- This means the Python code never needs to manually set it for new bookings.

CREATE OR REPLACE FUNCTION fn_booking_inherit_branch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.branch_id IS NULL AND NEW.room_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM rooms WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_inherit_branch ON bookings;
CREATE TRIGGER trg_booking_inherit_branch
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_booking_inherit_branch();

-- ── 4. Performance indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rooms_branch_id    ON rooms(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id   ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id ON bookings(branch_id);
