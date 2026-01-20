"""
Fix Admin Authentication
This script ensures the admin account exists in both Supabase Auth and profiles table
"""
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from getpass import getpass

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fix_admin_auth():
    """Fix admin authentication by ensuring user exists in both Auth and profiles"""
    print("=" * 60)
    print("🔧 Premier Hotel - Fix Admin Authentication")
    print("=" * 60)
    print()

    email = input("Admin email: ").strip()

    if not email or "@" not in email:
        print("❌ Invalid email address")
        return

    print()
    print("Checking current status...")
    print()

    # Check if profile exists
    profile_response = supabase.table("profiles").select("*").eq("email", email).execute()

    profile_exists = bool(profile_response.data)
    profile_id = profile_response.data[0].get("id") if profile_exists else None

    if profile_exists:
        print(f"✅ Profile exists (ID: {profile_id})")
        print(f"   Role: {profile_response.data[0].get('role')}")
    else:
        print("❌ Profile does NOT exist")

    # Check if auth user exists by trying to sign in with a dummy password
    print()
    print("Checking Supabase Auth status...")

    # We can't directly check if auth user exists, so we'll ask for password and try to create/update
    password = getpass("Set new password (min 6 characters): ")
    password_confirm = getpass("Confirm password: ")

    if password != password_confirm:
        print("❌ Passwords don't match")
        return

    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        return

    print()
    print("Creating/updating admin account...")
    print()

    try:
        # Method 1: Try to create user with admin API
        print("Attempting to create auth user with Admin API...")

        user_data = {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "role": "admin"
            }
        }

        if profile_id:
            # If profile exists, use its ID
            user_data["id"] = profile_id

        try:
            auth_response = supabase.auth.admin.create_user(user_data)

            if auth_response.user:
                user_id = auth_response.user.id
                print(f"✅ Auth user created/updated: {user_id}")
                auth_created = True
            else:
                print("⚠️  Could not create auth user with admin API")
                auth_created = False
        except Exception as e:
            error_msg = str(e)
            if "already registered" in error_msg.lower() or "user already exists" in error_msg.lower():
                print("⚠️  User already exists in Auth, updating password...")

                # User exists, let's update the password
                try:
                    # Update user password
                    update_response = supabase.auth.admin.update_user_by_id(
                        profile_id,
                        {"password": password}
                    )
                    print("✅ Password updated successfully")
                    user_id = profile_id
                    auth_created = True
                except Exception as update_error:
                    print(f"❌ Failed to update password: {update_error}")
                    auth_created = False
                    user_id = profile_id
            else:
                print(f"⚠️  Admin API failed: {error_msg}")
                auth_created = False
                user_id = profile_id if profile_id else None

        # If we have a user_id, ensure profile exists and is admin
        if user_id:
            # Get or create profile
            if not profile_exists:
                print("Creating admin profile...")

                # Get name
                first_name = input("First name: ").strip() or "Admin"
                last_name = input("Last name: ").strip() or "User"
                phone = input("Phone (optional): ").strip() or None

                profile_data = {
                    "id": user_id,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "role": "admin",
                    "status": "active"
                }

                profile_response = supabase.table("profiles").upsert(profile_data).execute()

                if profile_response.data:
                    print("✅ Profile created successfully")
                else:
                    print("⚠️  Profile creation may have failed")
            else:
                # Update existing profile to admin
                print("Updating profile to admin role...")
                update_response = supabase.table("profiles").update({
                    "role": "admin",
                    "status": "active"
                }).eq("id", user_id).execute()

                if update_response.data:
                    print("✅ Profile updated to admin")
                else:
                    print("⚠️  Profile update may have failed")

            # Test login
            print()
            print("Testing login...")
            try:
                test_auth = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })

                if test_auth.user:
                    print("✅ LOGIN TEST SUCCESSFUL!")
                    print()
                    print("=" * 60)
                    print("🎉 Admin Account Ready!")
                    print("=" * 60)
                    print()
                    print(f"📧 Email: {email}")
                    print(f"🔑 Password: [the password you just set]")
                    print(f"👤 Role: Admin")
                    print()
                    print("✅ You can now login at: http://localhost:5173/login")
                    print()
                else:
                    print("⚠️  Login test failed - user object is None")
            except Exception as test_error:
                print(f"❌ Login test failed: {test_error}")
                print()
                print("Even though the account was created, login is failing.")
                print("This might be due to email confirmation requirements.")
                print()
                print("To fix:")
                print("  1. Go to Supabase Dashboard → Authentication → Users")
                print("  2. Find user:", email)
                print("  3. Click '...' menu → Confirm email")
                print("  4. Then try logging in")
        else:
            print("❌ Could not create or find user ID")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print()
        print("Please try:")
        print("  1. Register at http://localhost:5173/register")
        print("  2. Then run: ./venv/bin/python3.12 create_admin_direct.py")

if __name__ == "__main__":
    fix_admin_auth()
