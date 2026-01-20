"""
Create Super Admin Account - Direct Method
This script creates admin directly in database
Use this if other methods fail
"""
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from getpass import getpass
import hashlib

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_admin_direct():
    """Create admin account directly"""
    print("=" * 60)
    print("🔐 Premier Hotel - Create Admin (Direct Method)")
    print("=" * 60)
    print()
    print("⚠️  This method creates the admin account directly.")
    print("   You'll need to use the Register page first to create")
    print("   the account, then this script will upgrade it to admin.")
    print()

    # Get email
    email = input("Email (must already be registered): ").strip()

    # Validate email
    if not email or "@" not in email:
        print("❌ Invalid email address")
        return

    print()
    print("Checking if user exists...")
    print()

    try:
        # Check if user exists in profiles
        response = supabase.table("profiles").select("*").eq("email", email).execute()

        if not response.data:
            print(f"❌ User {email} not found in database")
            print()
            print("Please register this account first:")
            print("  1. Go to http://localhost:5173/register")
            print("  2. Register with this email")
            print("  3. Then run this script again")
            print()
            return

        user = response.data[0]
        user_id = user.get("id")
        current_role = user.get("role", "customer")

        print(f"✅ Found user: {user.get('first_name')} {user.get('last_name')}")
        print(f"   Current role: {current_role}")
        print()

        if current_role == "admin":
            print("✅ This user is already an admin!")
            print()
            print("You can login at: http://localhost:5173/login")
            return

        # Update to admin
        print("Upgrading to admin role...")
        update_response = supabase.table("profiles").update({
            "role": "admin",
            "status": "active"
        }).eq("id", user_id).execute()

        if update_response.data:
            print("✅ User upgraded to admin successfully!")
            print()
            print("=" * 60)
            print("🎉 Admin Account Ready!")
            print("=" * 60)
            print()
            print(f"📧 Email: {email}")
            print(f"👤 Name: {user.get('first_name')} {user.get('last_name')}")
            print(f"🔑 Role: Admin (upgraded from {current_role})")
            print()
            print("You can now login at: http://localhost:5173/login")
            print()
            print("As admin, you can:")
            print("  • Create staff accounts (chefs, waiters, cleaners)")
            print("  • Manage menu items")
            print("  • View all orders and bookings")
            print("  • Access all dashboards")
            print()
        else:
            print("❌ Failed to upgrade user to admin")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print()

if __name__ == "__main__":
    create_admin_direct()
