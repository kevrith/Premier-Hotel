-- =====================================================
-- Fix for Reviews Tables - Column Reference Error
-- =====================================================

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Verified guests can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Staff can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON public.reviews;
DROP POLICY IF EXISTS "Service role full access to reviews" ON public.reviews;

-- Drop and recreate the reviews table to ensure clean state
DROP TABLE IF EXISTS public.review_reports CASCADE;
DROP TABLE IF EXISTS public.review_images CASCADE;
DROP TABLE IF EXISTS public.review_helpfulness CASCADE;
DROP TABLE IF EXISTS public.review_responses CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.review_categories CASCADE;

-- =====================================================
-- Review Categories Table
-- =====================================================
CREATE TABLE public.review_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Reviews Table
-- =====================================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_number VARCHAR(50) UNIQUE NOT NULL,

    -- References
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,

    -- Review Type
    review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('room', 'service', 'food', 'overall', 'staff', 'amenities')),

    -- Overall Rating (required)
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),

    -- Category-specific Ratings (optional)
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    comfort_rating INTEGER CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
    location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
    facilities_rating INTEGER CHECK (facilities_rating >= 1 AND facilities_rating <= 5),
    staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

    -- Review Content
    title VARCHAR(200),
    comment TEXT NOT NULL,
    pros TEXT,
    cons TEXT,

    -- Guest Information
    guest_name VARCHAR(200),
    guest_type VARCHAR(50) CHECK (guest_type IN ('solo', 'couple', 'family', 'business', 'group')),

    -- Status and Moderation
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged', 'hidden')),
    moderation_notes TEXT,
    moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_stay BOOLEAN DEFAULT false,

    -- Interaction Metrics
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,

    -- Response from Hotel
    has_response BOOLEAN DEFAULT false,

    -- Metadata
    stay_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Review Responses Table
-- =====================================================
CREATE TABLE public.review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    responder_name VARCHAR(200),
    responder_position VARCHAR(100),
    response TEXT NOT NULL,
    is_official BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Review Helpfulness Table
