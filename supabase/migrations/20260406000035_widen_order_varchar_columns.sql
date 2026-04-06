-- Widen VARCHAR(10) columns on orders that are too short for real location names
-- table_number / room_number were VARCHAR(10) — "Conference Hall" (15 chars) would fail

ALTER TABLE orders ALTER COLUMN table_number TYPE TEXT;
ALTER TABLE orders ALTER COLUMN room_number  TYPE TEXT;
ALTER TABLE orders ALTER COLUMN order_type   TYPE TEXT;
ALTER TABLE orders ALTER COLUMN payment_method TYPE TEXT;
