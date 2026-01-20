-- Check what columns actually exist in the bills tables

-- Check bill_orders table columns
SELECT 'bill_orders' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bill_orders'
ORDER BY ordinal_position;

-- Check payments table columns
SELECT 'payments' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'payments'
ORDER BY ordinal_position;

-- Check bills table columns
SELECT 'bills' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bills'
ORDER BY ordinal_position;
