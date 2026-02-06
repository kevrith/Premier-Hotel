-- Create hotel_settings table
CREATE TABLE IF NOT EXISTS hotel_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tax configuration
INSERT INTO hotel_settings (setting_key, setting_value) VALUES (
  'tax_config',
  '{"vat_enabled": true, "vat_rate": 0.16, "tourism_levy_enabled": false, "tourism_levy_rate": 0.02, "tax_inclusive": true}'::jsonb
) ON CONFLICT (setting_key) DO NOTHING;

-- Add new columns to orders table for detailed tax tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tourism_levy_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hotel_settings_key ON hotel_settings(setting_key);

-- Enable RLS
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users to read settings"
  ON hotel_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin/manager to update settings"
  ON hotel_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Grant permissions
GRANT SELECT ON hotel_settings TO authenticated;
GRANT UPDATE ON hotel_settings TO authenticated;
