#!/usr/bin/env python3
"""
Script to check Supabase auth schema and update email verification
"""
import os
import sys
from supabase import create_client

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://njhjpxfozgpoiqwksple.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_KEY environment variable not set")
    sys.exit(1)

def main():
    print("=" * 60)
    print("CHECKING SUPABASE AUTH SCHEMA")
    print("=" * 60)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Check available schemas
    print("\n1. Checking available schemas...")
    try:
        schemas_result = supabase.rpc("get_schemas").execute()
        print(f"   Available schemas: {schemas_result.data}")
    except:
        print("   ℹ️  get_schemas RPC not available, checking manually...")

    # Check auth schema tables
    print("\n2. Checking auth schema tables...")
    try:
        # Try different auth table names
        auth_tables = ['auth.users', 'auth_identities', 'identities']
        
        for table_name in auth_tables:
            try:
                result = supabase.table(table_name).select("id, email, email_confirmed_at").limit(5).execute()
                if result.data:
                    print(f"   ✅ Found data in {table_name}:")
                    for user in result.data[:3]:
                        print(f"      - {user.get('email')} (confirmed: {user.get('email_confirmed_at')})")
                    break
            except Exception as e:
                print(f"   ❌ {table_name}: {str(e)[:100]}")
                
    except Exception as e:
        print(f"   ❌ Error checking auth tables: {e}")

    # Check for auth.users with schema prefix
    print("\n3. Checking auth.users with schema...")
    try:
        # Try different approaches to access auth.users
        queries = [
            "auth.users",
            "auth_identities", 
            "storage.objects",
            "public.users"
        ]
        
        for query in queries:
            try:
                result = supabase.table(query).select("*").eq("email", "hkmanager@premierhotel.com").execute()
                if result.data:
                    print(f"   ✅ Found hkmanager in {query}:")
                    user = result.data[0]
                    print(f"      - ID: {user.get('id')}")
                    print(f"      - Email: {user.get('email')}")
                    print(f"      - Confirmed: {user.get('email_confirmed_at')}")
                    break
            except Exception as e:
                print(f"   ❌ {query}: {str(e)[:100]}")
                
    except Exception as e:
        print(f"   ❌ Error checking auth schema: {e}")

    # Try direct SQL query
    print("\n4. Trying direct SQL query...")
    try:
        # Check if we can run raw SQL
        sql_query = """
        SELECT schema_name FROM information_schema.schemata 
        WHERE schema_name LIKE '%auth%' OR schema_name LIKE '%storage%'
        """
        
        # This might not work with supabase client, but let's try
        result = supabase.rpc("sql", {"query": sql_query}).execute()
        print(f"   SQL result: {result.data}")
        
    except Exception as e:
        print(f"   ❌ Direct SQL failed: {e}")

    print("\n" + "=" * 60)
    print("MANUAL SOLUTION")
    print("=" * 60)
    print("""
Since we can't directly access the auth.users table through the API:

1. Go to your Supabase Dashboard
2. Navigate to: Authentication → Users
3. Find the user: hkmanager@premierhotel.com
4. Click the three dots (...) next to the user
5. Select "Confirm email" or "Resend confirmation email"
6. Or manually set the email_confirmed_at field to current timestamp

Alternatively, you can:
- Use the Supabase SQL Editor to run:
  UPDATE auth.users SET email_confirmed_at = NOW() 
  WHERE email = 'hkmanager@premierhotel.com';

This will remove the email verification requirement.
    """)
    print("=" * 60)

if __name__ == "__main__":
    main()