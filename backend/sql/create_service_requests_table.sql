-- Service Requests Management Schema
-- This schema handles guest service requests (room service, maintenance, amenities, etc.)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Service Request Types Table
-- =====================================================
-- Defines categories of service requests available to guests
CREATE TABLE IF NOT EXISTS public.service_request_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('room_service', 'housekeeping', 'maintenance', 'concierge', 'amenities', 'other')),
    icon VARCHAR(50),
    estimated_time INTEGER, -- Estimated completion time in minutes
    requires_staff BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Service Requests Table
-- =====================================================
-- Main table for tracking all service requests from guests
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    request_type_id UUID REFERENCES public.service_request_types(id) ON DELETE SET NULL,

    -- Request Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('room_service', 'housekeeping', 'maintenance', 'concierge', 'amenities', 'other')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Status Workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'rejected')),

    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes

    -- Additional Information
    location VARCHAR(200), -- Specific location within room or hotel
    special_instructions TEXT,
    items_requested JSONB, -- For room service items, quantities, etc.

    -- Resolution
    resolution_notes TEXT,
    staff_notes TEXT,
    guest_feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),

    -- Metadata
    is_urgent BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- For recurring requests
    parent_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Service Request Status History
-- =====================================================
-- Tracks all status changes for audit trail
CREATE TABLE IF NOT EXISTS public.service_request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Service Request Attachments
-- =====================================================
-- For guests to attach photos/documents with their requests
CREATE TABLE IF NOT EXISTS public.service_request_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER, -- in bytes
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Service Request Comments
-- =====================================================
-- For communication between guests and staff
CREATE TABLE IF NOT EXISTS public.service_request_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal comments visible only to staff
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
-- Service Request Types
CREATE INDEX IF NOT EXISTS idx_service_request_types_category ON public.service_request_types(category);
CREATE INDEX IF NOT EXISTS idx_service_request_types_active ON public.service_request_types(is_active);

-- Service Requests
CREATE INDEX IF NOT EXISTS idx_service_requests_guest ON public.service_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_booking ON public.service_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_room ON public.service_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned ON public.service_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_category ON public.service_requests(category);
CREATE INDEX IF NOT EXISTS idx_service_requests_priority ON public.service_requests(priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_requested_at ON public.service_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_number ON public.service_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_service_requests_urgent ON public.service_requests(is_urgent) WHERE is_urgent = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_service_requests_status_priority ON public.service_requests(status, priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_status ON public.service_requests(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_guest_status ON public.service_requests(guest_id, status);

-- Status History
CREATE INDEX IF NOT EXISTS idx_service_request_status_history_request ON public.service_request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_service_request_status_history_changed_at ON public.service_request_status_history(changed_at DESC);

-- Attachments
CREATE INDEX IF NOT EXISTS idx_service_request_attachments_request ON public.service_request_attachments(request_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_service_request_comments_request ON public.service_request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_service_request_comments_user ON public.service_request_comments(user_id);

-- =====================================================
-- Triggers for Automatic Updates
-- =====================================================
-- Update updated_at timestamp on service_request_types
CREATE OR REPLACE FUNCTION update_service_request_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_request_types_updated_at
    BEFORE UPDATE ON public.service_request_types
    FOR EACH ROW
    EXECUTE FUNCTION update_service_request_types_updated_at();

-- Update updated_at timestamp on service_requests
CREATE OR REPLACE FUNCTION update_service_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_requests_updated_at
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_service_requests_updated_at();

-- Automatically log status changes
CREATE OR REPLACE FUNCTION log_service_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.service_request_status_history (
            request_id,
            old_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.assigned_by, -- This should ideally be the current user
            CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_service_request_status_change
    AFTER UPDATE ON public.service_requests
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_service_request_status_change();

-- Update updated_at timestamp on comments
CREATE OR REPLACE FUNCTION update_service_request_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_request_comments_updated_at
    BEFORE UPDATE ON public.service_request_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_service_request_comments_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE public.service_request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_comments ENABLE ROW LEVEL SECURITY;

-- Service Request Types Policies
-- Everyone can view active request types
CREATE POLICY "Anyone can view active request types"
    ON public.service_request_types FOR SELECT
    USING (is_active = true);

-- Admins can manage request types
CREATE POLICY "Admins can manage request types"
    ON public.service_request_types FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service Requests Policies
-- Guests can view their own requests
CREATE POLICY "Guests can view their own requests"
    ON public.service_requests FOR SELECT
    USING (guest_id = auth.uid());

-- Guests can create their own requests
CREATE POLICY "Guests can create their own requests"
    ON public.service_requests FOR INSERT
    WITH CHECK (guest_id = auth.uid());

-- Guests can update their own pending requests
CREATE POLICY "Guests can update their own pending requests"
    ON public.service_requests FOR UPDATE
    USING (guest_id = auth.uid() AND status = 'pending')
    WITH CHECK (guest_id = auth.uid());

-- Staff can view all requests
CREATE POLICY "Staff can view all requests"
    ON public.service_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Staff can update assigned requests
CREATE POLICY "Staff can update assigned requests"
    ON public.service_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests"
    ON public.service_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Status History Policies
-- Users can view status history for their requests
CREATE POLICY "Users can view status history for their requests"
    ON public.service_request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = service_request_status_history.request_id
            AND guest_id = auth.uid()
        )
    );

-- Staff can view all status history
CREATE POLICY "Staff can view all status history"
    ON public.service_request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Attachments Policies
-- Users can view attachments for their requests
CREATE POLICY "Users can view attachments for their requests"
    ON public.service_request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = service_request_attachments.request_id
            AND guest_id = auth.uid()
        )
    );

-- Users can upload attachments to their requests
CREATE POLICY "Users can upload attachments to their requests"
    ON public.service_request_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = request_id
            AND guest_id = auth.uid()
        )
    );

