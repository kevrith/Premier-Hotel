-- =====================================================
-- Advanced Notification System
-- Comprehensive schema for notifications, preferences, and delivery tracking
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- NOTIFICATION TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('email', 'sms', 'push', 'in_app')),
    event_type VARCHAR(100) NOT NULL, -- 'booking_confirmed', 'payment_received', etc.
    subject VARCHAR(500),
    body_template TEXT NOT NULL,
    variables JSONB, -- List of available variables
    is_active BOOLEAN DEFAULT true,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,

    -- Event-specific preferences
    booking_confirmations BOOLEAN DEFAULT true,
    booking_reminders BOOLEAN DEFAULT true,
    payment_receipts BOOLEAN DEFAULT true,
    promotional_offers BOOLEAN DEFAULT true,
    loyalty_updates BOOLEAN DEFAULT true,
    service_updates BOOLEAN DEFAULT true,

    -- Delivery preferences
    email_address VARCHAR(200),
    phone_number VARCHAR(20),
    preferred_language VARCHAR(10) DEFAULT 'en',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.notification_templates(id),
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'push', 'in_app')),
    event_type VARCHAR(100),

    -- Content
    title VARCHAR(500),
    message TEXT NOT NULL,
    data JSONB, -- Additional structured data

    -- Delivery
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,

    -- References
    reference_type VARCHAR(50), -- 'booking', 'order', 'payment', etc.
    reference_id UUID,

    -- Delivery details
    recipient_email VARCHAR(200),
    recipient_phone VARCHAR(20),
    device_token VARCHAR(500),

    -- Metadata
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATION DELIVERY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    delivery_attempt INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL,
    provider VARCHAR(50), -- 'sendgrid', 'twilio', 'firebase', etc.
    provider_response JSONB,
    error_message TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EMAIL QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    to_address VARCHAR(200) NOT NULL,
    from_address VARCHAR(200),
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    attachments JSONB,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SMS QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sms_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    to_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'delivered', 'failed')),
    provider VARCHAR(50),
    provider_message_id VARCHAR(200),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATION GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code VARCHAR(100) UNIQUE NOT NULL,
    group_name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON public.sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON public.notification_delivery_log(notification_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON public.notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON public.notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
        NEW.status = 'read';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mark_notification_read_trigger ON public.notifications;
CREATE TRIGGER mark_notification_read_trigger
    BEFORE UPDATE OF read_at ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION mark_notification_read();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_groups ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to notification_templates"
    ON public.notification_templates FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to notification_preferences"
    ON public.notification_preferences FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to notifications"
    ON public.notifications FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to notification_delivery_log"
    ON public.notification_delivery_log FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to email_queue"
    ON public.email_queue FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to sms_queue"
    ON public.sms_queue FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to notification_groups"
    ON public.notification_groups FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = (select auth.uid()));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = (select auth.uid()));

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences"
    ON public.notification_preferences FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

-- Admin can view all
CREATE POLICY "Admin can view all notifications"
    ON public.notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default notification groups
INSERT INTO public.notification_groups (group_code, group_name, description, icon, color) VALUES
('booking', 'Bookings', 'Booking-related notifications', 'calendar', '#3B82F6'),
('payment', 'Payments', 'Payment and billing notifications', 'credit-card', '#10B981'),
('loyalty', 'Loyalty', 'Loyalty program updates', 'award', '#8B5CF6'),
('service', 'Service', 'Service requests and updates', 'bell', '#F59E0B'),
('system', 'System', 'System alerts and updates', 'info', '#6B7280')
ON CONFLICT (group_code) DO NOTHING;

-- Insert default notification templates
INSERT INTO public.notification_templates (template_code, template_name, template_type, event_type, subject, body_template, variables) VALUES
('booking_confirmed', 'Booking Confirmation', 'email', 'booking_confirmed',
 'Booking Confirmed - {{booking_number}}',
 'Dear {{customer_name}},\n\nYour booking has been confirmed!\n\nBooking Number: {{booking_number}}\nRoom: {{room_name}}\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\n\nThank you for choosing us!',
 '{"customer_name": "string", "booking_number": "string", "room_name": "string", "check_in_date": "date", "check_out_date": "date"}'::jsonb
),
('payment_received', 'Payment Confirmation', 'email', 'payment_received',
 'Payment Received - {{payment_amount}}',
 'Dear {{customer_name}},\n\nWe have received your payment of {{payment_amount}}.\n\nPayment ID: {{payment_id}}\nDate: {{payment_date}}\n\nThank you!',
 '{"customer_name": "string", "payment_amount": "decimal", "payment_id": "string", "payment_date": "date"}'::jsonb
),
('loyalty_points_earned', 'Loyalty Points Earned', 'in_app', 'loyalty_points_earned',
 'You earned {{points}} points!',
 'Congratulations! You have earned {{points}} loyalty points. Your new balance is {{total_points}} points.',
 '{"points": "integer", "total_points": "integer"}'::jsonb
)
ON CONFLICT (template_code) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_notification_type VARCHAR(50),
    p_title VARCHAR(500),
    p_message TEXT,
    p_event_type VARCHAR(100) DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_notification_id UUID;
    v_preferences RECORD;
BEGIN
    -- Get user preferences
    SELECT * INTO v_preferences
    FROM public.notification_preferences
    WHERE user_id = p_user_id;

    -- If no preferences exist, create default
    IF NOT FOUND THEN
        INSERT INTO public.notification_preferences (user_id)
        VALUES (p_user_id);
    END IF;

    -- Create notification
    INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        event_type,
        reference_type,
        reference_id,
        data,
        status
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_title,
        p_message,
        p_event_type,
        p_reference_type,
        p_reference_id,
        p_data,
        'pending'
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.notification_templates IS 'Reusable notification message templates';
COMMENT ON TABLE public.notification_preferences IS 'User notification preferences and settings';
COMMENT ON TABLE public.notifications IS 'Main notifications table for all notification types';
COMMENT ON TABLE public.notification_delivery_log IS 'Delivery tracking and retry history';
COMMENT ON TABLE public.email_queue IS 'Queue for outgoing emails';
COMMENT ON TABLE public.sms_queue IS 'Queue for outgoing SMS messages';

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Notification system tables created successfully!';
    RAISE NOTICE 'Tables: 7';
    RAISE NOTICE 'Indexes: 9';
    RAISE NOTICE 'Triggers: 4';
    RAISE NOTICE 'RLS Policies: 14+';
    RAISE NOTICE 'Helper Functions: 1';
END $$;
