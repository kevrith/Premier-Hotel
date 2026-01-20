#!/usr/bin/env python3
"""
Create a test admin account for Premier Hotel
"""
import os
import sys
from supabase import create_client
from passlib.context import CryptContext

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://njhjpxfozgpoiqwksple.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable not set")
    sys.exit(1)

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_admin_account():
    """Create admin account in users table"""

    email = "admin@premierhotel.com"
    password = "Admin123!"

    print(f"\n{'='*60}")
    print("Creating Admin Account")
    print(f"{'='*60}\n")

    # Check if account already exists
    print(f"Checking if {email} already exists...")
    existing = supabase.table("users").select("*").eq("email", email).execute()

    if existing.data:
        print(f"✓ Account already exists with ID: {existing.data[0]['id']}")
        print(f"\nLogin credentials:")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        return

    # Hash password
    password_hash = pwd_context.hash(password)

    # Create user data
    user_data = {
        "email": email,
        "phone": "+254700000000",
        "full_name": "System Administrator",
        "password_hash": password_hash,
        "role": "admin",
        "status": "active",
        "email_verified": True,
        "phone_verified": True,
        "auth_providers": ["local"],
    }

    print(f"Creating new admin account...")
    try:
        result = supabase.table("users").insert(user_data).execute()

        if result.data:
            print(f"\n{'='*60}")
            print("✓ Admin Account Created Successfully!")
            print(f"{'='*60}\n")
            print("Login credentials:")
            print(f"  Email: {email}")
            print(f"  Password: {password}")
            print(f"  Role: admin")
            print(f"\nUser ID: {result.data[0]['id']}")
            print(f"\n{'='*60}\n")
        else:
            print("✗ Failed to create account")
            print(f"Response: {result}")
    except Exception as e:
        print(f"✗ Error creating account: {e}")
        print("\nTrying to check existing accounts...")

        # List all users
        all_users = supabase.table("users").select("email, role, status").execute()
        if all_users.data:
            print(f"\nExisting accounts ({len(all_users.data)}):")
            for user in all_users.data:
                print(f"  - {user.get('email')} ({user.get('role')}) - {user.get('status')}")
        else:
            print("No users found in the database")

def check_old_account():
    """Check if the old account exists"""
    print(f"\n{'='*60}")
    print("Checking Old Account (premierhotel2023@gmail.com)")
    print(f"{'='*60}\n")

    old_email = "premierhotel2023@gmail.com"

    # Check users table
    print(f"Checking 'users' table...")
    result = supabase.table("users").select("*").eq("email", old_email).execute()

    if result.data:
        user = result.data[0]
        print(f"✓ Found in 'users' table")
        print(f"  ID: {user.get('id')}")
        print(f"  Role: {user.get('role')}")
        print(f"  Status: {user.get('status')}")
        print(f"  Has password hash: {'Yes' if user.get('password_hash') else 'No'}")
        return True
    else:
        print(f"✗ Not found in 'users' table")

    # Check profiles table (Supabase Auth)
    print(f"\nChecking 'profiles' table...")
    try:
        result = supabase.table("profiles").select("*").eq("email", old_email).execute()
        if result.data:
            print(f"✓ Found in 'profiles' table (Supabase Auth)")
            print(f"  Note: This account uses Supabase Auth, not custom auth")
            return True
        else:
            print(f"✗ Not found in 'profiles' table")
    except Exception as e:
        print(f"✗ Profiles table might not exist: {e}")

    print(f"\n{'='*60}")
    print("Account not found in any table!")
    print(f"{'='*60}\n")
    return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Premier Hotel - Account Management")
    print("="*60)

    # Check old account
    old_exists = check_old_account()

    # Create new admin account
    create_admin_account()

    print("\nDone!")
    print("="*60 + "\n")
