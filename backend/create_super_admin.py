"""
Create Super Admin Account
Run this script to create the initial super admin account
"""
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from getpass import getpass

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_super_admin():
    """Create a super admin account"""
    print("=" * 60)
    print("🔐 Premier Hotel - Create Super Admin Account")
    print("=" * 60)
    print()

    # Get admin details
    print("Enter super admin details:")
    email = input("Email: ").strip()

    # Validate email
    if not email or "@" not in email:
        print("❌ Invalid email address")
        return

    password = getpass("Password (min 6 characters): ")
    password_confirm = getpass("Confirm password: ")

    if password != password_confirm:
        print("❌ Passwords don't match")
        return

    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        return

    first_name = input("First name: ").strip()
    last_name = input("Last name: ").strip()
    phone = input("Phone (optional): ").strip() or None

    print()
    print("Creating super admin account...")
    print()

    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "first_name": first_name,
                "last_name": last_name,
                "role": "admin"
            }
        })

        if not auth_response.user:
            print("❌ Failed to create auth user")
            return

        user_id = auth_response.user.id
        print(f"✅ Auth user created: {user_id}")

        # Create profile in profiles table
        profile_data = {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "role": "admin",
            "status": "active"
        }

        profile_response = supabase.table("profiles").insert(profile_data).execute()

        if profile_response.data:
            print("✅ Profile created successfully")
        else:
            print("⚠️  Profile creation may have failed")

        print()
        print("=" * 60)
        print("🎉 Super Admin Account Created Successfully!")
        print("=" * 60)
        print()
        print(f"📧 Email: {email}")
        print(f"👤 Name: {first_name} {last_name}")
        print(f"🔑 Role: Admin")
        print(f"🆔 User ID: {user_id}")
        print()
        print("You can now login at: http://localhost:5173/login")
        print()
        print("As admin, you can:")
        print("  • Create staff accounts (chefs, waiters, cleaners)")
        print("  • Manage menu items")
        print("  • View all orders and bookings")
        print("  • Access all dashboards")
        print()

    except Exception as e:
        print(f"❌ Error creating super admin: {str(e)}")
        print()
        print("Common issues:")
        print("  • Email already exists")
        print("  • Invalid SUPABASE_SERVICE_ROLE_KEY")
        print("  • Database connection issues")
        print()

if __name__ == "__main__":
    create_super_admin()
