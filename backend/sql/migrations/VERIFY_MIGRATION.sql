-- Verification Script - Check if bills migration was successful
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- ============================================================================
-- CHECK 1: Verify Bills Tables Exist
-- ============================================================================
SELECT
    'TABLES' as check_type,
    table_name,
    'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('bills', 'bill_orders', 'payments')
ORDER BY table_name;

-- ============================================================================
-- CHECK 2: Verify Orders Table Columns
-- ============================================================================
SELECT
    'ORDERS COLUMNS' as check_type,
    column_name,
    data_type,
    'EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
AND column_name IN ('payment_status', 'bill_id', 'paid_at')
ORDER BY column_name;

-- ============================================================================
-- CHECK 3: Verify Functions Exist
-- ============================================================================
SELECT
    'FUNCTIONS' as check_type,
    routine_name,
    'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_bill_number', 'calculate_bill_totals')
ORDER BY routine_name;

-- ============================================================================
-- CHECK 4: Count Rows in New Tables (Should be 0 if just created)
-- ============================================================================
SELECT 'bills' as table_name, COUNT(*) as row_count FROM bills
UNION ALL
SELECT 'bill_orders', COUNT(*) FROM bill_orders
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('bills', 'bill_orders', 'payments')) = 3
        AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('payment_status', 'bill_id', 'paid_at')) = 3
        AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('generate_bill_number', 'calculate_bill_totals')) = 2
        THEN '✅ MIGRATION SUCCESSFUL - All tables, columns, and functions exist!'
        ELSE '❌ MIGRATION INCOMPLETE - Some components are missing'
    END as final_status;