-- Staff can view all attachments
CREATE POLICY "Staff can view all attachments"
    ON public.service_request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Comments Policies
-- Users can view comments on their requests (excluding internal comments)
CREATE POLICY "Users can view comments on their requests"
    ON public.service_request_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = service_request_comments.request_id
            AND guest_id = auth.uid()
        )
        AND is_internal = false
    );

-- Users can add comments to their requests
CREATE POLICY "Users can add comments to their requests"
    ON public.service_request_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_requests
            WHERE id = request_id
            AND guest_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Staff can view all comments including internal
CREATE POLICY "Staff can view all comments"
    ON public.service_request_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Staff can add comments to any request
CREATE POLICY "Staff can add comments"
    ON public.service_request_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
        AND user_id = auth.uid()
    );

-- =====================================================
-- Insert Default Service Request Types
-- =====================================================
INSERT INTO public.service_request_types (name, description, category, icon, estimated_time, display_order) VALUES
    ('Extra Towels', 'Request additional towels for your room', 'housekeeping', 'Bath', 15, 1),
    ('Extra Pillows', 'Request additional pillows and bedding', 'housekeeping', 'Bed', 15, 2),
    ('Room Cleaning', 'Request immediate room cleaning service', 'housekeeping', 'Sparkles', 30, 3),
    ('Toiletries', 'Request additional toiletries and amenities', 'housekeeping', 'Droplet', 15, 4),

    ('Air Conditioning Issue', 'Report AC not working or temperature issues', 'maintenance', 'Wind', 60, 10),
    ('Plumbing Issue', 'Report water leaks, clogged drains, or toilet issues', 'maintenance', 'Wrench', 45, 11),
    ('TV/Electronics Issue', 'TV, phone, or electronic device not working', 'maintenance', 'Tv', 30, 12),
    ('Light Bulb Replacement', 'Request replacement of burnt out bulbs', 'maintenance', 'Lightbulb', 20, 13),
    ('Door Lock Issue', 'Issues with room door lock or key card', 'maintenance', 'Lock', 30, 14),

    ('Room Service', 'Order food and beverages to your room', 'room_service', 'UtensilsCrossed', 45, 20),
    ('Wake-up Call', 'Schedule a wake-up call', 'room_service', 'Clock', 5, 21),
    ('Newspaper Delivery', 'Request daily newspaper delivery', 'room_service', 'Newspaper', 10, 22),

    ('Taxi/Transportation', 'Book taxi or arrange transportation', 'concierge', 'Car', 15, 30),
    ('Restaurant Reservation', 'Make restaurant reservation', 'concierge', 'UtensilsCrossed', 10, 31),
    ('Tour Booking', 'Book tours and local attractions', 'concierge', 'MapPin', 20, 32),
    ('Luggage Assistance', 'Request help with luggage', 'concierge', 'Luggage', 10, 33),

    ('Pool Towels', 'Request pool towels', 'amenities', 'Waves', 10, 40),
    ('Gym Access', 'Request gym access or equipment', 'amenities', 'Dumbbell', 5, 41),
    ('Spa Booking', 'Book spa services', 'amenities', 'Sparkles', 15, 42),

    ('Other Request', 'Any other service request', 'other', 'HelpCircle', 30, 100)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.service_request_types IS 'Predefined types of service requests available to guests';
COMMENT ON TABLE public.service_requests IS 'Main table for tracking all guest service requests';
COMMENT ON TABLE public.service_request_status_history IS 'Audit trail of all status changes for service requests';
COMMENT ON TABLE public.service_request_attachments IS 'File attachments for service requests (photos, documents)';
COMMENT ON TABLE public.service_request_comments IS 'Communication thread between guests and staff for each request';
