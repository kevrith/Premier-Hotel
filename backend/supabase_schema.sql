-- ============================================
-- Premier Hotel Management System - Database Schema
-- Supabase PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Supabase automatically handles JWT secrets, no need to set manually

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'chef', 'waiter', 'cleaner', 'manager', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    type_sw TEXT, -- Swahili translation
    description TEXT,
    description_sw TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    max_occupancy INTEGER NOT NULL DEFAULT 2,
    floor INTEGER,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance')),
    amenities JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    rating DECIMAL(3, 2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked-in', 'checked-out', 'completed', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.0,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    payment_method TEXT,
    special_requests TEXT,
    cancellation_reason TEXT,
    guest_info JSONB, -- Store first_name, last_name, email, phone, id_number
    pricing JSONB, -- Store subtotal, tax, total breakdown
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_sw TEXT,
    description TEXT,
    description_sw TEXT,
    category TEXT NOT NULL CHECK (category IN ('appetizers', 'mains', 'desserts', 'drinks', 'breakfast')),
    base_price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    preparation_time INTEGER, -- in minutes
    dietary_info JSONB DEFAULT '[]'::jsonb, -- ['vegetarian', 'gluten-free', etc.]
    customizations JSONB DEFAULT '[]'::jsonb,
    rating DECIMAL(3, 2) DEFAULT 0.0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    location TEXT NOT NULL, -- Table number or Room number
    location_type TEXT NOT NULL CHECK (location_type IN ('table', 'room')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'ready', 'delivered', 'completed', 'cancelled')),
    items JSONB NOT NULL, -- Array of order items
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    assigned_waiter_id UUID REFERENCES public.profiles(id),
    assigned_chef_id UUID REFERENCES public.profiles(id),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    preparation_started_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- MAINTENANCE ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.maintenance_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES public.profiles(id),
    issue TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_room ON public.bookings(room_id);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_location ON public.orders(location);

CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_rooms_type ON public.rooms(type);

CREATE INDEX idx_menu_items_category ON public.menu_items(category);
CREATE INDEX idx_menu_items_available ON public.menu_items(is_available);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Rooms: Everyone can read, only admin/manager can modify
CREATE POLICY "Rooms are viewable by everyone"
    ON public.rooms FOR SELECT
    USING (true);

-- Bookings: Users can see their own bookings, staff can see all
CREATE POLICY "Users can view own bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = customer_id OR
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'cleaner')));

CREATE POLICY "Users can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Orders: Users can see their own orders, staff can see relevant orders
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = customer_id OR
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));

CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Menu Items: Everyone can read
CREATE POLICY "Menu items are viewable by everyone"
    ON public.menu_items FOR SELECT
    USING (true);

-- Reviews: Users can create and view reviews
CREATE POLICY "Reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can create reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample rooms
INSERT INTO public.rooms (room_number, type, type_sw, description, description_sw, base_price, max_occupancy, floor, amenities, images) VALUES
('101', 'Standard Room', 'Chumba cha Kawaida', 'Comfortable room with essential amenities and city view', 'Chumba cha raha na vifaa muhimu', 5000, 2, 1, '["wifi", "tv", "coffee", "ac"]', '["https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600"]'),
('201', 'Deluxe Suite', 'Suite Nzuri', 'Spacious suite with separate living area and premium amenities', 'Suite kubwa na vifaa vya hali ya juu', 12000, 4, 2, '["wifi", "tv", "coffee", "ac", "minibar", "balcony"]', '["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600"]'),
('301', 'Executive Suite', 'Suite ya Kiongozi', 'Luxury suite with panoramic views and premium services', 'Suite ya kifahari na vifaa vya hali ya juu', 18000, 4, 3, '["wifi", "tv", "coffee", "ac", "minibar", "balcony", "jacuzzi", "workspace"]', '["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600"]');

-- Insert sample menu items
INSERT INTO public.menu_items (name, name_sw, description, description_sw, category, base_price, image_url, dietary_info, preparation_time) VALUES
('Grilled Salmon', 'Samaki wa Kuchoma', 'Fresh Atlantic salmon with herbs and lemon butter', 'Samaki safi wa Atlantic na viungo', 'mains', 1200, 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=400', '["gluten-free"]', 25),
('Margherita Pizza', 'Pizza ya Margherita', 'Classic pizza with fresh mozzarella and basil', 'Pizza ya kawaida na jibini safi', 'mains', 950, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', '["vegetarian"]', 20),
('Caesar Salad', 'Saladi ya Caesar', 'Fresh romaine lettuce with classic Caesar dressing', 'Saladi ya kawaida', 'appetizers', 650, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', '["vegetarian"]', 10);

-- ============================================
-- FUNCTIONS AND PROCEDURES
-- ============================================

-- Function to check room availability
CREATE OR REPLACE FUNCTION check_room_availability(
    p_room_id UUID,
    p_check_in DATE,
    p_check_out DATE
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE room_id = p_room_id
          AND status NOT IN ('cancelled', 'completed')
          AND (
              (check_in_date, check_out_date) OVERLAPS (p_check_in, p_check_out)
          )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
BEGIN
    RETURN 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME SUBSCRIPTIONS (Enable in Supabase Dashboard)
-- ============================================
-- Enable realtime for orders table for kitchen/waiter updates
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

COMMIT;
