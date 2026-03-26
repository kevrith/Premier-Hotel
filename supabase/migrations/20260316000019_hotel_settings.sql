-- Hotel Settings table
-- Stores key-value configuration for the system (tax, payment, notifications, etc.)
-- The tax_config key was previously written by the settings endpoint without this table
-- existing as a formal migration, so we use CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS hotel_settings (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key  text NOT NULL UNIQUE,
    setting_value jsonb NOT NULL DEFAULT '{}',
    updated_by   uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by key
CREATE INDEX IF NOT EXISTS idx_hotel_settings_key ON hotel_settings(setting_key);

-- Only admins and managers can read or write settings
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage settings"
    ON hotel_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.role IN ('admin', 'manager')
        )
    );

-- Seed default settings (upsert so re-running is safe)
INSERT INTO hotel_settings (setting_key, setting_value) VALUES
    ('tax_config', '{"vat_enabled": true, "vat_rate": 0.16, "tourism_levy_enabled": false, "tourism_levy_rate": 0.02, "tax_inclusive": true}'),
    ('payment_config', '{"payment_gateway": "mpesa", "mpesa_shortcode": "", "mpesa_consumer_key": "", "mpesa_consumer_secret": "", "mpesa_passkey": "", "mpesa_callback_url": "", "mpesa_environment": "sandbox"}'),
    ('notification_config', '{"email_notifications": true, "sms_notifications": true, "order_alerts": true}'),
    ('system_config', '{"maintenance_mode": false, "offline_mode": true}'),
    ('localization_config', '{"default_language": "en", "currency": "KES"}')
ON CONFLICT (setting_key) DO NOTHING;
