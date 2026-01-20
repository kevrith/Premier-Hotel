#!/usr/bin/env python3
"""
Debug script to identify why inventory API returns 403 Forbidden
Tests all possible authentication and authorization issues
"""
import requests
import json
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

API_BASE_URL = "http://localhost:8000/api/v1"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def check_database_setup():
    """Check if inventory tables exist and RLS is disabled"""
    print("=" * 60)
    print("🔍 Checking Database Setup")
    print("=" * 60)

    try:
        # Check if tables exist
        tables_to_check = [
            'suppliers', 'inventory_categories', 'inventory_items',
            'stock_movements', 'purchase_orders', 'stock_alerts'
        ]

        for table in tables_to_check:
            try:
                result = supabase.table(table).select("*", count='exact').limit(1).execute()
                print(f"✅ Table '{table}' exists")
            except Exception as e:
                print(f"❌ Table '{table}' error: {e}")

        # Check RLS status
        print("\n🔒 Checking Row Level Security (RLS) Status:")
        for table in tables_to_check:
            try:
                # Query to check RLS status
                rls_query = f"""
                SELECT schemaname, tablename, rowsecurity
                FROM pg_tables
                WHERE schemaname = 'public' AND tablename = '{table}'
                """
                # This is a simplified check - RLS status
                print(f"   Checking {table} RLS status...")
                # Try to insert a test record (should work if RLS is disabled)
                test_data = {'name': 'TEST_RECORD_PLEASE_DELETE', 'is_active': True}
                if table == 'suppliers':
                    test_result = supabase.table(table).insert(test_data).execute()
                    if test_result.data:
                        print(f"   ✅ {table}: RLS likely disabled (test insert succeeded)")
                        # Clean up test record
                        supabase.table(table).delete().eq('name', 'TEST_RECORD_PLEASE_DELETE').execute()
                    else:
                        print(f"   ❌ {table}: RLS may be enabled (test insert failed)")
                elif table == 'inventory_categories':
                    test_result = supabase.table(table).insert({
                        'name': 'TEST_CATEGORY_PLEASE_DELETE',
                        'is_active': True
                    }).execute()
                    if test_result.data:
                        print(f"   ✅ {table}: RLS likely disabled (test insert succeeded)")
                        supabase.table(table).delete().eq('name', 'TEST_CATEGORY_PLEASE_DELETE').execute()
                    else:
                        print(f"   ❌ {table}: RLS may be enabled (test insert failed)")
                else:
                    print(f"   ⚠️  {table}: Cannot test RLS (complex table structure)")

            except Exception as e:
                print(f"   ❌ {table}: RLS check failed - {e}")

    except Exception as e:
        print(f"❌ Database setup check failed: {e}")

def check_user_authentication():
    """Check user authentication and roles"""
    print("\n" + "=" * 60)
    print("👤 Checking User Authentication")
    print("=" * 60)

    # Get all users
    try:
        profiles = supabase.table('profiles').select('*').execute()
        print(f"Found {len(profiles.data)} profiles:")

        for profile in profiles.data:
            print(f"\n  User: {profile.get('id')}")
            print(f"  Email: {profile.get('email', 'N/A')}")
            print(f"  Role: {profile.get('role', 'N/A')}")
            print(f"  Status: {profile.get('status', 'N/A')}")

            # Check if role is in allowed list
            allowed_roles = ['admin', 'manager', 'staff', 'chef', 'waiter']
            if profile.get('role') in allowed_roles:
                print(f"  ✅ Role '{profile.get('role')}' is allowed for inventory access")
            else:
                print(f"  ❌ Role '{profile.get('role')}' is NOT in allowed list: {allowed_roles}")

            # Check status
            if profile.get('status') == 'active':
                print("  ✅ Status is 'active'")
            else:
                print(f"  ❌ Status is '{profile.get('status')}' (should be 'active')")

    except Exception as e:
        print(f"❌ Failed to check profiles: {e}")

