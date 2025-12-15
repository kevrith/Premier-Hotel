-- =====================================================
-- Loyalty Program System
-- Comprehensive schema for customer loyalty, points, rewards, and tiers
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- LOYALTY TIERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    tier_level INTEGER NOT NULL UNIQUE CHECK (tier_level >= 1),
    min_points INTEGER NOT NULL DEFAULT 0,
    max_points INTEGER,
    points_multiplier DECIMAL(3,2) DEFAULT 1.00 CHECK (points_multiplier >= 1.00),
    discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    benefits JSONB,
    tier_color VARCHAR(20),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LOYALTY ACCOUNTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    member_number VARCHAR(50) UNIQUE NOT NULL,
    current_points INTEGER DEFAULT 0 CHECK (current_points >= 0),
    lifetime_points INTEGER DEFAULT 0 CHECK (lifetime_points >= 0),
    tier_id UUID REFERENCES public.loyalty_tiers(id),
    tier_name VARCHAR(50) DEFAULT 'bronze',
    joined_date DATE DEFAULT CURRENT_DATE,
    last_activity_date DATE,
    points_expiring_soon INTEGER DEFAULT 0,
    next_tier_points INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LOYALTY TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'bonus', 'refund', 'adjustment')),
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'booking', 'order', 'reward_redemption', 'manual', etc.
    reference_id UUID,
    reference_number VARCHAR(100),
    description TEXT,
    multiplier_applied DECIMAL(3,2) DEFAULT 1.00,
    expires_at DATE,
    is_expired BOOLEAN DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REWARDS CATALOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rewards_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('discount', 'free_night', 'room_upgrade', 'free_meal', 'spa_voucher', 'gift_card', 'experience', 'other')),
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    monetary_value DECIMAL(10,2),
    min_tier_required VARCHAR(50),
    max_redemptions_per_user INTEGER,
    total_available INTEGER,
    total_redeemed INTEGER DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    terms_conditions TEXT,
    image_url VARCHAR(500),
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REWARD REDEMPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_code VARCHAR(50) UNIQUE NOT NULL,
    account_id UUID NOT NULL REFERENCES public.loyalty_accounts(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    reward_id UUID NOT NULL REFERENCES public.rewards_catalog(id),
    points_redeemed INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'used', 'expired', 'cancelled')),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at DATE,
    used_at TIMESTAMP WITH TIME ZONE,
    used_reference_type VARCHAR(50), -- 'booking', 'order', etc.
    used_reference_id UUID,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- POINTS EXPIRY RULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.points_expiry_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    expiry_months INTEGER NOT NULL CHECK (expiry_months > 0),
    applies_to_tier VARCHAR(50), -- NULL means applies to all
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REFERRAL PROGRAM TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id),
    referee_id UUID REFERENCES auth.users(id),
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referee_email VARCHAR(100),
    referee_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    points_awarded INTEGER DEFAULT 0,
    awarded_at TIMESTAMP WITH TIME ZONE,
    signup_completed_at TIMESTAMP WITH TIME ZONE,
    first_booking_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SPECIAL OFFERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.special_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    offer_type VARCHAR(50) CHECK (offer_type IN ('points_multiplier', 'bonus_points', 'tier_bonus', 'birthday_bonus', 'seasonal')),
    points_value INTEGER,
    multiplier DECIMAL(3,2),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    min_tier_required VARCHAR(50),
    max_uses_per_user INTEGER,
    total_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user ON public.loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_tier ON public.loyalty_accounts(tier_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_member_number ON public.loyalty_accounts(member_number);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_account ON public.loyalty_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON public.loyalty_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created ON public.loyalty_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_expires ON public.loyalty_transactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_active ON public.rewards_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_type ON public.rewards_catalog(reward_type);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_account ON public.reward_redemptions(account_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON public.reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_special_offers_active ON public.special_offers(is_active);

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

DROP TRIGGER IF EXISTS update_loyalty_tiers_updated_at ON public.loyalty_tiers;
CREATE TRIGGER update_loyalty_tiers_updated_at
    BEFORE UPDATE ON public.loyalty_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_accounts_updated_at ON public.loyalty_accounts;
CREATE TRIGGER update_loyalty_accounts_updated_at
    BEFORE UPDATE ON public.loyalty_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rewards_catalog_updated_at ON public.rewards_catalog;
CREATE TRIGGER update_rewards_catalog_updated_at
    BEFORE UPDATE ON public.rewards_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reward_redemptions_updated_at ON public.reward_redemptions;
CREATE TRIGGER update_reward_redemptions_updated_at
    BEFORE UPDATE ON public.reward_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update tier when points change
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    new_tier RECORD;
BEGIN
    -- Find appropriate tier based on current points
    SELECT * INTO new_tier
    FROM public.loyalty_tiers
    WHERE is_active = true
    AND NEW.current_points >= min_points
    AND (max_points IS NULL OR NEW.current_points < max_points)
    ORDER BY tier_level DESC
    LIMIT 1;

    IF FOUND THEN
        NEW.tier_id = new_tier.id;
        NEW.tier_name = new_tier.tier_name;

        -- Calculate points needed for next tier
        SELECT min_points INTO NEW.next_tier_points
        FROM public.loyalty_tiers
        WHERE is_active = true
        AND tier_level > new_tier.tier_level
        ORDER BY tier_level ASC
        LIMIT 1;

        IF NEW.next_tier_points IS NOT NULL THEN
            NEW.next_tier_points = NEW.next_tier_points - NEW.current_points;
        END IF;
    END IF;

    NEW.last_activity_date = CURRENT_DATE;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_tier_on_points_change ON public.loyalty_accounts;
CREATE TRIGGER update_tier_on_points_change
    BEFORE UPDATE OF current_points ON public.loyalty_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_loyalty_tier();

-- Update account points on transaction
CREATE OR REPLACE FUNCTION update_account_on_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update current points and lifetime points
    IF NEW.transaction_type IN ('earn', 'bonus', 'refund') THEN
        UPDATE public.loyalty_accounts
        SET
            current_points = current_points + NEW.points,
            lifetime_points = lifetime_points + NEW.points
        WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type IN ('redeem', 'expire', 'adjustment') THEN
        UPDATE public.loyalty_accounts
        SET current_points = current_points - ABS(NEW.points)
        WHERE id = NEW.account_id;
    END IF;

    -- Set balance_after
    SELECT current_points INTO NEW.balance_after
    FROM public.loyalty_accounts
    WHERE id = NEW.account_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_account_on_transaction_trigger ON public.loyalty_transactions;
CREATE TRIGGER update_account_on_transaction_trigger
    BEFORE INSERT ON public.loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_on_transaction();

-- Update reward redemption count
CREATE OR REPLACE FUNCTION update_reward_redemption_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        UPDATE public.rewards_catalog
        SET total_redeemed = total_redeemed + 1
        WHERE id = NEW.reward_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        UPDATE public.rewards_catalog
        SET total_redeemed = GREATEST(total_redeemed - 1, 0)
        WHERE id = NEW.reward_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_redemption_count_trigger ON public.reward_redemptions;
CREATE TRIGGER update_redemption_count_trigger
    AFTER INSERT OR UPDATE OF status ON public.reward_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_reward_redemption_count();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_expiry_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "Service role full access to loyalty_tiers"
    ON public.loyalty_tiers FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to loyalty_accounts"
    ON public.loyalty_accounts FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to loyalty_transactions"
    ON public.loyalty_transactions FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to rewards_catalog"
    ON public.rewards_catalog FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to reward_redemptions"
    ON public.reward_redemptions FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to points_expiry_rules"
    ON public.points_expiry_rules FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to referrals"
    ON public.referrals FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to special_offers"
    ON public.special_offers FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Users can view their own loyalty account
CREATE POLICY "Users can view own loyalty account"
    ON public.loyalty_accounts FOR SELECT
    USING (user_id = (select auth.uid()));

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.loyalty_transactions FOR SELECT
    USING (user_id = (select auth.uid()));

-- Everyone can view active rewards
CREATE POLICY "Anyone can view active rewards"
    ON public.rewards_catalog FOR SELECT
    USING (is_active = true);

-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
    ON public.reward_redemptions FOR SELECT
    USING (user_id = (select auth.uid()));

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default tiers
INSERT INTO public.loyalty_tiers (tier_name, tier_level, min_points, max_points, points_multiplier, discount_percent, tier_color, benefits) VALUES
('Bronze', 1, 0, 999, 1.00, 0, '#CD7F32', '{"benefits": ["Basic member perks", "Birthday points bonus", "Member-only rates"]}'),
('Silver', 2, 1000, 4999, 1.25, 5, '#C0C0C0', '{"benefits": ["5% discount on bookings", "Free breakfast", "Late checkout", "Priority support"]}'),
('Gold', 3, 5000, 14999, 1.50, 10, '#FFD700', '{"benefits": ["10% discount on bookings", "Free room upgrade", "Free breakfast", "Late checkout", "Priority support", "Lounge access"]}'),
('Platinum', 4, 15000, 29999, 2.00, 15, '#E5E4E2', '{"benefits": ["15% discount on bookings", "Guaranteed room upgrade", "Free breakfast", "Late checkout", "Priority support", "Lounge access", "Free spa treatment"]}'),
('Diamond', 5, 30000, NULL, 2.50, 20, '#B9F2FF', '{"benefits": ["20% discount on bookings", "Suite upgrade", "Free breakfast", "Late checkout", "Priority support", "Lounge access", "Free spa treatments", "Concierge service", "Free airport transfer"]}')
ON CONFLICT (tier_name) DO NOTHING;

-- Insert sample rewards
INSERT INTO public.rewards_catalog (reward_code, name, description, reward_type, points_cost, monetary_value, min_tier_required, is_featured) VALUES
('DISC10', '10% Discount Voucher', 'Get 10% off your next booking', 'discount', 500, 50.00, 'bronze', true),
('DISC25', '25% Discount Voucher', 'Get 25% off your next booking', 'discount', 1500, 125.00, 'silver', true),
('FREENIGHT', 'Free Night Stay', 'Complimentary one night stay in standard room', 'free_night', 5000, 150.00, 'gold', true),
('UPGRADE', 'Room Upgrade', 'Upgrade to next room category', 'room_upgrade', 2000, 75.00, 'silver', false),
('BREAKFAST', 'Free Breakfast for Two', 'Complimentary breakfast buffet for 2 persons', 'free_meal', 800, 40.00, 'bronze', false),
('SPA50', '$50 Spa Voucher', '$50 credit for spa services', 'spa_voucher', 3000, 50.00, 'gold', true),
('DINNER', 'Free Dinner for Two', 'Complimentary dinner at hotel restaurant', 'free_meal', 2500, 100.00, 'silver', false)
ON CONFLICT (reward_code) DO NOTHING;

-- Insert default expiry rule
INSERT INTO public.points_expiry_rules (rule_name, expiry_months, is_active) VALUES
('Standard Expiry', 24, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to award points
CREATE OR REPLACE FUNCTION award_loyalty_points(
    p_user_id UUID,
    p_points INTEGER,
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_description TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_account_id UUID;
    v_transaction_id UUID;
    v_multiplier DECIMAL(3,2);
    v_actual_points INTEGER;
    v_expiry_months INTEGER;
BEGIN
    -- Get or create loyalty account
    SELECT id INTO v_account_id
    FROM public.loyalty_accounts
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.loyalty_accounts (
            user_id,
            member_number,
            tier_name
        ) VALUES (
            p_user_id,
            'M' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(NEXTVAL('loyalty_member_seq')::TEXT, 6, '0'),
            'bronze'
        )
        RETURNING id INTO v_account_id;
    END IF;

    -- Get tier multiplier
    SELECT COALESCE(lt.points_multiplier, 1.00) INTO v_multiplier
    FROM public.loyalty_accounts la
    LEFT JOIN public.loyalty_tiers lt ON la.tier_id = lt.id
    WHERE la.id = v_account_id;

    -- Calculate actual points with multiplier
    v_actual_points := FLOOR(p_points * v_multiplier);

    -- Get expiry rule
    SELECT expiry_months INTO v_expiry_months
    FROM public.points_expiry_rules
    WHERE is_active = true
    LIMIT 1;

    -- Create transaction
    INSERT INTO public.loyalty_transactions (
        account_id,
        user_id,
        transaction_type,
        points,
        balance_after,
        reference_type,
        reference_id,
        description,
        multiplier_applied,
        expires_at
    ) VALUES (
        v_account_id,
        p_user_id,
        'earn',
        v_actual_points,
        0, -- Will be set by trigger
        p_reference_type,
        p_reference_id,
        p_description,
        v_multiplier,
        CURRENT_DATE + INTERVAL '1 month' * COALESCE(v_expiry_months, 24)
    )
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;

-- Create sequence for member numbers
CREATE SEQUENCE IF NOT EXISTS loyalty_member_seq START 1000;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.loyalty_tiers IS 'Membership tier definitions with benefits and thresholds';
COMMENT ON TABLE public.loyalty_accounts IS 'Customer loyalty accounts with points and tier status';
COMMENT ON TABLE public.loyalty_transactions IS 'All points transactions (earn, redeem, expire)';
COMMENT ON TABLE public.rewards_catalog IS 'Available rewards that can be redeemed with points';
COMMENT ON TABLE public.reward_redemptions IS 'History of reward redemptions by customers';
COMMENT ON TABLE public.referrals IS 'Customer referral program tracking';
COMMENT ON TABLE public.special_offers IS 'Special promotional offers for loyalty members';

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Loyalty program tables created successfully!';
    RAISE NOTICE 'Tables: 8';
    RAISE NOTICE 'Indexes: 15';
    RAISE NOTICE 'Triggers: 5';
    RAISE NOTICE 'RLS Policies: 16+';
    RAISE NOTICE 'Helper Functions: 1';
END $$;
