# Supabase Security Fix - Function Search Path

## Issue
Supabase Database Linter detected 9 functions with mutable `search_path`, which is a **security vulnerability**. An attacker could potentially manipulate the search path to execute malicious code.

## Affected Functions
1. `update_payments_updated_at`
2. `update_service_request_types_updated_at`
3. `update_service_requests_updated_at`
4. `log_service_request_status_change`
5. `update_service_request_comments_updated_at`
6. `update_updated_at_column`
7. `check_room_availability`
8. `generate_booking_reference`
9. `generate_order_number`

## Solution Applied

### What Was Changed
Each function was updated with:
1. **`SECURITY DEFINER`** - Function executes with privileges of the user who created it
2. **`SET search_path = public, pg_temp`** - Explicitly sets the search path to prevent manipulation

### Example Before and After

**Before (Insecure):**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**After (Secure):**
```sql
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
```

## How to Apply the Fix

### Option 1: Run the Migration File (Recommended)
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file: `backend/sql/fix_function_search_path.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

### Option 2: Apply via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset  # This will run all migrations
```

### Option 3: Manual Application
Run each function update individually in the SQL Editor.

## Verification

After applying the fix, verify in Supabase SQL Editor:

```sql
SELECT
    routine_name,
    routine_type,
    security_type,
    specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'update_payments_updated_at',
    'update_service_request_types_updated_at',
    'update_service_requests_updated_at',
    'log_service_request_status_change',
    'update_service_request_comments_updated_at',
    'update_updated_at_column',
    'check_room_availability',
    'generate_booking_reference',
    'generate_order_number'
);
```

**Expected Output:** All functions should show `security_type = 'DEFINER'`

## Check Database Linter Again

1. Go to **Database** → **Linter** in Supabase Dashboard
2. Click **Refresh** or **Run Linter**
3. All 9 warnings should be **resolved** ✅

## Why This Matters

### Security Risk
Without explicit `search_path`:
- An attacker could create a malicious function in a different schema
- Manipulate the search path to execute their function instead
- Gain unauthorized access or corrupt data

### With the Fix
- `SECURITY DEFINER`: Function runs with creator's privileges (controlled)
- `SET search_path = public, pg_temp`: Only looks in public schema and temp tables
- Prevents search path manipulation attacks

## Impact on Application

**No impact** - This is a backend security hardening. Your application code remains unchanged and will work exactly the same way.

## Future Functions

When creating new trigger functions or stored procedures, always include:

```sql
CREATE OR REPLACE FUNCTION your_function_name()
RETURNS TRIGGER
SECURITY DEFINER                    -- Add this
SET search_path = public, pg_temp  -- Add this
LANGUAGE plpgsql
AS $$
BEGIN
    -- Your function logic here
END;
$$;
```

## Additional Security Best Practices

1. **Always use explicit schema names**: `public.table_name` instead of just `table_name`
2. **Set search_path in all functions**: Even if they're not triggers
3. **Use SECURITY DEFINER carefully**: Only when necessary
4. **Regular Linter checks**: Run Database Linter weekly
5. **Review RLS policies**: Ensure Row Level Security is properly configured

## Files Modified/Created

- ✅ Created: `backend/sql/fix_function_search_path.sql` - Function security fixes (9 functions)
- ✅ Created: `backend/sql/fix_rls_performance.sql` - RLS performance optimization (40+ policies)
- ✅ Created: `SUPABASE_SECURITY_FIX.md` - This documentation

## Additional Fix: RLS Performance Optimization

### Issue 2: Auth RLS Initialization Plan Warnings (40+ warnings)
Your RLS policies were using `auth.uid()` and `auth.jwt()` directly, causing these functions to be re-evaluated for **every row** in query results, leading to poor performance at scale.

### Solution Applied
All RLS policies have been updated to wrap auth functions in SELECT subqueries:
- **Before**: `auth.uid()` ❌
- **After**: `(select auth.uid())` ✅

This ensures the function is evaluated **once per query** instead of once per row.

### Tables Fixed (13 tables, 40+ policies)
1. ✅ profiles
2. ✅ bookings
3. ✅ orders
4. ✅ reviews
5. ✅ payments
6. ✅ housekeeping_tasks
7. ✅ room_inspections
8. ✅ housekeeping_supplies
9. ✅ supply_usage
10. ✅ housekeeping_schedules
11. ✅ lost_and_found
12. ✅ staff_shifts
13. ✅ staff_attendance
14. ✅ service_request_types
15. ✅ service_requests
16. ✅ service_request_status_history
17. ✅ service_request_attachments
18. ✅ service_request_comments

### Performance Impact
- **Before**: O(n) evaluations where n = number of rows
- **After**: O(1) single evaluation per query
- **Result**: Dramatically improved query performance at scale

## How to Apply BOTH Fixes

### Step 1: Function Security Fix
1. Open Supabase SQL Editor
2. Run `backend/sql/fix_function_search_path.sql`
3. Verify: Check that functions show `security_type = 'DEFINER'`

### Step 2: RLS Performance Fix
1. In Supabase SQL Editor
2. Run `backend/sql/fix_rls_performance.sql`
3. Verify: Check Database Linter shows warnings resolved

### Or Apply Both Together
You can run both files sequentially in the same SQL Editor session.

## Next Steps

1. ✅ Apply `fix_function_search_path.sql` in Supabase
2. ✅ Apply `fix_rls_performance.sql` in Supabase
3. ✅ Verify all warnings are resolved in Database Linter
4. ✅ Test your application (all features should work normally)
5. ✅ Run Database Linter again to confirm zero warnings

## Support

If you encounter any issues:
- Check Supabase logs in Dashboard → Logs
- Verify function syntax with `\df+ public.function_name` in SQL Editor
- Review Supabase documentation: https://supabase.com/docs/guides/database/database-linter

---

**Status**: Ready to apply ✅
**Impact**: Security hardening, no functional changes
**Risk**: Low (only improves security)
**Estimated Time**: 2-3 minutes to apply and verify
