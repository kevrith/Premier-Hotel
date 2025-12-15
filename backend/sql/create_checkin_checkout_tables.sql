-- =====================================================
-- Check-in/Check-out System Schema
-- Phase 3 - Feature 5
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Guest Registration Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guest_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Primary Guest Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),

    -- ID Verification
    id_type VARCHAR(50) CHECK (id_type IN ('passport', 'drivers_license', 'national_id', 'other')),
    id_number VARCHAR(100),
    id_expiry_date DATE,
    id_verified BOOLEAN DEFAULT false,
    id_document_url TEXT,

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),

    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),

    -- Additional Info
    purpose_of_visit VARCHAR(50) CHECK (purpose_of_visit IN ('business', 'leisure', 'event', 'other')),
    special_requests TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Check-in Records Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.guest_registrations(id) ON DELETE SET NULL,

    -- Check-in Details
    checkin_type VARCHAR(20) DEFAULT 'standard' CHECK (checkin_type IN ('standard', 'early', 'online', 'mobile', 'kiosk')),
    scheduled_checkin TIMESTAMP WITH TIME ZONE,
    actual_checkin TIMESTAMP WITH TIME ZONE,

    -- Room Assignment
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    room_assigned_at TIMESTAMP WITH TIME ZONE,
    room_ready BOOLEAN DEFAULT false,

    -- Staff Processing
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Key Card
    key_card_number VARCHAR(50),
    key_card_issued BOOLEAN DEFAULT false,
    key_card_issued_at TIMESTAMP WITH TIME ZONE,

    -- Payment & Deposit
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT false,
    deposit_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

    -- Notes
    staff_notes TEXT,
    guest_notes TEXT,

    -- Signatures (URLs to signed documents)
    guest_signature_url TEXT,
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Check-out Records Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES public.checkins(id) ON DELETE SET NULL,

    -- Check-out Details
    checkout_type VARCHAR(20) DEFAULT 'standard' CHECK (checkout_type IN ('standard', 'late', 'express', 'online', 'mobile')),
    scheduled_checkout TIMESTAMP WITH TIME ZONE,
    actual_checkout TIMESTAMP WITH TIME ZONE,

    -- Room Inspection
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    room_inspected BOOLEAN DEFAULT false,
    room_inspection_id UUID REFERENCES public.room_inspections(id) ON DELETE SET NULL,
    room_condition VARCHAR(20) CHECK (room_condition IN ('excellent', 'good', 'fair', 'damaged')),
    damages_found BOOLEAN DEFAULT false,
    damage_description TEXT,
    damage_charges DECIMAL(10,2) DEFAULT 0,

    -- Staff Processing
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Key Card Return
    key_card_returned BOOLEAN DEFAULT false,
    key_card_returned_at TIMESTAMP WITH TIME ZONE,

    -- Final Billing
    total_charges DECIMAL(10,2) DEFAULT 0,
    deposit_refund DECIMAL(10,2) DEFAULT 0,
    final_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    payment_settled BOOLEAN DEFAULT false,

    -- Minibar & Services
    minibar_charges DECIMAL(10,2) DEFAULT 0,
    service_charges DECIMAL(10,2) DEFAULT 0,
    other_charges DECIMAL(10,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

    -- Feedback
    checkout_rating INTEGER CHECK (checkout_rating >= 1 AND checkout_rating <= 5),
    checkout_feedback TEXT,

    -- Notes
    staff_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Early Check-in/Late Checkout Requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.checkin_checkout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('early_checkin', 'late_checkout')),

    -- Request Details
    requested_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,

    -- Pricing
    additional_charge DECIMAL(10,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

    -- Processing
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

-- Guest Registrations
CREATE INDEX IF NOT EXISTS idx_guest_registrations_booking ON public.guest_registrations(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_user ON public.guest_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_status ON public.guest_registrations(status);

-- Check-ins
CREATE INDEX IF NOT EXISTS idx_checkins_booking ON public.checkins(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkins_room ON public.checkins(room_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_actual ON public.checkins(actual_checkin DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_scheduled ON public.checkins(scheduled_checkin);

-- Check-outs
CREATE INDEX IF NOT EXISTS idx_checkouts_booking ON public.checkouts(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_room ON public.checkouts(room_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_status ON public.checkouts(status);
CREATE INDEX IF NOT EXISTS idx_checkouts_actual ON public.checkouts(actual_checkout DESC);
CREATE INDEX IF NOT EXISTS idx_checkouts_scheduled ON public.checkouts(scheduled_checkout);

-- Requests
CREATE INDEX IF NOT EXISTS idx_checkin_checkout_requests_booking ON public.checkin_checkout_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkin_checkout_requests_status ON public.checkin_checkout_requests(status);
CREATE INDEX IF NOT EXISTS idx_checkin_checkout_requests_type ON public.checkin_checkout_requests(request_type);

-- =====================================================
-- Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_guest_registrations_updated_at()
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

CREATE TRIGGER trigger_update_guest_registrations_updated_at
    BEFORE UPDATE ON public.guest_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_registrations_updated_at();

CREATE OR REPLACE FUNCTION update_checkins_updated_at()
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

CREATE TRIGGER trigger_update_checkins_updated_at
    BEFORE UPDATE ON public.checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_checkins_updated_at();

CREATE OR REPLACE FUNCTION update_checkouts_updated_at()
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

CREATE TRIGGER trigger_update_checkouts_updated_at
    BEFORE UPDATE ON public.checkouts
    FOR EACH ROW
    EXECUTE FUNCTION update_checkouts_updated_at();

CREATE OR REPLACE FUNCTION update_checkin_checkout_requests_updated_at()
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

CREATE TRIGGER trigger_update_checkin_checkout_requests_updated_at
    BEFORE UPDATE ON public.checkin_checkout_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_checkin_checkout_requests_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.guest_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_checkout_requests ENABLE ROW LEVEL SECURITY;

-- Guest Registrations Policies
CREATE POLICY "Users can view own registrations"
    ON public.guest_registrations FOR SELECT
    USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own registrations"
    ON public.guest_registrations FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own pending registrations"
    ON public.guest_registrations FOR UPDATE
    USING (user_id = (select auth.uid()) AND status = 'pending');

CREATE POLICY "Staff can view all registrations"
    ON public.guest_registrations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can manage registrations"
    ON public.guest_registrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Check-ins Policies
CREATE POLICY "Users can view own checkins"
    ON public.checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = checkins.booking_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Staff can manage checkins"
    ON public.checkins FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Check-outs Policies
CREATE POLICY "Users can view own checkouts"
    ON public.checkouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = checkouts.booking_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Staff can manage checkouts"
    ON public.checkouts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Requests Policies
CREATE POLICY "Users can manage own requests"
    ON public.checkin_checkout_requests FOR ALL
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Staff can view all requests"
    ON public.checkin_checkout_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Staff can process requests"
    ON public.checkin_checkout_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to guest_registrations"
    ON public.guest_registrations FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to checkins"
    ON public.checkins FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to checkouts"
    ON public.checkouts FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to requests"
    ON public.checkin_checkout_requests FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.guest_registrations IS 'Guest registration information for check-in';
COMMENT ON TABLE public.checkins IS 'Check-in records with room assignment and key card info';
COMMENT ON TABLE public.checkouts IS 'Check-out records with final billing and room inspection';
COMMENT ON TABLE public.checkin_checkout_requests IS 'Early check-in and late checkout requests';
