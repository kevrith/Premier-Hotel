-- Add check-in and check-out tracking columns to bookings table

-- Check-in columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_in_by UUID;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

-- Check-out columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS checked_out_by UUID;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_out_notes TEXT;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS damages TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bookings.checked_in_at IS 'Timestamp when guest checked in';
COMMENT ON COLUMN bookings.checked_in_by IS 'Staff member who performed check-in';
COMMENT ON COLUMN bookings.check_in_notes IS 'Notes recorded during check-in';
COMMENT ON COLUMN bookings.checked_out_at IS 'Timestamp when guest checked out';
COMMENT ON COLUMN bookings.checked_out_by IS 'Staff member who performed check-out';
COMMENT ON COLUMN bookings.check_out_notes IS 'Notes recorded during check-out';
COMMENT ON COLUMN bookings.damages IS 'Description of any room damages found during check-out';

SELECT 'Check-in/Check-out columns added successfully!' as status;