-- =====================================================
CREATE TABLE public.review_helpfulness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- =====================================================
-- Review Images Table
-- =====================================================
CREATE TABLE public.review_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Review Reports Table
-- =====================================================
CREATE TABLE public.review_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL CHECK (reason IN ('spam', 'offensive', 'fake', 'inappropriate', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Review Categories
CREATE INDEX idx_review_categories_active ON public.review_categories(is_active);

-- Reviews
CREATE INDEX idx_reviews_user ON public.reviews(user_id);
CREATE INDEX idx_reviews_booking ON public.reviews(booking_id);
CREATE INDEX idx_reviews_room ON public.reviews(room_id);
CREATE INDEX idx_reviews_type ON public.reviews(review_type);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_rating ON public.reviews(overall_rating DESC);
CREATE INDEX idx_reviews_created ON public.reviews(created_at DESC);
CREATE INDEX idx_reviews_verified ON public.reviews(is_verified);
CREATE INDEX idx_reviews_number ON public.reviews(review_number);

-- Composite indexes
CREATE INDEX idx_reviews_status_rating ON public.reviews(status, overall_rating DESC);
CREATE INDEX idx_reviews_type_status ON public.reviews(review_type, status);
CREATE INDEX idx_reviews_room_approved ON public.reviews(room_id, status) WHERE status = 'approved';

-- Review Responses
CREATE INDEX idx_review_responses_review ON public.review_responses(review_id);
CREATE INDEX idx_review_responses_responder ON public.review_responses(responder_id);

-- Review Helpfulness
CREATE INDEX idx_review_helpfulness_review ON public.review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user ON public.review_helpfulness(user_id);

-- Review Images
CREATE INDEX idx_review_images_review ON public.review_images(review_id);

-- Review Reports
CREATE INDEX idx_review_reports_review ON public.review_reports(review_id);
CREATE INDEX idx_review_reports_status ON public.review_reports(status);
CREATE INDEX idx_review_reports_reporter ON public.review_reports(reported_by);

-- =====================================================
-- Triggers for Automatic Updates
-- =====================================================

-- Update updated_at on review_categories
CREATE OR REPLACE FUNCTION update_review_categories_updated_at()
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

CREATE TRIGGER trigger_update_review_categories_updated_at
    BEFORE UPDATE ON public.review_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_review_categories_updated_at();

-- Update updated_at on reviews
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
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

CREATE TRIGGER trigger_update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- Update updated_at on review_responses
CREATE OR REPLACE FUNCTION update_review_responses_updated_at()
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

CREATE TRIGGER trigger_update_review_responses_updated_at
    BEFORE UPDATE ON public.review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_review_responses_updated_at();

-- Update response count when response is added
CREATE OR REPLACE FUNCTION update_review_response_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reviews
        SET response_count = response_count + 1,
            has_response = true
        WHERE id = NEW.review_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reviews
        SET response_count = GREATEST(response_count - 1, 0),
            has_response = (SELECT COUNT(*) > 0 FROM public.review_responses WHERE review_id = OLD.review_id)
        WHERE id = OLD.review_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_review_response_count
    AFTER INSERT OR DELETE ON public.review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_review_response_count();

-- Update helpfulness counts
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
        ELSE
            UPDATE public.reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_helpful != NEW.is_helpful THEN
        IF NEW.is_helpful THEN
            UPDATE public.reviews
            SET helpful_count = helpful_count + 1,
                not_helpful_count = GREATEST(not_helpful_count - 1, 0)
            WHERE id = NEW.review_id;
        ELSE
            UPDATE public.reviews
            SET helpful_count = GREATEST(helpful_count - 1, 0),
                not_helpful_count = not_helpful_count + 1
            WHERE id = NEW.review_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE public.reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.review_id;
        ELSE
            UPDATE public.reviews SET not_helpful_count = GREATEST(not_helpful_count - 1, 0) WHERE id = OLD.review_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_review_helpfulness_count
    AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpfulness_count();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.review_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- Review Categories Policies
CREATE POLICY "Anyone can view active categories"
    ON public.review_categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage categories"
    ON public.review_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Reviews Policies
CREATE POLICY "Anyone can view approved reviews"
    ON public.reviews FOR SELECT
    USING (status = 'approved');

CREATE POLICY "Users can view own reviews"
    ON public.reviews FOR SELECT
    USING (reviews.user_id = (select auth.uid()));

CREATE POLICY "Verified guests can create reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (reviews.user_id = (select auth.uid()));

CREATE POLICY "Users can update own pending reviews"
    ON public.reviews FOR UPDATE
    USING (reviews.user_id = (select auth.uid()) AND reviews.status = 'pending')
    WITH CHECK (reviews.user_id = (select auth.uid()));

CREATE POLICY "Users can delete own pending reviews"
    ON public.reviews FOR DELETE
    USING (reviews.user_id = (select auth.uid()) AND reviews.status = 'pending');

CREATE POLICY "Staff can view all reviews"
    ON public.reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Admins can moderate reviews"
    ON public.reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Review Responses Policies
CREATE POLICY "Anyone can view review responses"
    ON public.review_responses FOR SELECT
    USING (true);

CREATE POLICY "Staff can create responses"
    ON public.review_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

-- Review Helpfulness Policies
CREATE POLICY "Users can mark reviews helpful"
    ON public.review_helpfulness FOR ALL
    USING (review_helpfulness.user_id = (select auth.uid()))
    WITH CHECK (review_helpfulness.user_id = (select auth.uid()));

-- Review Images Policies
CREATE POLICY "Anyone can view review images"
    ON public.review_images FOR SELECT
    USING (true);

CREATE POLICY "Users can add images to own reviews"
    ON public.review_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE id = review_images.review_id
            AND user_id = (select auth.uid())
        )
    );

-- Review Reports Policies
CREATE POLICY "Users can create reports"
    ON public.review_reports FOR INSERT
    WITH CHECK (review_reports.reported_by = (select auth.uid()));

CREATE POLICY "Admins can view reports"
    ON public.review_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can manage reports"
    ON public.review_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to reviews"
    ON public.reviews FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to review_categories"
    ON public.review_categories FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to review_responses"
    ON public.review_responses FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to review_helpfulness"
    ON public.review_helpfulness FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to review_images"
    ON public.review_images FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to review_reports"
    ON public.review_reports FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- Insert Default Review Categories
-- =====================================================
INSERT INTO public.review_categories (name, description, icon, display_order) VALUES
    ('Overall Experience', 'Overall stay experience', 'Star', 1),
    ('Room Quality', 'Room comfort and amenities', 'Bed', 2),
    ('Cleanliness', 'Cleanliness and housekeeping', 'Sparkles', 3),
    ('Staff Service', 'Staff friendliness and service', 'Users', 4),
    ('Food & Dining', 'Restaurant and room service', 'UtensilsCrossed', 5),
    ('Location', 'Hotel location and accessibility', 'MapPin', 6),
    ('Facilities', 'Hotel facilities and amenities', 'Building', 7),
    ('Value for Money', 'Price vs quality ratio', 'DollarSign', 8)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.review_categories IS 'Categories for organizing reviews';
COMMENT ON TABLE public.reviews IS 'Customer reviews and ratings for rooms, services, and overall experience';
COMMENT ON TABLE public.review_responses IS 'Hotel management responses to customer reviews';
COMMENT ON TABLE public.review_helpfulness IS 'Tracks which users found reviews helpful';
COMMENT ON TABLE public.review_images IS 'Guest photos uploaded with reviews';
COMMENT ON TABLE public.review_reports IS 'Reports for inappropriate or fake reviews';
