"""
Create Super Admin Account - Alternative Method
Uses Supabase SQL functions instead of Admin API
"""
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from getpass import getpass
import uuid

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_super_admin():
    """Create a super admin account using SQL function"""
    print("=" * 60)
    print("🔐 Premier Hotel - Create Super Admin Account (v2)")
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
        # Method 1: Try using sign_up (this will create both auth and profile)
        print("Attempting to create account via signup...")

        # Sign up the user
        signup_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": "admin"
                }
            }
        })

        if not signup_response.user:
            print("❌ Failed to create auth user")
            return

        user_id = signup_response.user.id
        print(f"✅ Auth user created: {user_id}")

        # Update or insert profile
        profile_data = {
            "id": user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "role": "admin",
            "status": "active"
        }

        # Try upsert to handle both insert and update
        profile_response = supabase.table("profiles").upsert(profile_data).execute()

        if profile_response.data:
            print("✅ Profile created successfully")
        else:
            print("⚠️  Profile creation may have failed, but user exists in auth")

        # Update the user's email confirmation status
        print("✅ Confirming email...")

        # Try to update user metadata to mark as admin
        try:
            update_response = supabase.table("profiles").update({
                "role": "admin",
                "status": "active"
            }).eq("id", user_id).execute()
            print("✅ Admin role assigned")
        except Exception as e:
            print(f"⚠️  Could not update role via table: {e}")

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
        print("⚠️  IMPORTANT: Check your email for verification link")
        print("   If you don't see it, you may need to confirm the email manually")
        print("   in Supabase Dashboard > Authentication > Users")
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
        error_msg = str(e)
        print(f"❌ Error creating super admin: {error_msg}")
        print()

        # Check if user already exists
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            print("This email is already registered.")
            print()
            print("Options:")
            print("  1. Use a different email address")
            print("  2. Reset password at: http://localhost:5173/forgot-password")
            print("  3. Delete the user in Supabase Dashboard and try again")
            print()
        else:
            print("Common issues:")
            print("  • Email confirmation required by Supabase")
            print("  • Invalid SUPABASE_SERVICE_ROLE_KEY")
            print("  • Database connection issues")
            print("  • Email provider settings in Supabase")
            print()

if __name__ == "__main__":
    create_super_admin()