def test_api_endpoints():
    """Test API endpoints directly"""
    print("\n" + "=" * 60)
    print("🌐 Testing API Endpoints")
    print("=" * 60)

    # Get auth token (ask user to provide it)
    token = input("\nEnter your JWT token from browser (copy from localStorage.auth-storage.token): ").strip()

    if not token:
        print("❌ No token provided. Get it from browser dev tools:")
        print("   1. Open browser, login as admin")
        print("   2. Press F12 → Application → Local Storage")
        print("   3. Find 'auth-storage' → copy 'token' value")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    endpoints_to_test = [
        ('/inventory/items', 'GET'),
        ('/inventory/categories', 'GET'),
        ('/inventory/alerts', 'GET'),
        ('/inventory/statistics', 'GET')
    ]

    for endpoint, method in endpoints_to_test:
        try:
            print(f"\n🔍 Testing {method} {endpoint}")
            if method == 'GET':
                response = requests.get(f"{API_BASE_URL}{endpoint}", headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(f"{API_BASE_URL}{endpoint}", headers=headers, json={}, timeout=10)

            print(f"   Status Code: {response.status_code}")

            if response.status_code == 200:
                print("   ✅ SUCCESS - Endpoint is accessible")
                try:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"   📊 Returned {len(data)} items")
                    elif isinstance(data, dict):
                        print(f"   📊 Returned data object")
                except:
                    print("   📊 Returned non-JSON response")
            elif response.status_code == 403:
                print("   ❌ FORBIDDEN - Check user role and RLS policies")
            elif response.status_code == 401:
                print("   ❌ UNAUTHORIZED - Token invalid or expired")
            elif response.status_code == 422:
                error_data = response.json()
                print(f"   ❌ VALIDATION ERROR: {error_data}")
            else:
                print(f"   ❌ ERROR {response.status_code}: {response.text[:200]}")

        except requests.exceptions.RequestException as e:
            print(f"   ❌ CONNECTION ERROR: {e}")
        except Exception as e:
            print(f"   ❌ UNEXPECTED ERROR: {e}")

def provide_solutions():
    """Provide solutions based on findings"""
    print("\n" + "=" * 60)
    print("💡 TROUBLESHOOTING SOLUTIONS")
    print("=" * 60)

    print("\n🔧 If you get 403 Forbidden:")
    print("   1. Check user role in 'profiles' table (must be: admin, manager, staff, chef, waiter)")
    print("   2. Ensure user status is 'active'")
    print("   3. Disable RLS on inventory tables (see SQL above)")
    print("   4. Try the DebugUserRole component in Admin Dashboard")

    print("\n🔧 If you get 401 Unauthorized:")
    print("   1. Check if JWT token is valid (not expired)")
    print("   2. Try logging out and logging back in")
    print("   3. Verify token format in browser localStorage")

    print("\n🔧 Database Commands:")
    print("   -- Disable RLS on all inventory tables:")
    print("   ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.inventory_categories DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.stock_movements DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.purchase_order_items DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.stock_alerts DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.inventory_batches DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.stock_takes DISABLE ROW LEVEL SECURITY;")
    print("   ALTER TABLE public.stock_take_items DISABLE ROW LEVEL SECURITY;")

    print("\n🔧 Update user role:")
    print("   UPDATE profiles SET role = 'admin', status = 'active' WHERE id = 'your-user-id';")

if __name__ == "__main__":
    print("🔧 INVENTORY 403 DEBUG TOOL")
    print("This script will help identify why inventory API returns 403 Forbidden")

    check_database_setup()
    check_user_authentication()
    test_api_endpoints()
    provide_solutions()

    print("\n" + "=" * 60)
    print("🎯 NEXT STEPS:")
    print("   1. Run this script and check the results")
    print("   2. Apply the suggested fixes")
    print("   3. Test inventory access again")
    print("   4. Re-enable RLS before production deployment!")
    print("=" * 60)
