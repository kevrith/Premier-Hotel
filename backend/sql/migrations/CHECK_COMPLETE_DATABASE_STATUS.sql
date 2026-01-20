-- Comprehensive Database Status Check
-- Run this in Supabase SQL Editor to see complete database state

-- 1. Check which tables exist
SELECT
    'TABLE EXISTS CHECK' as check_type,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'orders', 'bills', 'bill_orders', 'payments', 'menu_items', 'bookings', 'rooms')
ORDER BY table_name;

-- 2. Check bills table structure (if exists)
SELECT
    'BILLS TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bills'
ORDER BY ordinal_position;

-- 3. Check bill_orders table structure (if exists)
SELECT
    'BILL_ORDERS TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bill_orders'
ORDER BY ordinal_position;

-- 4. Check payments table structure (if exists)
SELECT
    'PAYMENTS TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'payments'
ORDER BY ordinal_position;

-- 5. Check orders table for bill-related columns (if exists)
SELECT
    'ORDERS TABLE BILL COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
AND column_name IN ('payment_status', 'bill_id', 'paid_at')
ORDER BY ordinal_position;

-- 6. Check indexes on bills-related tables
SELECT
    'INDEXES' as check_type,
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('bills', 'bill_orders', 'payments')
ORDER BY tablename, indexname;

-- 7. Check functions related to bills
SELECT
    'FUNCTIONS' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%bill%' OR routine_name LIKE '%payment%')
ORDER BY routine_name;

-- Summary message
SELECT '✅ Database status check complete! Review results above.' as summary;
