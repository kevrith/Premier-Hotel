#!/usr/bin/env python3
"""
Script to remove email verification requirement for hkmanager@premierhotel.com
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
    print("REMOVING EMAIL VERIFICATION FOR HKMANAGER")
    print("=" * 60)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Search for hkmanager user
    print("\n1. Searching for hkmanager@premierhotel.com...")
    
    try:
        # Check auth.users table (Supabase auth table)
        print("   Checking auth.users table...")
        auth_result = supabase.table("auth.users").select("*").eq("email", "hkmanager@premierhotel.com").execute()
        
        if auth_result.data:
            user = auth_result.data[0]
            print(f"   ✅ Found user in auth.users:")
            print(f"   - ID: {user.get('id')}")
            print(f"   - Email: {user.get('email')}")
            print(f"   - Email Confirmed: {user.get('email_confirmed_at')}")
            print(f"   - Created: {user.get('created_at')}")
            
            # Update email_confirmed_at to current time to verify email
            import datetime
            current_time = datetime.datetime.utcnow().isoformat() + '+00:00'
            
            update_result = supabase.table("auth.users").update({
                "email_confirmed_at": current_time
            }).eq("id", user.get('id')).execute()
            
            if update_result.data:
                print(f"   ✅ Email verification removed! User can now login.")
            else:
                print(f"   ❌ Failed to update email verification status")
                
        else:
            print("   ❌ User not found in auth.users table")
            
    except Exception as e:
        print(f"   ❌ Error querying auth.users: {e}")

    # Also check the users table
    print("\n2. Checking users table...")
    try:
        users_result = supabase.table("users").select("*").eq("email", "hkmanager@premierhotel.com").execute()
        
        if users_result.data:
            user = users_result.data[0]
            print(f"   ✅ Found user in users table:")
            print(f"   - ID: {user.get('id')}")
            print(f"   - Email: {user.get('email')}")
            print(f"   - Role: {user.get('role')}")
            print(f"   - Status: {user.get('status')}")
            
            # Update status to active if needed
            if user.get('status') != 'active':
                status_update = supabase.table("users").update({
                    "status": "active"
                }).eq("id", user.get('id')).execute()
                
                if status_update.data:
                    print(f"   ✅ User status updated to 'active'")
                else:
                    print(f"   ❌ Failed to update user status")
        else:
            print("   ℹ️  User not found in users table")
            
    except Exception as e:
        print(f"   ❌ Error querying users table: {e}")

    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("""
1. Try logging in with:
   Email: hkmanager@premierhotel.com
   Password: (use the password you set during registration)

2. If login still fails:
   - Check the frontend console for error messages
   - Verify the password is correct
   - Check if there are any frontend validation issues

3. If successful:
   - You should now have full manager access
   - Test the manager dashboard functionality
   - Verify you can access all manager features
    """)
    print("=" * 60)

if __name__ == "__main__":
    main()