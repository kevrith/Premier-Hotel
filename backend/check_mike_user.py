#!/usr/bin/env python3
"""
Quick script to check if user Mike exists and why they might not be showing
"""
import os
import sys
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://iyqccquwfkglqzcyrqgn.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cWNjcXV3ZmtnbHF6Y3lycWduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU5NTkwNSwiZXhwIjoyMDUwMTcxOTA1fQ.s3M25YjLPvxL8nDQy2wWX-V5hv6Ml9cPa_5MKpZ4p3E")

def main():
    print("=" * 60)
    print("CHECKING FOR USER 'MIKE' IN DATABASE")
    print("=" * 60)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Search for Mike in users table
    print("\n1. Searching 'users' table...")
    try:
        result = supabase.table("users").select("*").or_("full_name.ilike.%mike%,email.ilike.%mike%").execute()

        if result.data:
            print(f"   ✅ Found {len(result.data)} user(s) with 'Mike' in users table:")
            for user in result.data:
                print(f"\n   User Details:")
                print(f"   - ID: {user.get('id')}")
                print(f"   - Email: {user.get('email')}")
                print(f"   - Full Name: {user.get('full_name')}")
                print(f"   - Phone: {user.get('phone') or user.get('phone_number', 'N/A')}")
                print(f"   - Role: {user.get('role')}")
                print(f"   - Status: {user.get('status')}")
                print(f"   - Created: {user.get('created_at')}")
                print(f"   - Last Login: {user.get('last_login_at', 'Never')}")

                # Check status
                status = user.get('status', 'unknown')
                if status != 'active':
                    print(f"\n   ⚠️  WARNING: User status is '{status}' (not 'active')")
                    print(f"       This user will NOT show in the dashboard if filtered by 'active'!")
        else:
            print("   ❌ No users found with 'Mike' in users table")
    except Exception as e:
        print(f"   ❌ Error querying users table: {e}")

    # Search for Mike in profiles table (fallback)
    print("\n2. Searching 'profiles' table...")
    try:
        result = supabase.table("profiles").select("*").or_("full_name.ilike.%mike%,email.ilike.%mike%").execute()

        if result.data:
            print(f"   ✅ Found {len(result.data)} user(s) with 'Mike' in profiles table:")
            for user in result.data:
                print(f"\n   Profile Details:")
                print(f"   - ID: {user.get('id')}")
                print(f"   - Email: {user.get('email')}")
                print(f"   - Full Name: {user.get('full_name')}")
                print(f"   - Role: {user.get('role')}")
        else:
            print("   ℹ️  No users found with 'Mike' in profiles table")
    except Exception as e:
        print(f"   ℹ️  Profiles table might not exist: {e}")

    # Get total count of users
    print("\n3. Getting total user count...")
    try:
        all_users = supabase.table("users").select("id, full_name, status").execute()
        print(f"   Total users in database: {len(all_users.data)}")

        # Count by status
        status_counts = {}
        for user in all_users.data:
            status = user.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1

        print("\n   Users by status:")
        for status, count in sorted(status_counts.items()):
            print(f"   - {status}: {count}")
    except Exception as e:
        print(f"   ❌ Error getting user count: {e}")

    print("\n" + "=" * 60)
    print("DIAGNOSIS")
    print("=" * 60)
    print("""
If Mike was found but status is NOT 'active':
  → The frontend might be filtering by status
  → Change the status filter to 'All Statuses' in the admin dashboard

If Mike was NOT found at all:
  → User might have been deleted permanently
  → User might be in a different table
  → Check spelling of the name

If Mike was found with status 'active':
  → Check frontend console for errors
  → Check Network tab to see API response
  → There might be a frontend filtering issue
    """)
    print("=" * 60)

if __name__ == "__main__":
    main()
