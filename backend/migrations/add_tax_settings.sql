-- Add tax and levy settings table
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tax settings
INSERT INTO public.hotel_settings (setting_key, setting_value) VALUES
('tax_config', '{
  "vat_enabled": true,
  "vat_rate": 0.16,
  "tourism_levy_enabled": true,
  "tourism_levy_rate": 0.02,In Kitchen
0
Being prepared
  "tax_inclusive": true
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Add tax breakdown columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tourism_levy_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) DEFAULT 0;

-- Update existing orders to have proper tax breakdown
UPDATE public.orders 
SET 
  tax_inclusive = true,
  base_amount = ROUND(total_amount / 1.16, 2),
  vat_amount = ROUND(total_amount - (total_amount / 1.16), 2),
  tourism_levy_amount = 0
WHERE tax_inclusive IS NULL;

COMMENT ON TABLE hotel_settings IS 'Hotel configuration settings including tax and levy rates';
COMMENT ON COLUMN orders.tax_inclusive IS 'Whether prices include tax (true) or tax is added on top (false)';
COMMENT ON COLUMN orders.vat_amount IS 'VAT amount charged on this order';
COMMENT ON COLUMN orders.tourism_levy_amount IS 'Tourism levy amount charged on this order';
COMMENT ON COLUMN orders.base_amount IS 'Base amount before taxes and levies';
Why metrics show 0:

Why metrics show 0:

